import { investigateURL } from "../investigation/orchestrator";
import { InvestigationResult, EvidenceItem, RiskAssessment } from "../types";

export interface QRInvestigationResult {
  payloadType: "URL" | "UPI_PAYMENT" | "MESSAGING_LURE" | "PLAIN_TEXT";
  rawPayload: string;
  decodedTarget: string;
  upiDetails?: {
    payeeAddress?: string;
    payeeName?: string;
    amount?: string;
    transactionNote?: string;
    isSuspicious: boolean;
    flags: string[];
  };
  investigationResult?: InvestigationResult;
  directRiskAssessment?: RiskAssessment;
  evidence: EvidenceItem[];
}

/**
 * Investigates any QR code payload (URLs, UPI payment codes, Telegram/WhatsApp lures, or text).
 */
export async function investigateQRPayload(rawPayload: string): Promise<InvestigationResult> {
  const trimmed = rawPayload.trim();

  // 1. Check if payload is a UPI Payment QR
  if (/^upi:\/\/pay/i.test(trimmed)) {
    return handleUPIPaymentQR(trimmed);
  }

  // 2. Check if payload is a Telegram / WhatsApp direct chat lure
  if (/^(?:https?:\/\/)?(?:t\.me|wa\.me|api\.whatsapp\.com)/i.test(trimmed)) {
    return handleMessagingLureQR(trimmed);
  }

  // 3. Check if payload contains or is a URL
  let targetUrl = trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) && !trimmed.startsWith("http")) {
    targetUrl = `https://${trimmed}`;
  }

  if (/^https?:\/\//i.test(targetUrl)) {
    const result = await investigateURL(targetUrl);
    result.inputType = "QR";
    return result;
  }

  // 4. Fallback: Plain text / non-URL QR payload
  return handlePlainTextQR(trimmed);
}

/**
 * Special handler for UPI payment QR codes.
 */
function handleUPIPaymentQR(upiUrl: string): InvestigationResult {
  const urlParams = new URLSearchParams(upiUrl.replace(/^upi:\/\/pay\??/i, ""));
  const pa = urlParams.get("pa") || ""; // Payee VPA
  const pn = urlParams.get("pn") || ""; // Payee Name
  const am = urlParams.get("am") || ""; // Amount
  const tn = urlParams.get("tn") || ""; // Note

  const flags: string[] = [];
  let score = 30; // Base caution for unsolicited QR codes

  // Check if payee name or note pretends to be a refund, lottery, or electricity board
  const lowerNote = (pn + " " + tn).toLowerCase();
  const suspiciousLures = ["refund", "cashback", "lottery", "reward", "prize", "bescom", "electricity", "bill", "bonus"];
  for (const lure of suspiciousLures) {
    if (lowerNote.includes(lure)) {
      flags.push(`SUSPICIOUS_LURE: QR note or payee claims to be '${lure}'`);
      score += 35;
    }
  }

  // High amount preset
  if (am && parseFloat(am) > 5000) {
    flags.push(`HIGH_PRESET_AMOUNT: QR requests automatic transfer of ₹${am}`);
    score += 20;
  }

  const isCritical = score >= 70;
  const classification = isCritical ? "CRITICAL" : score >= 45 ? "HIGH" : "SUSPICIOUS";

  const evidence: EvidenceItem[] = [
    {
      id: "EV-UPI-1",
      category: "CREDENTIAL_HARVESTING",
      severity: isCritical ? "CRITICAL" : "HIGH",
      title: "Direct UPI Financial Transfer Payload",
      description: `Scanning this QR prompts your payment app to transfer money to VPA: ${pa} (${pn || "Unidentified Payee"}). Remember: QR codes can only deduct money from your account, never deposit money.`,
      technicalDetails: { payee: pa, name: pn, amount: am, note: tn },
      source: "UPI Payment String Parser",
    },
  ];

  if (flags.length > 0) {
    evidence.push({
      id: "EV-UPI-2",
      category: "SOCIAL_ENGINEERING",
      severity: "CRITICAL",
      title: "Deceptive Payment Lure in QR",
      description: `Payment metadata mimics official or refund entities: ${flags.join(", ")}.`,
      source: "Semantic UPI Heuristics",
    });
  }

  return {
    id: `qr_upi_${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputType: "QR",
    target: upiUrl,
    evidence,
    aiAssessment: {
      summary: `This QR code is configured as a UPI direct debit targeting VPA ${pa}. ${
        isCritical
          ? "It exhibits strong deceptive lures pretending to be a refund or official billing service."
          : "Exercise caution and verify the payee before authorizing any UPI PIN."
      }`,
      plainLanguageVerdict:
        "CRITICAL FRAUD WARNING: Scanning this QR will DEDUCT money from your bank account. In UPI, you NEVER need to scan a QR code or enter your UPI PIN to receive money or get a refund.",
      attackChain: [
        {
          step: 1,
          stage: "Deceptive Refund / Payment QR Generation",
          description: `Attacker crafts a pre-filled UPI transfer code to ${pa}`,
          evidenceIds: ["EV-UPI-1"],
        },
        {
          step: 2,
          stage: "Victim Authorization Coercion",
          description: "Victim is deceived into believing scanning the QR will receive funds",
          evidenceIds: ["EV-UPI-2"],
        },
        {
          step: 3,
          stage: "Immediate Irreversible Fund Transfer",
          description: "Entering UPI PIN immediately authorizes an irreversible bank transfer to the scammer",
          evidenceIds: ["EV-UPI-1"],
        },
      ],
      identifiedDeceptions: ["UPI Refund Scam Trap", "Deceptive Payee Labeling"],
      modelConfidence: 95,
      isAiFallback: false,
    },
    riskAssessment: {
      score: Math.min(100, score),
      classification,
      confidence: 90,
      contributors: [
        {
          signal: "UPI_DEBIT_QR",
          category: "Payment Trap",
          points: 40,
          rationale: `Pre-configured payment request to VPA: ${pa}`,
        },
        ...flags.map((f) => ({
          signal: "DECEPTIVE_LURE",
          category: "Social Engineering",
          points: 30,
          rationale: f,
        })),
      ],
      verdictHeadline: isCritical ? "Critical Threat — Fraudulent UPI Payment QR" : "Suspicious Payment QR Code",
      scoreBreakdownSummary: `Identified direct payment code requesting ₹${am || "unspecified amount"} to ${pa}.`,
    },
    recommendations: {
      doList: [
        "Do NOT enter your UPI PIN under any circumstance.",
        "Remember the golden rule of UPI: You only enter a PIN to SEND money, never to receive money.",
        "Report the scammer's UPI VPA to your payment provider (GPay/PhonePe/Paytm).",
      ],
      doNotList: [
        "DO NOT scan this QR code inside your banking app.",
        "DO NOT believe claims that scanning will 'credit' or 'refund' your account.",
      ],
      urgentNotice: "DANGER: Entering your UPI PIN will immediately transfer money to the attacker's account.",
    },
    limitations: ["Analysis evaluated direct UPI payment parameters."],
  };
}

/**
 * Special handler for messaging app recruitment lures (Telegram / WhatsApp).
 */
function handleMessagingLureQR(target: string): InvestigationResult {
  return {
    id: `qr_msg_${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputType: "QR",
    target,
    evidence: [
      {
        id: "EV-MSG-1",
        category: "SOCIAL_ENGINEERING",
        severity: "HIGH",
        title: "Direct Messaging Redirection Lure",
        description: `QR directs user into private messaging channels (${target}). Scammers frequently use unmonitored Telegram or WhatsApp groups for task/job fraud, crypto investment traps, and fake KBC lotteries.`,
        source: "Messaging Redirection Inspector",
      },
    ],
    aiAssessment: {
      summary: "QR code routes to private messaging platforms commonly leveraged in financial task and investment scams.",
      plainLanguageVerdict: "Be very careful. Scammers use QR codes linking to WhatsApp or Telegram to move targets off monitored platforms before soliciting investments or task fees.",
      attackChain: [
        { step: 1, stage: "QR Lure Scanning", description: "Victim scans QR to access promised offer", evidenceIds: ["EV-MSG-1"] },
        { step: 2, stage: "Off-Platform Grooming", description: "Attacker communicates privately on Telegram/WhatsApp", evidenceIds: ["EV-MSG-1"] },
      ],
      identifiedDeceptions: ["Off-platform redirection to unverified messaging channels"],
      modelConfidence: 85,
      isAiFallback: false,
    },
    riskAssessment: {
      score: 65,
      classification: "HIGH",
      confidence: 85,
      contributors: [
        { signal: "OFF_PLATFORM_REDIRECTION", category: "Social Engineering", points: 65, rationale: "Directs victim to private messaging channels" },
      ],
      verdictHeadline: "High Risk — Off-Platform Messaging Lure",
      scoreBreakdownSummary: "QR redirects to private messaging infrastructure frequently used in task scams.",
    },
    recommendations: {
      doList: ["Refuse to pay any 'registration fees' or 'security deposits'."],
      doNotList: ["DO NOT send money or join unsolicited Telegram investment channels."],
    },
    limitations: [],
  };
}

/**
 * Fallback for arbitrary non-URL text payloads in QRs.
 */
function handlePlainTextQR(text: string): InvestigationResult {
  return {
    id: `qr_txt_${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputType: "QR",
    target: text.slice(0, 100),
    evidence: [
      {
        id: "EV-TXT-1",
        category: "PAGE_CONTENT",
        severity: "INFO",
        title: "Plain Text Payload Extracted",
        description: `Decoded text content: "${text.slice(0, 200)}"`,
        source: "QR Payload Decoder",
      },
    ],
    aiAssessment: {
      summary: "QR code contains plain text without executable URLs or direct payment triggers.",
      plainLanguageVerdict: "This QR code contains textual information with no direct link to a website.",
      attackChain: [{ step: 1, stage: "Information Display", description: "Text display only", evidenceIds: ["EV-TXT-1"] }],
      identifiedDeceptions: [],
      modelConfidence: 80,
      isAiFallback: true,
    },
    riskAssessment: {
      score: 10,
      classification: "LOW",
      confidence: 80,
      contributors: [],
      verdictHeadline: "Low Risk — Non-Executable Text Payload",
      scoreBreakdownSummary: "Payload contains passive text.",
    },
    recommendations: { doList: ["No immediate risk identified."], doNotList: [] },
    limitations: ["Payload does not contain an inspectable web destination."],
  };
}
