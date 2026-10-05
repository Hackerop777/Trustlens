import { GoogleGenAI } from "@google/genai";
import {
  EvidenceItem,
  RiskAssessment,
  URLAnalysis,
  PageAnalysis,
  BrandVerification,
  AIAssessment,
  AttackChainStep,
} from "../types";

/**
 * Builds a deterministic AI assessment fallback when Gemini API key is unavailable or fails.
 */
function buildFallbackAssessment(params: {
  riskAssessment: RiskAssessment;
  evidence: EvidenceItem[];
  brandVerification?: BrandVerification;
  pageAnalysis?: PageAnalysis;
}): AIAssessment {
  const { riskAssessment, evidence, brandVerification, pageAnalysis } = params;

  const attackChain: AttackChainStep[] = [];
  const identifiedDeceptions: string[] = [];
  let step = 1;

  if (brandVerification?.status === "MISMATCH") {
    attackChain.push({
      step: step++,
      stage: "Brand Impersonation / Combosquatting",
      description: `Target visually or lexically imitates '${brandVerification.claimedBrand}' while operating on unauthorized domain '${brandVerification.observedDomain}'.`,
      evidenceIds: evidence.filter((e) => e.category === "BRAND_IDENTITY").map((e) => e.id),
    });
    identifiedDeceptions.push(`Impersonation of ${brandVerification.claimedBrand}`);
  }

  if (pageAnalysis?.urgencyIndicators && pageAnalysis.urgencyIndicators.length > 0) {
    attackChain.push({
      step: step++,
      stage: "Psychological Coercion (Artificial Urgency)",
      description: `Applies artificial urgency (${pageAnalysis.urgencyIndicators[0]}) to suppress cautious evaluation.`,
      evidenceIds: evidence.filter((e) => e.category === "SOCIAL_ENGINEERING").map((e) => e.id),
    });
    identifiedDeceptions.push("Artificial urgency coercing quick compliance");
  }

  if (pageAnalysis?.hasCredentialForm || pageAnalysis?.hasOtpForm || pageAnalysis?.hasPaymentForm) {
    attackChain.push({
      step: step++,
      stage: "Credential & Asset Harvesting",
      description: "Presents form fields to capture sensitive login passwords, 2FA tokens, or financial cards.",
      evidenceIds: evidence.filter((e) => e.category === "CREDENTIAL_HARVESTING").map((e) => e.id),
    });
    identifiedDeceptions.push("Phishing login or payment interface");
  }

  if (attackChain.length === 0) {
    attackChain.push({
      step: 1,
      stage: riskAssessment.classification === "LOW" ? "Legitimate Access" : "Direct Inspection",
      description:
        riskAssessment.classification === "LOW"
          ? "Target presents verified authentic web service behavior without active harvesting indicators."
          : "Target exhibits minor anomalies requiring user discretion.",
      evidenceIds: evidence.map((e) => e.id).slice(0, 2),
    });
  }

  const plainLanguageVerdict =
    riskAssessment.classification === "CRITICAL"
      ? "This target is an active phishing scam designed to impersonate an authentic service and harvest your credentials or money."
      : riskAssessment.classification === "HIGH"
      ? "This target presents significant scam indicators. Proceed with extreme caution and do not enter passwords or financial details."
      : riskAssessment.classification === "SUSPICIOUS"
      ? "We observed several suspicious signals. Verify the identity of the sender before taking any action."
      : riskAssessment.classification === "LOW"
      ? "No significant security threats or brand impersonation was detected for this verified destination."
      : "Insufficient data to establish certainty. Exercise caution.";

  return {
    summary: `${riskAssessment.verdictHeadline}. ${riskAssessment.scoreBreakdownSummary}`,
    plainLanguageVerdict,
    attackChain,
    identifiedDeceptions:
      identifiedDeceptions.length > 0 ? identifiedDeceptions : ["No prominent deceptive patterns confirmed."],
    modelConfidence: riskAssessment.confidence,
    isAiFallback: true,
  };
}

/**
 * Helper to call Gemini with retry on 503/429 and fallback model.
 */
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  prompt: string
): Promise<string | null> {
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 380, // Low token budget
          },
        });

        const text = response.text?.trim();
        if (text) return text;
      } catch (err: any) {
        const is503 = err?.message?.includes("503") || err?.status === 503;
        const is429 = err?.message?.includes("429") || err?.status === 429;

        if (is503 || is429) {
          // Wait 600ms before retrying or switching model
          await new Promise((r) => setTimeout(r, 600));
        } else {
          // If non-503 error, break to next model
          break;
        }
      }
    }
  }

  return null;
}

/**
 * Uses Gemini (with low token prompt & 503 retry) to reason over structured evidence.
 */
export async function reasonOverEvidence(params: {
  urlAnalysis?: URLAnalysis;
  pageAnalysis?: PageAnalysis;
  brandVerification?: BrandVerification;
  evidence: EvidenceItem[];
  riskAssessment: RiskAssessment;
}): Promise<AIAssessment> {
  const { urlAnalysis, pageAnalysis, brandVerification, evidence, riskAssessment } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackAssessment(params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Ultra-compact evidence representation (~100 tokens)
    const signalsSummary = evidence
      .map((e) => `[${e.severity}] ${e.title}: ${e.description.slice(0, 100)}`)
      .slice(0, 5)
      .join("\n");

    const prompt = `You are TRUSTLENS, an elite cyber intelligence engine.
Analyze these concise deterministic facts:
Host: ${urlAnalysis?.hostname || "N/A"}
Brand Claim: ${brandVerification?.claimedBrand || "None"} | Status: ${brandVerification?.status || "UNKNOWN"}
Risk Score: ${riskAssessment.score}/100 (${riskAssessment.classification})
Signals:
${signalsSummary}

Output JSON:
{
  "summary": "Technical summary in 2 sentences",
  "plainLanguageVerdict": "Direct, empathetic advice for non-technical victim",
  "attackChain": [{"step": 1, "stage": "Stage Name", "description": "Short explanation", "evidenceIds": []}],
  "identifiedDeceptions": ["Deception 1", "Deception 2"],
  "modelConfidence": 90
}`;

    const text = await callGeminiWithFallback(ai, prompt);
    if (!text) {
      return buildFallbackAssessment(params);
    }

    const parsed = JSON.parse(text);
    return {
      summary: parsed.summary || riskAssessment.verdictHeadline,
      plainLanguageVerdict: parsed.plainLanguageVerdict || "Exercise caution.",
      attackChain: parsed.attackChain || [],
      identifiedDeceptions: parsed.identifiedDeceptions || [],
      modelConfidence: parsed.modelConfidence || 85,
      rawReasoning: text,
      isAiFallback: false,
    };
  } catch (err: any) {
    console.error("Gemini reasoning fallback activated:", err?.message);
    return buildFallbackAssessment(params);
  }
}
