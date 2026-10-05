import { GoogleGenAI } from "@google/genai";
import { InvestigationResult, EvidenceItem, RiskAssessment } from "../types";

export interface MessageAnalysisInput {
  content: string;
  senderHeader?: string;
}

const SCAM_CATEGORIES = [
  {
    type: "UTILITY_DISCONNECTION_FRAUD",
    label: "Electricity / Utility Disconnection Threat",
    keywords: ["electricity", "power cut", "disconnected", "bill not updated", "electric officer", "bescom", "mahavitaran", "dhbvn"],
    severity: "CRITICAL",
    basePoints: 50,
  },
  {
    type: "BANKING_KYC_SUSPENSION",
    label: "Bank Account / KYC Suspension Scam",
    keywords: ["kyc", "account blocked", "account suspended", "pan card", "debit card blocked", "netbanking blocked", "yono", "sbi", "hdfc", "icici", "axis"],
    severity: "CRITICAL",
    basePoints: 50,
  },
  {
    type: "LOTTERY_PRIZE_FRAUD",
    label: "Lottery / Prize / KBC Fraud",
    keywords: ["lottery", "kbc", "won", "winner", "congratulations", "cash prize", "lucky draw", "25 lakh", "claim prize"],
    severity: "CRITICAL",
    basePoints: 50,
  },
  {
    type: "JOB_TASK_FRAUD",
    label: "Part-Time Task / Work-From-Home Scam",
    keywords: ["part time job", "earn daily", "like youtube", "telegram task", "daily income", "per day", "work from home job"],
    severity: "HIGH",
    basePoints: 45,
  },
  {
    type: "PACKAGE_DELIVERY_FRAUD",
    label: "Parcel / Delivery Redirection Scam",
    keywords: ["parcel", "package", "delivery failed", "incorrect address", "india post", "customs", "reschedule delivery"],
    severity: "HIGH",
    basePoints: 40,
  },
];

const GENUINE_TRANSACTIONAL_SIGNALS = [
  /\b(?:debited|credited)\s+(?:by|with|for)?\s*(?:rs\.?|inr)\b/i,
  /\bavl\s*bal(?:ance)?\b/i,
  /\botp\s+(?:for\s+transaction|is)\s+\d{4,8}\b/i,
  /\bref(?:erence)?\s*(?:no|num)?\.?\s*[:\s]\s*[a-z0-9]+\b/i,
];

/**
 * Analyzes an SMS or instant message for scam patterns using deterministic heuristics and low-token Gemini reasoning.
 */
export async function analyzeMessage(input: MessageAnalysisInput): Promise<InvestigationResult> {
  const text = input.content.trim();
  const lower = text.toLowerCase();

  // 1. Extract embedded entities
  const urlMatches = text.match(/(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi) || [];
  const phoneMatches = text.match(/(?:\+91|0)?[6-9]\d{9}/g) || [];
  const upiMatches = text.match(/\b[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,}\b/gi) || [];

  // 2. Deterministic Heuristics
  let detectedCategory = "UNKNOWN";
  let detectedCategoryLabel = "Uncategorized Message";
  let heuristicScore = 0;
  const flags: string[] = [];

  // Check scam category keywords
  for (const cat of SCAM_CATEGORIES) {
    const hits = cat.keywords.filter((kw) => lower.includes(kw));
    if (hits.length >= 2 || (hits.length === 1 && (urlMatches.length > 0 || phoneMatches.length > 0))) {
      detectedCategory = cat.type;
      detectedCategoryLabel = cat.label;
      heuristicScore += cat.basePoints;
      flags.push(`Matched pattern: ${cat.label} (keywords: ${hits.join(", ")})`);
      break;
    }
  }

  // Artificial Urgency detection
  const urgencyWords = ["immediately", "tonight", "at 9.30 pm", "at 9:30 pm", "within 24 hours", "urgent", "today only"];
  const urgencyHits = urgencyWords.filter((w) => lower.includes(w));
  if (urgencyHits.length > 0) {
    heuristicScore += 20;
    flags.push(`Coercive urgency language: "${urgencyHits.join('", "')}"`);
  }

  // Personal 10-digit mobile number contact in institutional message
  if (phoneMatches.length > 0 && (lower.includes("officer") || lower.includes("bank") || lower.includes("electricity") || lower.includes("kyc"))) {
    heuristicScore += 25;
    flags.push(`Direct personal mobile number (${phoneMatches[0]}) provided for institutional banking/utility verification`);
  }

  // Check if it looks like a genuine transactional SMS
  const genuineHits = GENUINE_TRANSACTIONAL_SIGNALS.filter((regex) => regex.test(text));
  const isLikelyGenuineAlert = genuineHits.length >= 2 && !urlMatches.length && heuristicScore < 30;

  if (isLikelyGenuineAlert) {
    heuristicScore = Math.max(5, heuristicScore - 30);
  }

  // 3. Low-Token Gemini AI Reasoning Layer
  let aiSummary = "";
  let plainVerdict = "";
  let deceptions: string[] = [];
  let modelScore = heuristicScore;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Classify this SMS/Message as GENUINE or SCAM.
Message: "${text.slice(0, 300)}"
Heuristics: ${flags.join("; ") || "None"}

Output JSON:
{
  "isScam": boolean,
  "scamType": "e.g. Electricity Disconnection Scam / Bank KYC Phishing / Genuine Alert",
  "riskScore": number (0-100),
  "reason": "1-2 sentence plain reason",
  "action": "Immediate advice for the user",
  "deceptions": ["Tactic 1", "Tactic 2"]
}`;

      // Try gemini-3.8-flash, fallback to gemini-3.5-flash-lite on 503
      let respText: string | null = null;
      for (const model of ["gemini-3.8-flash", "gemini-3.5-flash-lite"]) {
        try {
          const resp = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              maxOutputTokens: 250,
            },
          });
          respText = resp.text?.trim() || null;
          if (respText) break;
        } catch {
          // retry with lite model
        }
      }

      if (respText) {
        const parsed = JSON.parse(respText);
        aiSummary = parsed.reason || "";
        plainVerdict = parsed.action || "";
        deceptions = parsed.deceptions || [];
        if (parsed.riskScore !== undefined) {
          modelScore = Math.max(heuristicScore, parsed.riskScore);
        }
        if (parsed.scamType) {
          detectedCategoryLabel = parsed.scamType;
        }
      }
    } catch {
      // Fallback to deterministic
    }
  }

  // Fallback explanations if Gemini was bypassed
  if (!aiSummary) {
    if (heuristicScore >= 50) {
      aiSummary = `This message matches known ${detectedCategoryLabel} fraud patterns. It employs artificial urgency and unauthorized contacts to solicit money or credentials.`;
      plainVerdict = "Do not call the numbers listed or click any embedded links. Official institutions will never threaten sudden disconnection or block via informal SMS.";
      deceptions = ["Threat of Immediate Service Disconnection", "Unverified Contact Channel"];
    } else {
      aiSummary = "The message appears to follow standard transactional notification formats with no active phishing lures detected.";
      plainVerdict = "Standard informational message. Always ensure you do not share OTPs with anyone calling you.";
      deceptions = [];
    }
  }

  // Calculate final risk score
  const finalScore = Math.min(100, Math.max(0, modelScore));
  const classification = finalScore >= 75 ? "CRITICAL" : finalScore >= 50 ? "HIGH" : finalScore >= 25 ? "SUSPICIOUS" : "LOW";

  // Build Structured Evidence
  const evidence: EvidenceItem[] = [
    {
      id: "EV-MSG-1",
      category: "SOCIAL_ENGINEERING",
      severity: classification === "CRITICAL" ? "CRITICAL" : classification === "HIGH" ? "HIGH" : "INFO",
      title: `Message Category: ${detectedCategoryLabel}`,
      description: aiSummary,
      technicalDetails: {
        textSnippet: text.slice(0, 150),
        extractedUrls: urlMatches,
        extractedPhones: phoneMatches,
        extractedUpi: upiMatches,
      },
      source: "Message Threat Intelligence Engine",
    },
  ];

  if (phoneMatches.length > 0 && classification !== "LOW") {
    evidence.push({
      id: "EV-MSG-2",
      category: "SOCIAL_ENGINEERING",
      severity: "HIGH",
      title: "Informal Contact Number Solicited",
      description: `Message directs recipient to call personal contact: ${phoneMatches.join(", ")}. Legitimate banks and utilities never use personal mobile numbers for official helplines.`,
      source: "Sender & Helpline Verifier",
    });
  }

  if (urlMatches.length > 0) {
    evidence.push({
      id: "EV-MSG-3",
      category: "URL_STRUCTURE",
      severity: "HIGH",
      title: "Embedded Unverified URL Link",
      description: `Message contains external link (${urlMatches[0]}). Phishing SMS attacks use links to steal credentials or download malicious APKs.`,
      source: "Message Link Extractor",
    });
  }

  return {
    id: `msg_${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputType: "MESSAGE",
    target: text.length > 60 ? `${text.slice(0, 60)}...` : text,
    evidence,
    aiAssessment: {
      summary: aiSummary,
      plainLanguageVerdict: plainVerdict,
      attackChain: [
        {
          step: 1,
          stage: "Panic / Lure Injection",
          description: `Attacker sends message with urgency or reward claim: "${detectedCategoryLabel}"`,
          evidenceIds: ["EV-MSG-1"],
        },
        {
          step: 2,
          stage: "Contact Redirection",
          description: "Victim is coerced into calling an unauthorized mobile number or clicking a link",
          evidenceIds: ["EV-MSG-2"],
        },
        {
          step: 3,
          stage: "Asset / Credential Theft",
          description: "Scammer requests OTP, remote access app installation, or UPI fee payment",
          evidenceIds: ["EV-MSG-1"],
        },
      ],
      identifiedDeceptions: deceptions,
      modelConfidence: 90,
      isAiFallback: !apiKey,
    },
    riskAssessment: {
      score: finalScore,
      classification,
      confidence: 90,
      contributors: [
        {
          signal: detectedCategory,
          category: "Social Engineering",
          points: finalScore,
          rationale: flags.join(" | ") || "Message heuristic pattern match",
        },
      ],
      verdictHeadline: classification === "CRITICAL" ? `Critical Scam Alert — ${detectedCategoryLabel}` : `${classification} Threat Level — Message Analysis`,
      scoreBreakdownSummary: `Evaluated message content against known fraud campaigns (${detectedCategoryLabel}).`,
    },
    recommendations: {
      doList: [
        "Do NOT call the numbers or click the links provided in this message.",
        "Verify your account or utility status only by logging into official apps or portals.",
        "Report the fraudulent sender number to the National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in) or Chakshu portal.",
      ],
      doNotList: [
        "DO NOT share any OTPs, PINs, or card details over phone calls.",
        "DO NOT install remote screen-sharing apps (AnyDesk, TeamViewer, RustDesk) if instructed by anyone calling you.",
      ],
      urgentNotice: classification === "CRITICAL" ? "High probability of social engineering fraud. Do not comply with any instructions in this message." : undefined,
    },
    limitations: ["Analysis evaluated text tokens, phone numbers, and linguistic patterns."],
  };
}
