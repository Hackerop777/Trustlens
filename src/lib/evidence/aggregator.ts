import {
  URLAnalysis,
  PageAnalysis,
  BrandVerification,
  ThreatIntelResult,
  EvidenceItem,
} from "../types";

/**
 * Aggregates all deterministic observations into structured EvidenceItems.
 */
export function aggregateEvidence(params: {
  urlAnalysis: URLAnalysis;
  pageAnalysis?: PageAnalysis;
  brandVerification?: BrandVerification;
  threatIntel?: ThreatIntelResult[];
}): EvidenceItem[] {
  const { urlAnalysis, pageAnalysis, brandVerification, threatIntel } = params;
  const evidence: EvidenceItem[] = [];
  let counter = 1;

  const nextId = (prefix: string) => `${prefix}-${counter++}`;

  // 1. BRAND MISMATCH (Critical Signal)
  if (brandVerification) {
    if (brandVerification.status === "MISMATCH") {
      evidence.push({
        id: nextId("EV-BRAND"),
        category: "BRAND_IDENTITY",
        severity: "CRITICAL",
        title: "Brand Impersonation / Identity Mismatch",
        description: brandVerification.reason,
        technicalDetails: {
          claimedBrand: brandVerification.claimedBrand,
          observedDomain: brandVerification.observedDomain,
          expectedDomains: brandVerification.expectedDomains,
        },
        source: brandVerification.verificationSource,
      });
    } else if (brandVerification.status === "MATCH") {
      evidence.push({
        id: nextId("EV-BRAND"),
        category: "BRAND_IDENTITY",
        severity: "INFO",
        title: "Authoritative Brand Identity Verified",
        description: brandVerification.reason,
        technicalDetails: {
          claimedBrand: brandVerification.claimedBrand,
          domain: brandVerification.observedDomain,
        },
        source: brandVerification.verificationSource,
      });
    } else {
      evidence.push({
        id: nextId("EV-BRAND"),
        category: "BRAND_IDENTITY",
        severity: "LOW",
        title: "Unverified Brand Identity",
        description: brandVerification.reason,
        technicalDetails: {
          claimedBrand: brandVerification.claimedBrand,
        },
        source: brandVerification.verificationSource,
      });
    }
  }

  // 2. CREDENTIAL HARVESTING & FORM SIGNALS
  if (pageAnalysis) {
    if (pageAnalysis.hasCredentialForm) {
      const isUnverifiedDomain = brandVerification?.status !== "MATCH";
      evidence.push({
        id: nextId("EV-FORM"),
        category: "CREDENTIAL_HARVESTING",
        severity: isUnverifiedDomain ? "CRITICAL" : "LOW",
        title: "Password Input Form Detected",
        description: isUnverifiedDomain
          ? "The page contains a password input field on an unverified domain, characteristic of credential harvesting."
          : "The page contains a standard authentication login form on a verified brand domain.",
        technicalDetails: {
          formsCount: pageAnalysis.forms.length,
          fields: pageAnalysis.forms.flatMap((f) => f.fieldNames),
        },
        source: "DOM Security Form Inspector",
      });
    }

    if (pageAnalysis.hasOtpForm) {
      evidence.push({
        id: nextId("EV-OTP"),
        category: "CREDENTIAL_HARVESTING",
        severity: "HIGH",
        title: "One-Time Password (OTP) Input Detected",
        description: "The page requests a 2FA/OTP code. Attackers frequently use live OTP interceptors to bypass two-factor security.",
        technicalDetails: {
          hasOtp: true,
        },
        source: "DOM Security Form Inspector",
      });
    }

    if (pageAnalysis.hasPaymentForm) {
      evidence.push({
        id: nextId("EV-PAY"),
        category: "CREDENTIAL_HARVESTING",
        severity: "HIGH",
        title: "Payment / Cardholder Field Detected",
        description: "The page collects sensitive credit card or UPI banking details.",
        technicalDetails: {
          hasPayment: true,
        },
        source: "DOM Security Form Inspector",
      });
    }

    if (pageAnalysis.hasCrossDomainForm) {
      evidence.push({
        id: nextId("EV-EXFIL"),
        category: "CREDENTIAL_HARVESTING",
        severity: "CRITICAL",
        title: "Cross-Domain Form Exfiltration",
        description: "A form on this page submits data to a completely different external domain, a hallmark of credential harvesting infrastructure.",
        technicalDetails: {
          forms: pageAnalysis.forms.filter((f) => f.isCrossDomain).map((f) => f.action),
        },
        source: "DOM Security Form Inspector",
      });
    }

    // 3. SOCIAL ENGINEERING & URGENCY
    if (pageAnalysis.urgencyIndicators.length > 0) {
      evidence.push({
        id: nextId("EV-URGENCY"),
        category: "SOCIAL_ENGINEERING",
        severity: "HIGH",
        title: "Urgency / Coercive Language Detected",
        description: `Social engineering tactics detected: "${pageAnalysis.urgencyIndicators.join('", "')}". Phishing attacks rely on artificial panic to suppress critical evaluation.`,
        technicalDetails: {
          indicators: pageAnalysis.urgencyIndicators,
        },
        source: "Semantic Threat Heuristic Analyzer",
      });
    }
  }

  // 4. URL & DOMAIN STRUCTURE
  if (urlAnalysis.isIpAddress) {
    evidence.push({
      id: nextId("EV-URL"),
      category: "URL_STRUCTURE",
      severity: "HIGH",
      title: "Raw IP Address Hostname",
      description: `Target uses direct IP address (${urlAnalysis.hostname}) rather than a legitimate registered domain name.`,
      source: "URL Structural Heuristics",
    });
  }

  if (urlAnalysis.isPunycode) {
    evidence.push({
      id: nextId("EV-URL"),
      category: "URL_STRUCTURE",
      severity: "HIGH",
      title: "Punycode Homoglyph Encoding",
      description: `Domain contains punycode characters (${urlAnalysis.hostname}), typically used to visually imitate legitimate brand names using Cyrillic or Greek lookalikes.`,
      source: "URL Structural Heuristics",
    });
  }

  if (urlAnalysis.isShortener) {
    evidence.push({
      id: nextId("EV-URL"),
      category: "URL_STRUCTURE",
      severity: "MEDIUM",
      title: "URL Shortener Masking",
      description: "URL utilizes a shortener service to conceal the destination endpoint.",
      source: "URL Structural Heuristics",
    });
  }

  for (const flag of urlAnalysis.flags) {
    if (flag.includes("SUBDOMAIN_BRAND_SPOOF")) {
      evidence.push({
        id: nextId("EV-SPOOF"),
        category: "DOMAIN_IDENTITY",
        severity: "CRITICAL",
        title: "Subdomain Brand Spoofing",
        description: flag,
        source: "Domain Intelligence Engine",
      });
    } else if (flag.includes("HIGH_RISK_TLD")) {
      evidence.push({
        id: nextId("EV-TLD"),
        category: "URL_STRUCTURE",
        severity: "MEDIUM",
        title: "High-Risk Top-Level Domain",
        description: flag,
        source: "Domain Intelligence Engine",
      });
    }
  }

  // 5. THREAT INTELLIGENCE
  if (threatIntel) {
    for (const intel of threatIntel) {
      if (intel.isFlagged) {
        evidence.push({
          id: nextId("EV-INTEL"),
          category: "THREAT_INTELLIGENCE",
          severity: "CRITICAL",
          title: `Flagged by ${intel.provider}`,
          description: intel.details || "Listed as malicious in security feeds.",
          technicalDetails: {
            threatType: intel.threatType,
            reputationScore: intel.reputationScore,
          },
          source: intel.provider,
        });
      }
    }
  }

  return evidence;
}
