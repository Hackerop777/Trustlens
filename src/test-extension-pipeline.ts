import { ExtensionScanPayloadSchema, ExtensionAnalysisResponseSchema } from "./lib/types";
import { investigateURL } from "./lib/investigation/orchestrator";

async function runExtensionTests() {
  console.log("==========================================");
  console.log("TRUSTLENS EXTENSION PIPELINE TEST SUITE (Milestone 1)");
  console.log("==========================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`, detail || "");
      process.exitCode = 1;
    }
  }

  // --- 1. Schema Validation for Extension Payloads ---
  console.log("--- 1. Testing Schema Contracts ---");
  const mockPayload = {
    url: "https://hdfc-verify-portal.xyz/login",
    hostname: "hdfc-verify-portal.xyz",
    page: {
      title: "HDFC Bank NetBanking Emergency Alert",
      metaDescription: "Urgent KYC Verification Portal",
      claimedBrands: ["HDFC Bank"],
      snippet: "Your HDFC account has been temporarily disabled. Please enter password and OTP immediately.",
    },
    signals: {
      hasPasswordField: true,
      hasOtpField: true,
      hasPaymentField: false,
      hasCrossDomainForm: true,
      externalFormAction: "attacker-exfil.xyz",
      urgencyDetected: true,
      urgencySnippets: ["account has been temporarily disabled", "enter password and OTP immediately"],
      inputCount: 4,
      formCount: 1,
    },
  };

  const parsed = ExtensionScanPayloadSchema.safeParse(mockPayload);
  assert(parsed.success, "ExtensionScanPayload validates against Zod schema");

  // --- 2. End-to-End Orchestrator with Client Signals ---
  console.log("\n--- 2. Testing Extension Signal Fusion in Orchestrator ---");
  const result = await investigateURL(mockPayload.url, mockPayload);

  assert(Boolean(result.id), "Investigation result generates unique ID", result.id);
  assert(result.riskAssessment.score >= 75, `Fused risk score is HIGH/CRITICAL (>= 75), got: ${result.riskAssessment.score}`);
  assert(
    result.riskAssessment.classification === "CRITICAL" || result.riskAssessment.classification === "HIGH",
    `Classification is CRITICAL/HIGH, got: ${result.riskAssessment.classification}`
  );
  assert(
    result.brandVerification?.status === "MISMATCH",
    `Brand verification detected MISMATCH for HDFC Bank on .xyz, got: ${result.brandVerification?.status}`
  );
  assert(
    result.pageAnalysis?.hasCredentialForm === true,
    "Fused page analysis retains client-detected credential form flag"
  );
  assert(
    result.pageAnalysis?.hasOtpForm === true,
    "Fused page analysis retains client-detected OTP form flag"
  );

  // --- 3. Extension API Response Contract Verification ---
  console.log("\n--- 3. Testing Extension Analysis Response Structure ---");
  const mockResponse = {
    investigationId: result.id,
    riskScore: result.riskAssessment.score,
    classification: result.riskAssessment.classification,
    summary: result.aiAssessment.summary || result.riskAssessment.verdictHeadline,
    topSignals: result.riskAssessment.contributors.map((c) => c.rationale).slice(0, 5),
    attackChain: result.aiAssessment.attackChain.map((s) => `${s.stage}: ${s.description}`),
    recommendedActions: result.recommendations.doList.slice(0, 3),
    reportUrl: `http://localhost:3000/?id=${result.id}`,
    brandClaim: {
      claimedBrand: result.brandVerification?.claimedBrand,
      status: result.brandVerification?.status,
      isMatch: result.brandVerification?.status === "MATCH",
    },
  };

  const resParsed = ExtensionAnalysisResponseSchema.safeParse(mockResponse);
  assert(resParsed.success, "Extension response matches ExtensionAnalysisResponseSchema", resParsed.error?.issues);
  assert(mockResponse.reportUrl.includes(result.id), "Report URL embeds valid investigation ID");
  assert(mockResponse.topSignals.length >= 2, "Contains at least 2 top threat signals for extension popup");

  // --- 4. Deep-Linking Investigation Store Verification ---
  console.log("\n--- 4. Testing Investigation Store & Deep Linking ---");
  const { getInvestigation } = await import("./lib/investigation/store");
  const stored = getInvestigation(result.id);
  assert(Boolean(stored), "Investigation is automatically preserved in store upon orchestration", stored?.id);
  assert(stored?.id === result.id, "Stored ID strictly matches investigation ID");
  assert(stored?.riskAssessment.score === result.riskAssessment.score, "Stored assessment matches calculated risk score");

  console.log("\n==========================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==========================================");
}

runExtensionTests().catch((err) => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
