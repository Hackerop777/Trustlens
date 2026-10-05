import { normalizeURL } from "./normalizer";
import { URLAnalysis } from "../types";

const SUSPICIOUS_KEYWORDS = [
  "login",
  "signin",
  "verify",
  "verification",
  "secure",
  "security",
  "account",
  "banking",
  "update",
  "wallet",
  "kyc",
  "support",
  "helpdesk",
  "portal",
  "alert",
  "billing",
  "confirm",
  "authenticate",
  "recover",
  "password",
  "token",
  "refund",
  "claim",
  "reward",
];

const KNOWN_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "cutt.ly",
  "is.gd",
  "ow.ly",
  "rb.gy",
  "buff.ly",
  "rebrand.ly",
  "bl.ink",
  "shorturl.at",
  "snip.ly",
]);

const HIGH_RISK_TLDS = new Set([
  "xyz",
  "top",
  "work",
  "icu",
  "tk",
  "ml",
  "ga",
  "cf",
  "gq",
  "buzz",
  "fit",
  "rest",
  "click",
  "link",
  "monster",
  "surf",
  "quest",
  "sbs",
]);

/**
 * Calculates the Shannon entropy of a string (higher entropy implies randomness or algorithmic generation).
 */
export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const frequencies = new Map<string, number>();

  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return Number(entropy.toFixed(3));
}

/**
 * Analyzes the URL for structural anomalies, lexical heuristics, and impersonation cues.
 */
export function analyzeURLHeuristics(rawInput: string): {
  analysis: URLAnalysis;
  isValid: boolean;
  error?: string;
} {
  const norm = normalizeURL(rawInput);

  if (!norm.isValid) {
    return {
      analysis: {
        rawUrl: rawInput,
        normalizedUrl: "",
        protocol: "",
        hostname: "",
        registeredDomain: "",
        subdomain: "",
        path: "",
        queryParamsCount: 0,
        entropy: 0,
        isIpAddress: false,
        isPunycode: false,
        isShortener: false,
        suspiciousKeywords: [],
        subdomainDepth: 0,
        flags: [norm.error || "Invalid URL"],
      },
      isValid: false,
      error: norm.error,
    };
  }

  const flags: string[] = [];
  const foundKeywords: string[] = [];

  // 1. IP address in hostname
  if (norm.isIpAddress) {
    flags.push("IP_ADDRESS_HOSTNAME: URL uses raw IP address instead of domain name");
  }

  // 2. Punycode / IDN homoglyph attack
  if (norm.isPunycode) {
    flags.push("PUNYCODE_DOMAIN: Internationalized domain name (IDN) detected; potential homoglyph spoofing");
  }

  // 3. Shortener detection
  const isShortener = KNOWN_SHORTENERS.has(norm.registeredDomain.toLowerCase());
  if (isShortener) {
    flags.push("URL_SHORTENER: Known URL shortener masks the actual destination");
  }

  // 4. Keyword searching across hostname and path
  const fullSearchTarget = `${norm.hostname}/${norm.path}`.toLowerCase();
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (fullSearchTarget.includes(kw)) {
      foundKeywords.push(kw);
    }
  }

  if (foundKeywords.length > 0) {
    flags.push(`SUSPICIOUS_KEYWORDS: Found security-sensitive terms: [${foundKeywords.join(", ")}]`);
  }

  // 5. Entropy check
  const hostEntropy = calculateShannonEntropy(norm.hostname);
  if (hostEntropy > 4.2) {
    flags.push(`HIGH_ENTROPY_HOSTNAME: Domain name exhibits high randomness (${hostEntropy}), characteristic of DGA domains`);
  }

  // 6. Subdomain depth check
  const subParts = norm.subdomain ? norm.subdomain.split(".") : [];
  const subdomainDepth = subParts.length;
  if (subdomainDepth >= 2) {
    flags.push(`EXCESSIVE_SUBDOMAINS: Subdomain nesting depth of ${subdomainDepth} exceeds standard patterns`);
  }

  // 7. Excessive hyphens in domain
  const hyphenCount = (norm.hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    flags.push(`EXCESSIVE_HYPHENS: Domain contains ${hyphenCount} hyphens, commonly seen in lookalike phishing domains`);
  }

  // 8. TLD risk
  const tld = norm.registeredDomain.split(".").pop() || "";
  if (HIGH_RISK_TLDS.has(tld.toLowerCase())) {
    flags.push(`HIGH_RISK_TLD: Top-Level Domain .${tld} is frequently associated with disposable malicious infrastructure`);
  }

  // 9. Brand impersonation in subdomain (e.g. hdfc.fake-domain.com)
  const commonBrands = ["hdfc", "sbi", "icici", "paypal", "google", "microsoft", "apple", "amazon", "netflix", "chase"];
  for (const brand of commonBrands) {
    if (norm.subdomain.toLowerCase().includes(brand) && !norm.registeredDomain.toLowerCase().includes(brand)) {
      flags.push(`SUBDOMAIN_BRAND_SPOOF: Trusted brand name '${brand}' found in subdomain of unrelated domain '${norm.registeredDomain}'`);
    }
  }

  return {
    isValid: true,
    analysis: {
      rawUrl: norm.rawUrl,
      normalizedUrl: norm.normalizedUrl,
      protocol: norm.protocol,
      hostname: norm.hostname,
      registeredDomain: norm.registeredDomain,
      subdomain: norm.subdomain,
      path: norm.path,
      queryParamsCount: norm.queryParamsCount,
      entropy: hostEntropy,
      isIpAddress: norm.isIpAddress,
      isPunycode: norm.isPunycode,
      isShortener,
      suspiciousKeywords: foundKeywords,
      subdomainDepth,
      flags,
    },
  };
}
