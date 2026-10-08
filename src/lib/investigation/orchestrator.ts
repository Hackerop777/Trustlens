import { analyzeURLHeuristics } from "../url/heuristics";
import { safeFetchURL } from "../fetcher/safe-fetch";
import { analyzePageContent } from "../fetcher/page-analyzer";
import { verifyBrandDomain, verifyBrandDomainAsync } from "../brand/verifier";
import { checkThreatIntelligence } from "../threat-intel/provider";
import { aggregateEvidence } from "../evidence/aggregator";
import { calculateRiskScore } from "../risk/engine";
import { reasonOverEvidence } from "../ai/gemini-orchestrator";
import { generateRecommendations } from "../recommendations/generator";
import { detectDomainCombosquatting, EXPANDED_BRAND_LOOKUP } from "../domain/combosquat";
import { InvestigationResult, ExtensionScanPayload } from "../types";
import { saveInvestigation } from "./store";

/**
 * Executes an end-to-end investigation on a target URL following the pipeline:
 * DETECT -> VERIFY -> REASON -> EXPLAIN -> PROTECT
 */
export async function investigateURL(
  rawInputUrl: string,
  clientSignals?: ExtensionScanPayload
): Promise<InvestigationResult> {
  const investigationId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const limitations: string[] = [];

  // STEP 1: URL Normalization & Lexical Heuristics
  const heuristicsResult = analyzeURLHeuristics(rawInputUrl);
  const urlAnalysis = heuristicsResult.analysis;

  if (!heuristicsResult.isValid) {
    limitations.push(`URL validation notice: ${heuristicsResult.error}`);
  }

  // Extract preliminary brand candidates from hostname & combosquat
  const combosquat = detectDomainCombosquatting(urlAnalysis.hostname);
  const preliminaryBrandCandidates: string[] = [];
  if (combosquat.isCombosquat && combosquat.impersonatedBrand) {
    preliminaryBrandCandidates.push(combosquat.impersonatedBrand);
  }
  const GENERIC_HOST_TOKENS = new Set([
    "com", "org", "net", "edu", "gov", "mil", "int", "io", "co", "in", "app", "dev",
    "xyz", "online", "site", "web", "www", "portal", "login", "auth", "secure", "test",
    "demo", "api", "cdn", "my", "mail", "server", "admin", "info", "link", "cloud"
  ]);
  const hostParts = urlAnalysis.hostname.split(/[.-]/);
  for (const part of hostParts) {
    const lower = part.toLowerCase();
    if (lower.length > 2 && !GENERIC_HOST_TOKENS.has(lower) && isNaN(Number(lower))) {
      // Only include candidate if it matches a registered brand name or brand TLD
      if (EXPANDED_BRAND_LOOKUP[lower]) {
        preliminaryBrandCandidates.push(EXPANDED_BRAND_LOOKUP[lower].name);
      }
    }
  }

  // -------------------------------------------------------------
  // PARALLEL EXECUTION:
  // Thread 1: Safe DOM Crawler (SSRF-Guarded)
  // Thread 2: Multi-Engine Threat Intelligence (VirusTotal & SafeBrowsing)
  // -------------------------------------------------------------
  const [fetchResult, threatIntel] = await Promise.all([
    heuristicsResult.isValid ? safeFetchURL(urlAnalysis.normalizedUrl) : Promise.resolve(null),
    checkThreatIntelligence(urlAnalysis.normalizedUrl || rawInputUrl, urlAnalysis.hostname),
  ]);

  let pageAnalysis: ReturnType<typeof analyzePageContent> | undefined;
  let isFetchFailed = false;

  if (fetchResult) {
    if (fetchResult.isBlockedBySSRF) {
      limitations.push(`Target access restricted by SSRF protection policy: ${fetchResult.error}`);
      isFetchFailed = true;
    } else if (fetchResult.error) {
      limitations.push(`Webpage could not be fetched remotely: ${fetchResult.error}. Proceeding with URL & domain intelligence.`);
      isFetchFailed = true;
    } else {
      pageAnalysis = analyzePageContent(fetchResult.html, fetchResult.finalUrl);
      pageAnalysis.redirectChain = fetchResult.redirectChain;
      pageAnalysis.httpStatus = fetchResult.status;
      pageAnalysis.contentType = fetchResult.contentType;
    }
  } else {
    isFetchFailed = true;
  }

  // STEP 3.5: Fuse Client-Side DOM Signals (from Chrome Extension Sensor)
  if (clientSignals) {
    if (!pageAnalysis) {
      pageAnalysis = {
        finalUrl: clientSignals.url,
        httpStatus: 200,
        contentType: "text/html",
        redirectChain: [],
        title: clientSignals.page.title,
        metaDescription: clientSignals.page.metaDescription || "",
        claimedBrandCandidates: clientSignals.page.claimedBrands || [],
        forms: [],
        hasCredentialForm: clientSignals.signals.hasPasswordField,
        hasOtpForm: clientSignals.signals.hasOtpField,
        hasPaymentForm: clientSignals.signals.hasPaymentField,
        hasCrossDomainForm: clientSignals.signals.hasCrossDomainForm,
        urgencyIndicators: clientSignals.signals.urgencySnippets || [],
        socialEngineeringKeywords: [],
        iframeCount: 0,
        scriptCount: 0,
        sanitizedTextSnippet: clientSignals.page.snippet || "",
      };
      isFetchFailed = false;
    } else {
      if (clientSignals.signals.hasPasswordField) pageAnalysis.hasCredentialForm = true;
      if (clientSignals.signals.hasOtpField) pageAnalysis.hasOtpForm = true;
      if (clientSignals.signals.hasPaymentField) pageAnalysis.hasPaymentForm = true;
      if (clientSignals.signals.hasCrossDomainForm) pageAnalysis.hasCrossDomainForm = true;
      if (clientSignals.page.claimedBrands?.length) {
        pageAnalysis.claimedBrandCandidates = Array.from(
          new Set([...pageAnalysis.claimedBrandCandidates, ...clientSignals.page.claimedBrands])
        );
      }
      if (clientSignals.signals.urgencySnippets?.length) {
        pageAnalysis.urgencyIndicators = Array.from(
          new Set([...pageAnalysis.urgencyIndicators, ...clientSignals.signals.urgencySnippets])
        );
      }
    }
  }

  // STEP 4: Brand & Identity Verification (Tier 0 Registry + Tier 1 Live Web Search Grounding)
  const allBrandCandidates: string[] = [...preliminaryBrandCandidates];
  if (pageAnalysis && pageAnalysis.claimedBrandCandidates.length > 0) {
    allBrandCandidates.unshift(...pageAnalysis.claimedBrandCandidates);
  }

  let brandVerification = await verifyBrandDomainAsync(
    allBrandCandidates,
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

  const fullResult: InvestigationResult = {
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

  saveInvestigation(fullResult);
  return fullResult;
}
