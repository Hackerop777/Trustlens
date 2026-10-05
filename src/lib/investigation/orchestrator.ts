import { analyzeURLHeuristics } from "../url/heuristics";
import { safeFetchURL } from "../fetcher/safe-fetch";
import { analyzePageContent } from "../fetcher/page-analyzer";
import { verifyBrandDomain, verifyBrandDomainAsync } from "../brand/verifier";
import { checkThreatIntelligence } from "../threat-intel/provider";
import { aggregateEvidence } from "../evidence/aggregator";
import { calculateRiskScore } from "../risk/engine";
import { reasonOverEvidence } from "../ai/gemini-orchestrator";
import { generateRecommendations } from "../recommendations/generator";
import { detectDomainCombosquatting } from "../domain/combosquat";
import { InvestigationResult } from "../types";

/**
 * Executes an end-to-end investigation on a target URL following the pipeline:
 * DETECT -> VERIFY -> REASON -> EXPLAIN -> PROTECT
 */
export async function investigateURL(rawInputUrl: string): Promise<InvestigationResult> {
  const investigationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const limitations: string[] = [];

  // STEP 1: URL Normalization & Lexical Heuristics
  const heuristicsResult = analyzeURLHeuristics(rawInputUrl);
  const urlAnalysis = heuristicsResult.analysis;

  if (!heuristicsResult.isValid) {
    limitations.push(`URL validation notice: ${heuristicsResult.error}`);
  }

  // STEP 2: Safe Server-Side Fetch (SSRF-Guarded)
  let pageAnalysis: ReturnType<typeof analyzePageContent> | undefined;
  let isFetchFailed = false;

  if (heuristicsResult.isValid) {
    const fetchResult = await safeFetchURL(urlAnalysis.normalizedUrl);

    if (fetchResult.isBlockedBySSRF) {
      limitations.push(`Target access restricted by SSRF protection policy: ${fetchResult.error}`);
      isFetchFailed = true;
    } else if (fetchResult.error) {
      limitations.push(`Webpage could not be fetched remotely: ${fetchResult.error}. Proceeding with URL & domain intelligence.`);
      isFetchFailed = true;
    } else {
      // STEP 3: Page Signal Extraction
      pageAnalysis = analyzePageContent(fetchResult.html, fetchResult.finalUrl);
      pageAnalysis.redirectChain = fetchResult.redirectChain;
      pageAnalysis.httpStatus = fetchResult.status;
      pageAnalysis.contentType = fetchResult.contentType;
    }
  } else {
    isFetchFailed = true;
  }

  // STEP 4: Brand & Identity Verification & Combosquatting
  const combosquat = detectDomainCombosquatting(urlAnalysis.hostname);

  // Gather brand candidates from page claims OR from combosquat OR from URL hints
  const brandCandidates: string[] = [];
  if (combosquat.isCombosquat && combosquat.impersonatedBrand) {
    brandCandidates.push(combosquat.impersonatedBrand);
  }
  if (pageAnalysis && pageAnalysis.claimedBrandCandidates.length > 0) {
    brandCandidates.push(...pageAnalysis.claimedBrandCandidates);
  }

  // If page didn't yield brand, check if URL hostname mentions recognizable brand
  if (brandCandidates.length === 0 && urlAnalysis.hostname) {
    const GENERIC_HOST_TOKENS = new Set([
      "com", "org", "net", "edu", "gov", "mil", "int", "io", "co", "in", "app", "dev",
      "xyz", "online", "site", "web", "www", "portal", "login", "auth", "secure", "test",
      "demo", "api", "cdn", "my", "mail", "server", "admin", "info", "link", "cloud"
    ]);
    const hostParts = urlAnalysis.hostname.split(/[.-]/);
    for (const part of hostParts) {
      const lower = part.toLowerCase();
      if (lower.length > 2 && !GENERIC_HOST_TOKENS.has(lower) && isNaN(Number(lower))) {
        brandCandidates.push(part);
      }
    }
  }

  let brandVerification = await verifyBrandDomainAsync(
    brandCandidates,
    urlAnalysis.registeredDomain || urlAnalysis.hostname
  );

  // If combosquat was detected and domain is not an authentic match, enforce MISMATCH
  if (combosquat.isCombosquat && brandVerification.status !== "MATCH") {
    brandVerification = {
      claimedBrand: combosquat.impersonatedBrand!,
      observedDomain: combosquat.observedDomain,
      expectedDomains: combosquat.authenticDomains || [],
      status: "MISMATCH",
      confidence: "high",
      reason: combosquat.explanation!,
      verificationSource: "TRUSTLENS Autonomous Combosquatting Engine",
    };
  }

  // STEP 5: Threat Intelligence
  const threatIntel = await checkThreatIntelligence(
    urlAnalysis.normalizedUrl || rawInputUrl,
    urlAnalysis.hostname
  );

  // STEP 6: Evidence Aggregation
  const evidence = aggregateEvidence({
    urlAnalysis,
    pageAnalysis,
    brandVerification,
    threatIntel,
  });

  // STEP 7: Deterministic Risk Fusion Engine
  const riskAssessment = calculateRiskScore({
    urlAnalysis,
    pageAnalysis,
    brandVerification,
    threatIntel,
    isFetchFailed,
  });

  // STEP 8: Gemini Reasoning & Attack Chain Synthesis
  const aiAssessment = await reasonOverEvidence({
    urlAnalysis,
    pageAnalysis,
    brandVerification,
    evidence,
    riskAssessment,
  });

  // STEP 9: Contextual Recommendations
  const recommendations = generateRecommendations(riskAssessment, brandVerification);

  if (isFetchFailed) {
    limitations.push(
      "Direct DOM contents could not be examined due to network restrictions or server protections. Assessment is based on URL heuristics, domain intelligence, and brand matching."
    );
  }

  return {
    id: investigationId,
    createdAt: new Date().toISOString(),
    inputType: "URL",
    target: rawInputUrl,
    urlAnalysis,
    pageAnalysis,
    brandVerification,
    threatIntel,
    evidence,
    aiAssessment,
    riskAssessment,
    recommendations,
    limitations,
  };
}
