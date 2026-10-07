import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ChatRequestSchema } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid chat payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message, history = [], investigationContext } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Deterministic evidence-grounded response fallback
      const brand = investigationContext?.brandVerification?.claimedBrand || "the claimed organization";
      const domain = investigationContext?.urlAnalysis?.hostname || "the target domain";
      const score = investigationContext?.riskAssessment?.score ?? 0;
      const status = investigationContext?.brandVerification?.status || "UNKNOWN";

      let responseText = `Based on the completed investigation for ${domain} (Risk Score: ${score}/100):\n\n`;
      if (status === "MISMATCH") {
        responseText += `The primary threat signal is **Brand Impersonation**. The website claims to represent **${brand}**, but operates on **${domain}**, which is not an authentic domain for this organization.\n\n`;
      }
      if (investigationContext?.pageAnalysis?.hasCredentialForm) {
        responseText += `We also identified a **password entry form** on this unverified host, indicating active credential harvesting.\n\n`;
      }
      responseText += `If you entered any credentials or sensitive data, immediately contact ${brand}'s official fraud helpline and change your passwords from a secure device.`;

      return NextResponse.json({
        reply: responseText,
        isAiFallback: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `
You are TRUSTLENS Security Assistant. The user is asking follow-up questions about a specific security investigation.
You must answer their questions clearly, objectively, and empathetically.

[RULES]
1. Base your answers strictly on the investigation evidence provided below.
2. If the user asks what to do if they already gave credentials or OTP, provide immediate, calm containment advice.
3. Remind users that TRUSTLENS provides security intelligence and advice, but cannot reverse financial transactions.
4. Do not speculate or contradict the deterministic evidence.

[INVESTIGATION EVIDENCE]
Target: ${investigationContext?.target || "N/A"}
Risk Score: ${investigationContext?.riskAssessment?.score || "N/A"}/100 (${investigationContext?.riskAssessment?.classification || "N/A"})
Brand Claim: ${investigationContext?.brandVerification?.claimedBrand || "None"} (Status: ${investigationContext?.brandVerification?.status})
Observed Domain: ${investigationContext?.urlAnalysis?.hostname || "N/A"}
Forms: ${JSON.stringify(investigationContext?.pageAnalysis?.forms || [])}
Urgency Indicators: ${JSON.stringify(investigationContext?.pageAnalysis?.urgencyIndicators || [])}
Attack Chain: ${JSON.stringify(investigationContext?.aiAssessment?.attackChain || [])}
Recommendations: ${JSON.stringify(investigationContext?.recommendations || {})}
`;

    const chatContents = [
      { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] },
    ];

    let reply = "";
    // Try fast models with fallback: gemini-3.5-flash-lite (1-2s response) then gemini-3.8-flash
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
    for (const model of candidateModels) {
      try {
        const responsePromise = ai.models.generateContent({
          model,
          contents: chatContents,
          config: {
            maxOutputTokens: 600,
          },
        });

        // 8-second timeout per attempt to prevent endless loading spinner
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on model ${model}`)), 8000)
        );

        const response: any = await Promise.race([responsePromise, timeoutPromise]);
        reply = response.text || "";
        if (reply.trim()) break;
      } catch (err: any) {
        console.warn(`[Chat API] ${model} attempt failed:`, err?.message || err);
      }
    }

    if (!reply.trim()) {
      // Deterministic fallback response if API is unreachable
      reply = `Based on the investigation for ${investigationContext?.target || "this target"}, the primary threat score is ${investigationContext?.riskAssessment?.score || 0}/100. Exercise caution and do not disclose sensitive credentials or 2FA codes.`;
    }

    return NextResponse.json({
      reply,
      isAiFallback: false,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message", details: error?.message },
      { status: 500 }
    );
  }
}
