import {
  URLAnalysis,
  PageAnalysis,
  BrandVerification,
  ThreatIntelResult,
  RiskAssessment,
  RiskClassification,
  RiskContribution,
} from "../types";

export function calculateRiskScore(params: {
  urlAnalysis?: URLAnalysis;
  pageAnalysis?: PageAnalysis;
  brandVerification?: BrandVerification;
  threatIntel?: ThreatIntelResult[];
  isFetchFailed?: boolean;
}): RiskAssessment {
  const { urlAnalysis, pageAnalysis, brandVerification, threatIntel, isFetchFailed } = params;

  const contributors: RiskContribution[] = [];
  let score = 0;
  let confidence = 85;

  // 1. BRAND VERIFICATION ANALYSIS
  if (brandVerification) {
    if (brandVerification.status === "MISMATCH") {
      const pts = 45;
      score += pts;
      contributors.push({
        signal: "BRAND_IMPERSONATION",
        category: "Identity & Domain",
        points: pts,
        rationale: `Page claims to represent '${brandVerification.claimedBrand}', but is hosted on illegitimate domain '${brandVerification.observedDomain}'.`,
      });
    } else if (brandVerification.status === "MATCH") {
      // Legitimately verified domain!
      contributors.push({
        signal: "AUTHENTIC_BRAND_DOMAIN",
        category: "Identity & Domain",
        points: -50,
        rationale: `Domain '${brandVerification.observedDomain}' is verified as authentic infrastructure for '${brandVerification.claimedBrand}'.`,
      });
    } else {
      // UNKNOWN brand
      confidence = 65;
    }
  }

  // 2. PAGE FORMS & CREDENTIAL HARVESTING
  if (pageAnalysis) {
    const isVerifiedAuthentic = brandVerification?.status === "MATCH";

    if (pageAnalysis.hasCrossDomainForm) {
      const pts = 25;
      score += pts;
      contributors.push({
        signal: "CROSS_DOMAIN_EXFILTRATION",
        category: "Form Security",
        points: pts,
        rationale: "Forms on the page submit user input to an external, cross-domain destination.",
      });
    }

    if (pageAnalysis.hasCredentialForm) {
      if (!isVerifiedAuthentic) {
        const pts = 25;
        score += pts;
        contributors.push({
          signal: "UNVERIFIED_LOGIN_FORM",
          category: "Form Security",
          points: pts,
          rationale: "Password harvesting input field detected on unverified external domain.",
        });
      }
    }

    if (pageAnalysis.hasOtpForm) {
      if (!isVerifiedAuthentic) {
        const pts = 20;
        score += pts;
        contributors.push({
          signal: "OTP_HARVESTING_FORM",
          category: "Form Security",
          points: pts,
          rationale: "One-Time Password / 2FA code input detected on unverified domain.",
        });
      }
    }

    if (pageAnalysis.hasPaymentForm) {
      if (!isVerifiedAuthentic) {
        const pts = 20;
        score += pts;
        contributors.push({
          signal: "PAYMENT_DETAILS_FORM",
          category: "Form Security",
          points: pts,
          rationale: "Credit card or banking payment fields detected on unverified domain.",
        });
      }
    }

    // Social Engineering
    if (pageAnalysis.urgencyIndicators.length > 0) {
      const pts = 15;
      score += pts;
      contributors.push({
        signal: "URGENCY_MANIPULATION",
        category: "Social Engineering",
        points: pts,
        rationale: `Detected coercive urgency language: "${pageAnalysis.urgencyIndicators.slice(0, 2).join('", "')}".`,
      });
    }
  }

  // 3. URL HEURISTICS
  if (urlAnalysis) {
    for (const flag of urlAnalysis.flags) {
      if (flag.startsWith("SUBDOMAIN_BRAND_SPOOF")) {
        const pts = 25;
        score += pts;
        contributors.push({
          signal: "SUBDOMAIN_BRAND_SPOOF",
          category: "URL Structure",
          points: pts,
          rationale: "Subdomain mimics a recognizable brand while root domain belongs to another party.",
        });
      } else if (flag.startsWith("PUNYCODE_DOMAIN")) {
        const pts = 20;
        score += pts;
        contributors.push({
          signal: "PUNYCODE_HOMOGLYPH",
          category: "URL Structure",
          points: pts,
          rationale: "Punycode domain detected, characteristic of lookalike homoglyph spoofing.",
        });
      } else if (flag.startsWith("IP_ADDRESS_HOSTNAME")) {
        const pts = 20;
        score += pts;
        contributors.push({
          signal: "IP_ADDRESS_HOST",
          category: "URL Structure",
          points: pts,
          rationale: "URL uses raw numerical IP address instead of registered domain.",
        });
      } else if (flag.startsWith("HIGH_RISK_TLD")) {
        const pts = 10;
        score += pts;
        contributors.push({
          signal: "HIGH_RISK_TLD",
          category: "URL Structure",
          points: pts,
          rationale: "Top-level domain belongs to known high-abuse, disposable registrar categories.",
        });
      } else if (flag.startsWith("SUSPICIOUS_KEYWORDS") && brandVerification?.status !== "MATCH") {
        const pts = 10;
        score += pts;
        contributors.push({
          signal: "DECEPTIVE_KEYWORDS",
          category: "URL Structure",
          points: pts,
          rationale: `URL incorporates sensitive security terms: ${urlAnalysis.suspiciousKeywords.slice(0, 3).join(", ")}.`,
        });
      }
    }
  }

  // 4. THREAT INTELLIGENCE (VirusTotal & Google Safe Browsing)
  if (threatIntel) {
    for (const intel of threatIntel) {
      if (intel.isFlagged) {
        let pts = 40;
        let rationale = `Target is blacklisted by ${intel.provider} (${intel.threatType || "Malicious"}).`;

        // Direct tiered VirusTotal weightage
        if (intel.provider.includes("VirusTotal")) {
          const malCount = intel.maliciousCount || 1;
          if (malCount >= 5) {
            pts = 75;
            rationale = `VirusTotal Multi-Vendor Consensus: ${malCount} security vendors flagged as malicious. Strong indicator of active threat.`;
          } else if (malCount >= 2) {
            pts = 50;
            rationale = `VirusTotal Multi-Engine: ${malCount} security engines detected malicious infrastructure.`;
          } else {
            pts = 35;
            rationale = `VirusTotal Multi-Engine: Flagged by security engine (${intel.threatType}).`;
          }
        } else if (intel.provider.includes("Google Safe Browsing")) {
          pts = 50;
          rationale = `Google Safe Browsing global telemetry confirmed active threat: ${intel.threatType || "Malware/Phishing"}.`;
        }

        score += pts;
        contributors.push({
          signal: "THREAT_INTEL_FLAG",
          category: "Threat Intelligence",
          points: pts,
          rationale,
        });
      }
    }
  }

  // 5. SPECIAL CASE: AUTHENTIC BRAND DOMAIN OVERRIDE
  const isAuthenticVerified = brandVerification?.status === "MATCH";
  if (isAuthenticVerified) {
    // If domain is authentic (e.g. hdfcbank.com) and no active exfiltration is found, clamp score low
    if (!pageAnalysis?.hasCrossDomainForm && !threatIntel?.some((t) => t.isFlagged)) {
      score = Math.min(score, 10);
      score = Math.max(0, score);
    }
  }

  // Clamp score strictly between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // 6. CRITICAL RULE: A score of 0 on an unverified domain does NOT equal safe!
  let classification: RiskClassification;
  let verdictHeadline: string;
  let scoreBreakdownSummary: string;

  if (isAuthenticVerified) {
    classification = "LOW";
    verdictHeadline = `Verified Authentic — Official ${brandVerification?.claimedBrand} Infrastructure`;
    scoreBreakdownSummary = `Domain '${brandVerification?.observedDomain}' is verified in authoritative registries as legitimate.`;
  } else if (score === 0 || (score <= 15 && contributors.length === 0)) {
    classification = "UNKNOWN";
    confidence = 35;
    verdictHeadline = "Unidentified / Inconclusive — Insufficient Details Available";
    scoreBreakdownSummary =
      "WARNING: A score of 0/100 does NOT mean this target is safe. Zero threat detections typically indicate that this domain is newly registered or unindexed by global security feeds. Status is unverified — exercise caution.";
  } else if (score >= 75) {
    classification = "CRITICAL";
    verdictHeadline = "Critical Threat — High-Confidence Malicious Impersonation";
    scoreBreakdownSummary = `Critical threat detected across ${contributors.length} security vectors. Score: ${score}/100.`;
  } else if (score >= 45) {
    classification = "HIGH";
    verdictHeadline = "High Risk — Multiple Scam & Harvesting Signals Detected";
    scoreBreakdownSummary = `High risk assessed across ${contributors.length} security factors. Score: ${score}/100.`;
  } else {
    classification = "SUSPICIOUS";
    verdictHeadline = "Suspicious — Unverified Target with Anomalies";
    scoreBreakdownSummary = `Suspicious factors detected across ${contributors.length} indicators. Score: ${score}/100.`;
  }

  return {
    score,
    classification,
    confidence,
    contributors,
    verdictHeadline,
    scoreBreakdownSummary,
  };
}
