import { BRAND_REGISTRY } from "../brand/registry";
import { parse } from "tldts";
import { checkRestrictedDomain } from "./restricted-tlds";

export interface CombosquatResult {
  isCombosquat: boolean;
  impersonatedBrand?: string;
  authenticDomains?: string[];
  observedDomain: string;
  deceptiveKeywords: string[];
  severity: "CRITICAL" | "HIGH" | "NONE";
  explanation?: string;
}

const COMMON_DECEPTIVE_TOKENS = [
  "login",
  "signin",
  "netbanking",
  "banking",
  "portal",
  "verify",
  "verification",
  "update",
  "upgrade",
  "kyc",
  "support",
  "helpdesk",
  "secure",
  "security",
  "alert",
  "notice",
  "account",
  "service",
  "services",
  "reward",
  "rewards",
  "cashback",
  "refund",
  "claim",
  "auth",
  "authenticate",
  "yono",
  "811",
  "pay",
  "wallet",
  "bill",
  "electricity",
  "recharge",
];

// Additional high-target brands for rapid combosquat matching
const EXPANDED_BRAND_LOOKUP: Record<string, { name: string; legitimateDomains: string[] }> = {
  hdfc: { name: "HDFC Bank", legitimateDomains: ["hdfcbank.com", "hdfc.com", "hdfc.bank.in"] },
  sbi: { name: "State Bank of India", legitimateDomains: ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com", "sbi.bank.in"] },
  onlinesbi: { name: "State Bank of India", legitimateDomains: ["sbi.co.in", "onlinesbi.sbi", "onlinesbi.com", "sbi.bank.in"] },
  yono: { name: "State Bank of India (YONO)", legitimateDomains: ["sbi.co.in", "onlinesbi.sbi"] },
  icici: { name: "ICICI Bank", legitimateDomains: ["icicibank.com", "icicibank.co.in", "icici.bank.in"] },
  axis: { name: "Axis Bank", legitimateDomains: ["axisbank.com", "axis.bank.in"] },
  kotak: { name: "Kotak Mahindra Bank", legitimateDomains: ["kotak.com", "kotak.bank.in"] },
  pnb: { name: "Punjab National Bank", legitimateDomains: ["pnbindia.in", "pnb.bank.in"] },
  paytm: { name: "Paytm", legitimateDomains: ["paytm.com", "paytmbank.com"] },
  phonepe: { name: "PhonePe", legitimateDomains: ["phonepe.com"] },
  gpay: { name: "Google Pay", legitimateDomains: ["pay.google.com", "google.com"] },
  paypal: { name: "PayPal", legitimateDomains: ["paypal.com", "paypal.me"] },
  google: { name: "Google", legitimateDomains: ["google.com", "google.co.in"] },
  apple: { name: "Apple", legitimateDomains: ["apple.com", "icloud.com"] },
  microsoft: { name: "Microsoft", legitimateDomains: ["microsoft.com", "live.com", "office.com", "bing.com"] },
  bing: { name: "Microsoft Bing", legitimateDomains: ["bing.com", "microsoft.com"] },
  amazon: { name: "Amazon", legitimateDomains: ["amazon.com", "amazon.in"] },
  netflix: { name: "Netflix", legitimateDomains: ["netflix.com"] },
  facebook: { name: "Meta / Facebook", legitimateDomains: ["facebook.com", "meta.com"] },
  instagram: { name: "Instagram", legitimateDomains: ["instagram.com"] },
  whatsapp: { name: "WhatsApp", legitimateDomains: ["whatsapp.com"] },
  telegram: { name: "Telegram", legitimateDomains: ["telegram.org", "t.me"] },
  incometax: { name: "Income Tax Department", legitimateDomains: ["incometax.gov.in"] },
  epfo: { name: "EPFO India", legitimateDomains: ["epfindia.gov.in"] },
  aadhaar: { name: "UIDAI Aadhaar", legitimateDomains: ["uidai.gov.in"] },
  uidai: { name: "UIDAI Aadhaar", legitimateDomains: ["uidai.gov.in"] },
  bescom: { name: "BESCOM Electricity", legitimateDomains: ["bescom.karnataka.gov.in"] },
  mahavitaran: { name: "Mahavitaran Electricity", legitimateDomains: ["mahadiscom.in"] },
  chase: { name: "Chase Bank", legitimateDomains: ["chase.com"] },
  wellsfargo: { name: "Wells Fargo", legitimateDomains: ["wellsfargo.com"] },
  openai: { name: "OpenAI", legitimateDomains: ["openai.com", "chatgpt.com"] },
  chatgpt: { name: "OpenAI ChatGPT", legitimateDomains: ["chatgpt.com", "openai.com"] },
  anthropic: { name: "Anthropic", legitimateDomains: ["anthropic.com", "claude.ai"] },
  claude: { name: "Anthropic Claude", legitimateDomains: ["claude.ai", "anthropic.com"] },
  perplexity: { name: "Perplexity AI", legitimateDomains: ["perplexity.ai"] },
  mistral: { name: "Mistral AI", legitimateDomains: ["mistral.ai"] },
  supabase: { name: "Supabase", legitimateDomains: ["supabase.com", "supabase.co"] },
  vercel: { name: "Vercel", legitimateDomains: ["vercel.com", "vercel.app"] },
  stripe: { name: "Stripe", legitimateDomains: ["stripe.com"] },
  github: { name: "GitHub", legitimateDomains: ["github.com", "github.io"] },
  cloudflare: { name: "Cloudflare", legitimateDomains: ["cloudflare.com"] },
};

/**
 * Normalizes string removing punctuation.
 */
function cleanString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Evaluates whether a domain is an unauthorized combosquat / typosquat targeting a brand.
 * Works deterministically without needing VirusTotal or active webpage scraping.
 */
export function detectDomainCombosquatting(hostname: string): CombosquatResult {
  const normHost = hostname.toLowerCase().trim();
  const tldParsed = parse(normHost);
  const registeredDomain = (tldParsed.domain || normHost).toLowerCase();
  const subdomain = (tldParsed.subdomain || "").toLowerCase();

  // 1. Check if domain is genuinely legitimate for any brand
  for (const brandKey in EXPANDED_BRAND_LOOKUP) {
    const brand = EXPANDED_BRAND_LOOKUP[brandKey];
    for (const legit of brand.legitimateDomains) {
      if (registeredDomain === legit || registeredDomain.endsWith(`.${legit}`)) {
        return {
          isCombosquat: false,
          observedDomain: registeredDomain,
          deceptiveKeywords: [],
          severity: "NONE",
        };
      }
    }
  }

  // 1.5 Check Restricted Regulated Suffixes (.bank.in, .gov.in, .ac.in, etc.)
  // Fraudsters cannot register domains on these government/RBI-chartered suffixes.
  const restrictedInfo = checkRestrictedDomain(normHost);
  if (restrictedInfo.isRestricted && restrictedInfo.entityLabel) {
    const brand = EXPANDED_BRAND_LOOKUP[restrictedInfo.entityLabel];
    if (brand || restrictedInfo.category === "BANKING" || restrictedInfo.category === "GOVERNMENT") {
      return {
        isCombosquat: false,
        observedDomain: registeredDomain,
        deceptiveKeywords: [],
        severity: "NONE",
      };
    }
  }

  // 2. Search for brand tokens inside the registered domain name or subdomain
  const cleanedDomainName = registeredDomain.split(".")[0] || ""; // e.g. "hdfc-netbanking"
  const tokensInDomain = registeredDomain.split(/[.-]/).filter(Boolean);
  const tokensInSubdomain = subdomain.split(/[.-]/).filter(Boolean);
  const allTokens = [...tokensInDomain, ...tokensInSubdomain];

  for (const brandKey in EXPANDED_BRAND_LOOKUP) {
    const brand = EXPANDED_BRAND_LOOKUP[brandKey];
    const brandClean = cleanString(brandKey);

    // Does any token equal the brand, or does the domain name start/end with brand?
    const hasBrandInDomain =
      tokensInDomain.includes(brandClean) ||
      tokensInSubdomain.includes(brandClean) ||
      cleanedDomainName.startsWith(`${brandClean}-`) ||
      cleanedDomainName.endsWith(`-${brandClean}`) ||
      cleanedDomainName.includes(`-${brandClean}-`) ||
      (cleanedDomainName.length > brandClean.length && cleanedDomainName.includes(brandClean));

    if (hasBrandInDomain) {
      // Find what deceptive tokens were combined with this brand
      const matchedDeceptiveTokens = COMMON_DECEPTIVE_TOKENS.filter((kw) =>
        normHost.includes(kw)
      );

      return {
        isCombosquat: true,
        impersonatedBrand: brand.name,
        authenticDomains: brand.legitimateDomains,
        observedDomain: registeredDomain,
        deceptiveKeywords: matchedDeceptiveTokens,
        severity: "CRITICAL",
        explanation: `Domain Combosquatting: The domain '${registeredDomain}' embeds the trademarked brand name '${brand.name}', but is NOT an authorized domain for this organization. Authentic domains are [${brand.legitimateDomains.join(", ")}].`,
      };
    }
  }

  return {
    isCombosquat: false,
    observedDomain: registeredDomain,
    deceptiveKeywords: [],
    severity: "NONE",
  };
}
