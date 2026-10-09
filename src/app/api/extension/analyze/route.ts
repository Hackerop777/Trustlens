import { NextRequest, NextResponse } from "next/server";
import { ExtensionScanPayloadSchema, ExtensionAnalysisResponse } from "@/lib/types";
import { investigateURL } from "@/lib/investigation/orchestrator";

// Enable CORS for Chrome Extension requests
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExtensionScanPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid extension payload format", details: parsed.error.issues },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const payload = parsed.data;
    const url = payload.url.trim();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Run TRUSTLENS investigation with fused client-side DOM signals
    const investigation = await investigateURL(url, payload);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response: ExtensionAnalysisResponse = {
      investigationId: investigation.id,
      riskScore: investigation.riskAssessment.score,
      classification: investigation.riskAssessment.classification,
      summary: investigation.aiAssessment.summary || investigation.riskAssessment.verdictHeadline,
      topSignals: investigation.riskAssessment.contributors.map((c) => c.rationale).slice(0, 5),
      attackChain: investigation.aiAssessment.attackChain.length
        ? investigation.aiAssessment.attackChain.map((s) => `${s.stage}: ${s.description}`)
        : [investigation.riskAssessment.verdictHeadline],
      recommendedActions: investigation.recommendations.doList.slice(0, 3),
      reportUrl: `${baseUrl}/?id=${investigation.id}`,
      brandClaim: investigation.brandVerification
        ? {
            claimedBrand: investigation.brandVerification.claimedBrand,
            status: investigation.brandVerification.status,
            isMatch: investigation.brandVerification.status === "MATCH",
            expectedDomain: investigation.brandVerification.expectedDomains?.[0],
          }
        : undefined,
    };

    return NextResponse.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[Extension Analyze API Error]:", error);
    return NextResponse.json(
      { error: "Failed to process extension security scan", details: error?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
