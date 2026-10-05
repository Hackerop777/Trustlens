import { GoogleGenAI } from "@google/genai";
import { parse } from "tldts";

export interface DynamicBrandProfile {
  entityName: string;
  officialDomains: string[];
  isRecognizedEntity: boolean;
  category: string;
  verificationSource: string;
  discoveredAt: string;
}

// In-memory runtime cache for dynamically resolved brands
const DYNAMIC_BRAND_CACHE = new Map<string, DynamicBrandProfile>();

const GENERIC_EXCLUSIONS = new Set([
  "home", "login", "signin", "index", "welcome", "portal", "official", "support",
  "help", "contact", "about", "blog", "app", "dashboard", "auth", "security",
  "update", "account", "service", "terms", "privacy", "cookie", "cookie policy"
]);

/**
 * Normalizes text for brand cache lookup.
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Resolves a claimed brand/company identity dynamically using live Google Search Grounding.
 * Discovers real-world authoritative domains from live web search and grounding telemetry.
 */
export async function resolveBrandViaLiveWeb(brandCandidate: string): Promise<DynamicBrandProfile | null> {
  const cleanName = brandCandidate.trim();
  const normKey = normalizeKey(cleanName);

  if (!cleanName || cleanName.length < 3 || cleanName.length > 60 || GENERIC_EXCLUSIONS.has(normKey)) {
    return null;
  }

  // 1. Check in-memory dynamic cache
  if (DYNAMIC_BRAND_CACHE.has(normKey)) {
    return DYNAMIC_BRAND_CACHE.get(normKey)!;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini 2.5 with live Google Search tool
    const prompt = `You are an authoritative brand and cybersecurity intelligence verifier.
Search the live public web to identify the authentic official primary website domain(s) for the real-world company, organization, or brand: "${cleanName}".

Provide a concise answer:
1. Exact Entity Name:
2. Official Primary Registered Domain(s) (e.g. openai.com, anthropic.com):
3. Is this a legitimate real-world organization (Yes/No):`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || "";
    const metadata = response.candidates?.[0]?.groundingMetadata;

    const discoveredDomains = new Set<string>();

    // 1. Extract verified domains from live Google Search grounding chunks
    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        const uri = chunk.web?.uri;
        if (uri) {
          try {
            const parsed = parse(uri);
            if (parsed.domain && !isThirdPartyPlatform(parsed.domain)) {
              discoveredDomains.add(parsed.domain.toLowerCase());
            }
          } catch {
            // Ignore URI parse failures
          }
        }
      }
    }

    // 2. Extract domain mentions from model text
    const domainMatches = responseText.match(/\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|org|net|io|ai|co|in|gov|app|dev))\b/gi);
    if (domainMatches) {
      for (const d of domainMatches) {
        const parsed = parse(d);
        if (parsed.domain && !isThirdPartyPlatform(parsed.domain)) {
          discoveredDomains.add(parsed.domain.toLowerCase());
        }
      }
    }

    if (discoveredDomains.size === 0) {
      return null;
    }

    // Extract official entity name if present
    const nameMatch = responseText.match(/Exact Entity Name:\s*([^\n\r]+)/i);
    const resolvedName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : cleanName;

    const profile: DynamicBrandProfile = {
      entityName: resolvedName,
      officialDomains: Array.from(discoveredDomains),
      isRecognizedEntity: true,
      category: "ORGANIZATION",
      verificationSource: metadata?.webSearchQueries?.length
        ? `Live Google Search Grounding [Query: "${metadata.webSearchQueries[0]}"]`
        : "Live Web & Grounding Telemetry",
      discoveredAt: new Date().toISOString(),
    };

    DYNAMIC_BRAND_CACHE.set(normKey, profile);
    return profile;
  } catch (err: any) {
    console.warn(`[Dynamic Brand Resolver] Live web lookup skipped for "${cleanName}":`, err?.message || err);
    return null;
  }
}

/**
 * Filter out generic social media/directory platforms that host pages but aren't the brand's own domain.
 */
function isThirdPartyPlatform(domain: string): boolean {
  const platforms = new Set([
    "wikipedia.org", "wikimedia.org", "google.com", "bing.com", "yahoo.com",
    "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
    "youtube.com", "reddit.com", "medium.com", "github.com", "crunchbase.com",
    "bloomberg.com", "forbes.com", "reuters.com", "techcrunch.com", "sec.gov"
  ]);
  return platforms.has(domain.toLowerCase());
}
