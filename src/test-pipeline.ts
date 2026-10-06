import { normalizeURL } from "./lib/url/normalizer";
import { analyzeURLHeuristics } from "./lib/url/heuristics";
import { isPrivateOrReservedIP, safeFetchURL } from "./lib/fetcher/safe-fetch";
import { analyzePageContent } from "./lib/fetcher/page-analyzer";
import { verifyBrandDomain } from "./lib/brand/verifier";
import { calculateRiskScore } from "./lib/risk/engine";
import { investigateURL } from "./lib/investigation/orchestrator";

async function runTests() {
  console.log("==========================================");
  console.log("TRUSTLENS VERIFICATION SUITE (Phase 1 & 2)");
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

  // --- 1. URL Normalization ---
  console.log("--- 1. Testing URL Normalizer ---");
  const norm1 = normalizeURL("https://hdfc-login.xyz/portal/verify.php?utm_source=sms&ref=123&session=abc");
  assert(norm1.isValid, "URL Normalizer accepts valid https URL");
  assert(norm1.registeredDomain === "hdfc-login.xyz", "Extracts registered domain accurately", norm1.registeredDomain);
  assert(!norm1.normalizedUrl.includes("utm_source"), "Strips tracking parameters", norm1.normalizedUrl);
  assert(norm1.normalizedUrl.includes("session=abc"), "Preserves non-tracking query parameters", norm1.normalizedUrl);

  const normBad = normalizeURL("file:///etc/passwd");
  assert(!normBad.isValid, "Rejects forbidden schemes like file://");

  // --- 2. URL Heuristics & Homoglyphs ---
  console.log("\n--- 2. Testing URL Heuristics & Homoglyphs ---");
  const heur1 = analyzeURLHeuristics("http://hdfc.netbanking.customer-care-desk.xyz/verify-login");
  assert(heur1.analysis.flags.length > 0, "Identifies heuristics flags on deceptive URL");
  assert(
    heur1.analysis.flags.some((f) => f.includes("SUBDOMAIN_BRAND_SPOOF")),
    "Detects brand name spoofing in subdomain ('hdfc')",
    heur1.analysis.flags
  );
  assert(
    heur1.analysis.suspiciousKeywords.includes("login") && heur1.analysis.suspiciousKeywords.includes("verify"),
    "Extracts sensitive keywords ('login', 'verify')",
    heur1.analysis.suspiciousKeywords
  );

  const punyHeur = analyzeURLHeuristics("https://xn--pple-43d.com");
  assert(punyHeur.analysis.isPunycode, "Detects punycode homoglyph domain");

  // --- 3. SSRF Protection ---
  console.log("\n--- 3. Testing SSRF Defense Filters ---");
  assert(isPrivateOrReservedIP("127.0.0.1"), "Blocks 127.0.0.1 (Loopback)");
  assert(isPrivateOrReservedIP("10.0.0.1"), "Blocks 10.0.0.1 (Private 10/8)");
  assert(isPrivateOrReservedIP("192.168.1.1"), "Blocks 192.168.1.1 (Private 192.168/16)");
  assert(isPrivateOrReservedIP("169.254.169.254"), "Blocks 169.254.169.254 (Cloud Metadata)");
  assert(!isPrivateOrReservedIP("8.8.8.8"), "Allows public IP (8.8.8.8)");

  const ssrfFetch = await safeFetchURL("http://127.0.0.1:8080/admin");
  assert(ssrfFetch.isBlockedBySSRF, "Safe fetcher blocks SSRF request to 127.0.0.1");

  // --- 4. Brand Verification Engine ---
  console.log("\n--- 4. Testing Brand Verification Engine ---");
  const brandMismatch = verifyBrandDomain(["HDFC Bank"], "hdfc-customer-portal.xyz");
  assert(brandMismatch.status === "MISMATCH", "Correctly identifies Brand MISMATCH for HDFC Bank on .xyz", brandMismatch);
  assert(brandMismatch.expectedDomains.includes("hdfcbank.com"), "Provides expected authentic domain");

  const brandMatch = verifyBrandDomain(["HDFC Bank"], "hdfcbank.com");
  assert(brandMatch.status === "MATCH", "Correctly identifies Brand MATCH on official hdfcbank.com", brandMatch);

  const brandUnknown = verifyBrandDomain(["Unregistered Boutique Store"], "mystore.io");
  assert(brandUnknown.status === "UNKNOWN", "Returns UNKNOWN for entities not in authoritative registry", brandUnknown);

  // --- 5. Page Signal & Forms Analyzer ---
  console.log("\n--- 5. Testing Page Content & Security Form Analyzer ---");
  const mockPhishingHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>HDFC Bank NetBanking Security Alert</title>
      </head>
      <body>
        <h1>Immediate Action Required: Your Account is Suspended</h1>
        <p>Your KYC has expired. Please verify within 24 hours to prevent account closure.</p>
        <form action="https://attacker-harvester.xyz/submit.php" method="POST">
          <label>Customer ID: <input type="text" name="customer_id" /></label>
          <label>Password: <input type="password" name="password" /></label>
          <label>Enter OTP: <input type="text" name="otp_code" /></label>
          <button type="submit">Verify Now</button>
        </form>
      </body>
    </html>
  `;

  const pageSignals = analyzePageContent(mockPhishingHtml, "https://hdfc-update-portal.xyz/login");
  assert(pageSignals.claimedBrandCandidates.includes("HDFC Bank NetBanking Security Alert") || pageSignals.claimedBrandCandidates.length > 0, "Identifies brand candidates from page");
  assert(pageSignals.hasCredentialForm, "Detects password credential harvesting form");
  assert(pageSignals.hasOtpForm, "Detects OTP input field");
  assert(pageSignals.hasCrossDomainForm, "Detects cross-domain form exfiltration to attacker-harvester.xyz");
  assert(pageSignals.urgencyIndicators.length > 0, "Detects urgency indicators ('Account is Suspended' / 'within 24 hours')", pageSignals.urgencyIndicators);

  // --- 6. Deterministic Risk Fusion Engine ---
  console.log("\n--- 6. Testing Deterministic Risk Fusion Engine ---");
  const mockUrlAnalysis = heur1.analysis;
  const riskResult = calculateRiskScore({
    urlAnalysis: mockUrlAnalysis,
    pageAnalysis: pageSignals,
    brandVerification: brandMismatch,
  });

  assert(riskResult.score >= 76, `Risk score is CRITICAL (>= 76), calculated: ${riskResult.score}/100`, riskResult.score);
  assert(riskResult.classification === "CRITICAL", `Classification is CRITICAL, got: ${riskResult.classification}`);
  assert(riskResult.contributors.length >= 3, `Contributors breakdown has >= 3 factors, got: ${riskResult.contributors.length}`);

  // --- 8. Unindexed Domain 0/100 Rule (Unknown != Safe) ---
  console.log("\n--- 8. Testing 0/100 UNKNOWN Classification Rule ---");
  const unknownResult = await investigateURL("https://my-random-test-domain-1234.org");
  assert(unknownResult.riskAssessment.score === 0, `Unindexed domain score is 0, got: ${unknownResult.riskAssessment.score}`);
  assert(
    unknownResult.riskAssessment.classification === "UNKNOWN",
    `Classification must be UNKNOWN (not SAFE/LOW), got: ${unknownResult.riskAssessment.classification}`
  );
  assert(
    unknownResult.riskAssessment.scoreBreakdownSummary.includes("0/100 does NOT mean this target is safe"),
    "Summary explicitly warns that 0/100 != Safe"
  );

  // --- 9. Autonomous Combosquatting on .com (Without VirusTotal) ---
  console.log("\n--- 9. Testing Combosquatting on .com Domain ---");
  const combosquatResult = await investigateURL("https://hdfc-update-login.com");
  assert(
    combosquatResult.brandVerification?.status === "MISMATCH",
    `Combosquatting on .com domain detected as MISMATCH, got: ${combosquatResult.brandVerification?.status}`
  );
  assert(
    combosquatResult.riskAssessment.score >= 45,
    `Combosquatting score is elevated (>= 45), got: ${combosquatResult.riskAssessment.score}`
  );

  // --- 10. VirusTotal Weightage in Risk Score ---
  console.log("\n--- 10. Testing VirusTotal Multi-Engine Weightage ---");
  const vtRisk = calculateRiskScore({
    threatIntel: [
      {
        provider: "VirusTotal Multi-Engine",
        isFlagged: true,
        threatType: "malicious phishing",
        details: "5 security vendors flagged this domain",
        maliciousCount: 6,
        totalEngines: 92,
      },
    ],
  });
  assert(vtRisk.score >= 75, `VirusTotal 5+ engines gives >= 75 pts, got: ${vtRisk.score}`);
  assert(
    vtRisk.contributors.some((c) => c.signal === "THREAT_INTEL_FLAG" && c.points === 75),
    "VirusTotal contributor assigned 75 points"
  );

  // --- 11. SMS Scam Message Analyzer ---
  console.log("\n--- 11. Testing SMS / Message Fraud Analyzer ---");
  const { analyzeMessage } = await import("./lib/message/analyzer");
  const kycSmsResult = await analyzeMessage({
    content: "Dear Customer, your SBI account is blocked today due to pending KYC. Update PAN immediately: http://sbi-kyc-verify.xyz or electricity will be cut.",
    senderHeader: "+919876543210",
  });
  assert(kycSmsResult.riskAssessment.score >= 50, `SMS Scam detected with elevated risk (>= 50), got: ${kycSmsResult.riskAssessment.score}`);
  assert(
    kycSmsResult.riskAssessment.classification === "CRITICAL" || kycSmsResult.riskAssessment.classification === "HIGH",
    `SMS Scam classified as CRITICAL or HIGH, got: ${kycSmsResult.riskAssessment.classification}`
  );

  const genuineSmsResult = await analyzeMessage({
    content: "Rs. 2500.00 debited from A/c XX1234 on 05-Oct-26 at ATM. Avl Bal: Rs. 14200. Ref No: TXN987654.",
    senderHeader: "VK-HDFCBK",
  });
  assert(genuineSmsResult.riskAssessment.score <= 10, `Genuine transactional SMS has low risk (<= 10), got: ${genuineSmsResult.riskAssessment.score}`);
  assert(
    genuineSmsResult.riskAssessment.classification === "LOW",
    `Genuine transactional SMS classified as LOW, got: ${genuineSmsResult.riskAssessment.classification}`
  );

  // --- 12. OpenAI, Anthropic & Modern AI Tech Verification ---
  console.log("\n--- 12. Testing OpenAI & Anthropic Brand Recognition ---");
  const { verifyBrandDomainAsync } = await import("./lib/brand/verifier");
  const { detectDomainCombosquatting } = await import("./lib/domain/combosquat");

  const openAiMatch = verifyBrandDomain(["OpenAI"], "openai.com");
  assert(openAiMatch.status === "MATCH", "Recognizes authentic OpenAI on openai.com", openAiMatch);

  const anthropicMatch = verifyBrandDomain(["Anthropic"], "anthropic.com");
  assert(anthropicMatch.status === "MATCH", "Recognizes authentic Anthropic on anthropic.com", anthropicMatch);

  const claudeMatch = verifyBrandDomain(["Claude"], "claude.ai");
  assert(claudeMatch.status === "MATCH", "Recognizes authentic Claude AI on claude.ai", claudeMatch);

  const openAiSquat = detectDomainCombosquatting("openai-chat-login.com");
  assert(openAiSquat.isCombosquat, "Detects combosquatting targeting OpenAI ('openai-chat-login.com')", openAiSquat);
  assert(openAiSquat.impersonatedBrand === "OpenAI", "Identified impersonated brand as OpenAI");

  const anthropicSquat = detectDomainCombosquatting("claude-ai-portal.xyz");
  assert(anthropicSquat.isCombosquat, "Detects combosquatting targeting Claude/Anthropic ('claude-ai-portal.xyz')", anthropicSquat);

  const openAiMismatch = await verifyBrandDomainAsync(["OpenAI"], "openai-bonus-credits.xyz");
  assert(openAiMismatch.status === "MISMATCH", "Flags deceptive OpenAI domain as MISMATCH", openAiMismatch);

  console.log("\n--- 13. Testing Special Restricted Domains (.bank.in, .gov.in, .ac.in) ---");
  const hdfcBankIn = verifyBrandDomain(["HDFC Bank"], "wow.hdfc.bank.in");
  assert(hdfcBankIn.status === "MATCH", "Recognizes authentic HDFC Bank on wow.hdfc.bank.in", hdfcBankIn);

  const hdfcBankInSquat = detectDomainCombosquatting("wow.hdfc.bank.in");
  assert(!hdfcBankInSquat.isCombosquat, "Restricted .bank.in domain is NOT flagged as combosquat", hdfcBankInSquat);

  const fakeHdfcBankIn = detectDomainCombosquatting("hdfc-bank.in");
  assert(fakeHdfcBankIn.isCombosquat, "Generic open ccTLD 'hdfc-bank.in' IS flagged as combosquat", fakeHdfcBankIn);

  const govDomain = verifyBrandDomain(["Income Tax Department"], "incometax.gov.in");
  assert(govDomain.status === "MATCH", "Recognizes authentic government entity on .gov.in", govDomain);

  const fakeGov = detectDomainCombosquatting("incometax-gov.in");
  assert(fakeGov.isCombosquat, "Combosquatted 'incometax-gov.in' on open TLD IS flagged as combosquat", fakeGov);

  console.log("\n==========================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
