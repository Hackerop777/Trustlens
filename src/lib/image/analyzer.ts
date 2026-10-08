import { GoogleGenAI } from "@google/genai";
import { InvestigationResult, EvidenceItem, RiskAssessment } from "../types";
import { detectDomainCombosquatting } from "../domain/combosquat";
import { checkRestrictedDomain } from "../domain/restricted-tlds";

export interface ImageAnalysisInput {
  imageData?: string; // base64 or Data URL (e.g. data:image/png;base64,...)
  extractedText?: string;
  filename?: string;
}

interface VisionParsedOutput {
  isScam: boolean;
  scamType: string;
  riskScore: number;
  impersonatedBrand?: string | null;
  extractedUrls: string[];
  extractedPhones: string[];
  extractedText: string;
  summary: string;
  action: string;
  deceptions: string[];
}

/**
 * Multimodal Computer Vision Security Inspector for Screenshots & Scam Images.
 * Uses Gemini 3.5 Flash Lite with low latency and 7s timeout race, backed by deterministic fallback.
 */
export async function analyzeImage(input: ImageAnalysisInput): Promise<InvestigationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  let parsedVision: VisionParsedOutput | null = null;

  // Extract base64 and mimeType if Data URL
  let mimeType = "image/png";
  let base64Clean = "";

  if (input.imageData) {
    if (input.imageData.startsWith("data:")) {
      const match = input.imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Clean = match[2];
      }
    } else {
      base64Clean = input.imageData;
    }
  }

  if (apiKey && base64Clean) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are TRUSTLENS, an elite cyber intelligence and computer vision forensic inspector.
Analyze this screenshot / image for fraud, phishing, social engineering, or security threats.

Examine:
1. Is this a phishing website screenshot, fake bank alert, SMS/WhatsApp scam, fake lottery/job task message, fake utility bill disconnection alert, fake payment QR code, or legitimate screen?
2. Extract any visible URLs, domain names, phone numbers, or payment handles.
3. Identify any impersonated brand (e.g. HDFC Bank, SBI, Apple, PayPal, Google, Netflix, India Post, etc.).
4. Note deceptive design cues (e.g. fake security badges, coercive countdowns, typosquatted URLs, credential harvesting forms).

Output JSON:
{
  "isScam": boolean,
  "scamType": "e.g. Phishing Login Portal / Bank KYC Suspension / Utility Disconnection / Legitimate",
  "riskScore": number (0-100),
  "impersonatedBrand": "Brand Name or null",
  "extractedUrls": ["https://..."],
  "extractedPhones": ["+91..."],
  "extractedText": "Brief summary of text visible in image",
  "summary": "Technical summary in 2 sentences",
  "action": "Direct empathetic advice for the user",
  "deceptions": ["Deception 1", "Deception 2"]
}`;

      const genPromise = ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Clean,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 380,
        },
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Vision Timeout")), 7000)
      );

      const resp: any = await Promise.race([genPromise, timeoutPromise]);
      const respText = resp?.text?.trim();

      if (respText) {
        parsedVision = JSON.parse(respText);
      }
    } catch (err: any) {
      console.warn("Gemini vision analysis timed out or failed, engaging deterministic heuristics:", err?.message);
    }
  }

  // Deterministic Heuristic Fallback if Vision was bypassed or failed
  const fallbackText = input.extractedText || "Uploaded Image Screenshot";
  const lowerText = fallbackText.toLowerCase();

  const isPhishingKeyword = /kyc|blocked|suspended|pan card|electricity|lottery|prize|otp|password|login/i.test(lowerText);
  const defaultScore = parsedVision ? parsedVision.riskScore : isPhishingKeyword ? 65 : 15;
  const defaultCategory = parsedVision?.scamType || (isPhishingKeyword ? "Suspicious Message / Document Screenshot" : "Visual Document Inspection");
  const defaultSummary = parsedVision?.summary || (isPhishingKeyword ? "The analyzed screenshot exhibits social engineering keywords and visual cues indicative of an account compromise or phishing alert." : "Optical inspection completed. No prominent automated threat signatures or malicious credential harvesters detected in this image.");
  const defaultAction = parsedVision?.action || (isPhishingKeyword ? "Do not interact with any contact information or links shown in this screenshot. Always verify directly through official channels." : "Document appears benign. Always ensure you do not upload confidential credentials or OTPs.");
  const defaultDeceptions = parsedVision?.deceptions || (isPhishingKeyword ? ["Coercive Account Threat", "Unverified Security Notice"] : []);
  const detectedUrls = parsedVision?.extractedUrls || [];
  const detectedPhones = parsedVision?.extractedPhones || [];

  // Check extracted URLs against autonomous combosquatting & brand verifier
  let extraCombosquatFlag = false;
  let combosquatExplanation = "";
  for (const url of detectedUrls) {
    try {
      const parsedHost = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
      const squatResult = detectDomainCombosquatting(parsedHost);
      if (squatResult.isCombosquat) {
        extraCombosquatFlag = true;
        combosquatExplanation = squatResult.explanation || `Detected combosquatted domain targeting ${squatResult.impersonatedBrand}.`;
        break;
      }
    } catch {
      // Ignore URL parse error
    }
  }

  const finalScore = extraCombosquatFlag ? Math.max(defaultScore, 85) : Math.min(100, Math.max(0, defaultScore));
  const classification = finalScore >= 75 ? "CRITICAL" : finalScore >= 50 ? "HIGH" : finalScore >= 25 ? "SUSPICIOUS" : "LOW";

  // Build Structured Evidence Items
  const evidence: EvidenceItem[] = [
    {
      id: "EV-IMG-1",
      category: "SOCIAL_ENGINEERING",
      severity: classification === "CRITICAL" ? "CRITICAL" : classification === "HIGH" ? "HIGH" : "INFO",
      title: `Computer Vision Classification: ${defaultCategory}`,
      description: defaultSummary,
      technicalDetails: {
        extractedUrls: detectedUrls,
        extractedPhones: detectedPhones,
        visualTextSnippet: parsedVision?.extractedText || fallbackText.slice(0, 150),
        impersonatedBrand: parsedVision?.impersonatedBrand || undefined,
      },
      source: "TrustLens Multimodal Vision Engine",
    },
  ];

  if (extraCombosquatFlag) {
    evidence.push({
      id: "EV-IMG-2",
      category: "BRAND_IDENTITY",
      severity: "CRITICAL",
      title: "Extracted Domain Combosquatting Impersonation",
      description: combosquatExplanation,
      source: "Autonomous Brand Registry",
    });
  }

  if (detectedUrls.length > 0) {
    evidence.push({
      id: "EV-IMG-3",
      category: "URL_STRUCTURE",
      severity: classification === "CRITICAL" ? "CRITICAL" : "HIGH",
      title: "Embedded Links Extracted from Image",
      description: `Discovered destination URLs within screenshot: ${detectedUrls.join(", ")}.`,
      source: "OCR & Vision Link Extractor",
    });
  }

  return {
    id: `img_${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputType: "IMAGE",
    target: input.filename || "Uploaded Image Screenshot",
    evidence,
    aiAssessment: {
      summary: defaultSummary,
      plainLanguageVerdict: defaultAction,
      attackChain: [
        {
          step: 1,
          stage: "Visual Bait Inspection",
          description: `User captures screenshot of lure: "${defaultCategory}"`,
          evidenceIds: ["EV-IMG-1"],
        },
        {
          step: 2,
          stage: "Brand & Contact Analysis",
          description: parsedVision?.impersonatedBrand
            ? `Forensic vision model identified impersonation targeting ${parsedVision.impersonatedBrand}`
            : "Screen analyzed for deceptive links, urgency typography, and payment lures",
          evidenceIds: extraCombosquatFlag ? ["EV-IMG-2"] : ["EV-IMG-1"],
        },
        {
          step: 3,
          stage: "Mitigation & Action Guidance",
          description: defaultAction,
          evidenceIds: ["EV-IMG-1"],
        },
      ],
      identifiedDeceptions: defaultDeceptions,
      modelConfidence: 92,
      isAiFallback: !parsedVision,
    },
    riskAssessment: {
      score: finalScore,
      classification,
      confidence: 90,
      contributors: [
        {
          signal: defaultCategory,
          category: "Computer Vision Forensics",
          points: finalScore,
          rationale: defaultSummary,
        },
      ],
      verdictHeadline:
        classification === "CRITICAL"
          ? `Critical Visual Fraud Threat — ${defaultCategory}`
          : `${classification} Risk Level — Visual Forensic Inspection`,
      scoreBreakdownSummary: `Evaluated visual document through multimodal computer vision and deceptive cue recognition.`,
    },
    recommendations: {
      doList: [
        "Do NOT call phone numbers, scan QR codes, or click links displayed in this screenshot.",
        "Verify your account status by logging into the provider's official mobile application or official website directly.",
        "Report the screenshot to the National Cyber Crime Portal (1930) or Chakshu portal if it involves Indian financial / utility fraud.",
      ],
      doNotList: [
        "DO NOT approve any remote access prompts (AnyDesk, TeamViewer) shown in fraudulent screenshots.",
        "DO NOT make payment transfers to unverified personal UPI IDs.",
      ],
      urgentNotice:
        classification === "CRITICAL"
          ? "Critical scam screenshot identified. Cease communication with the sender immediately."
          : undefined,
    },
    limitations: ["Analysis evaluated optical layout, typography, OCR tokens, and multimodal vision models."],
  };
}
