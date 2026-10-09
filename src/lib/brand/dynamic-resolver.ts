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

// In-memory runtime cache for dynamically resolved brands (instant 0ms on cache hit)
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
 * Resolves a claimed brand/company identity dynamically across the live internet:
 * - Tier 1A: Live Google Search Grounding (gemini-3.8-flash with googleSearch tool)
 * - Tier 1B: High-speed Structured LLM Knowledge (gemini-3.5-flash-lite, <40 tokens)
 * 
 * Complies strictly with model standard: only gemini-3.8-flash and gemini-3.5-flash-lite.
 */
export async function resolveBrandViaLiveWeb(brandCandidate: string): Promise<DynamicBrandProfile | null> {
  const cleanName = brandCandidate.trim();
  const normKey = normalizeKey(cleanName);

  if (!cleanName || cleanName.length < 3 || cleanName.length > 60 || GENERIC_EXCLUSIONS.has(normKey)) {
    return null;
  }

  // 1. Check in-memory dynamic cache (0ms instant retrieval)
  if (DYNAMIC_BRAND_CACHE.has(normKey)) {
    return DYNAMIC_BRAND_CACHE.get(normKey)!;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const discoveredDomains = new Set<string>();
  let verificationSource = "Live Web Intelligence";
  let resolvedName = cleanName;

  // -------------------------------------------------------------
  // STRATEGY 1: Live Google Search Grounding via gemini-3.8-flash
  // -------------------------------------------------------------
  try {
    const searchPrompt = `Search the live public web to identify the authentic official primary website domain(s) for the organization or brand: "${cleanName}".
Provide exact entity name and official primary domains.`;

    const searchPromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), 6000)
    );

    const searchResponse: any = await Promise.race([searchPromise, timeoutPromise]);

    const metadata = searchResponse.candidates?.[0]?.groundingMetadata;
    const responseText = searchResponse.text || "";

    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        const uri = chunk.web?.uri;
        if (uri) {
          try {
            const parsed = parse(uri);
            if (parsed.domain && !isThirdPartyPlatform(parsed.domain, cleanName)) {
              discoveredDomains.add(parsed.domain.toLowerCase());
            }
          } catch {}
        }
      }
    }

    const domainMatches = responseText.match(/\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|org|net|io|ai|co|in|gov|app|dev|so|site|store))\b/gi);
    if (domainMatches) {
      for (const d of domainMatches) {
        const parsed = parse(d);
        if (parsed.domain && !isThirdPartyPlatform(parsed.domain, cleanName)) {
          discoveredDomains.add(parsed.domain.toLowerCase());
        }
      }
    }

    if (discoveredDomains.size > 0) {
      verificationSource = metadata?.webSearchQueries?.length
        ? `Live Google Search Grounding [Query: "${metadata.webSearchQueries[0]}"]`
        : "Live Google Search Grounding";
    }
  } catch (searchErr: any) {
    // If Google Search Grounding quota/rate limit is hit (429) or unavailable, proceed seamlessly to Strategy 2
  }

  // -------------------------------------------------------------------
  // STRATEGY 2: Ultra-Fast LLM Knowledge Retrieval via gemini-3.5-flash-lite
  // -------------------------------------------------------------------
  if (discoveredDomains.size === 0) {
    try {
      const fallbackPrompt = `Identify the official primary registered website domains for the real-world company or brand: "${cleanName}".
Return ONLY a JSON array of registered domain strings (e.g. ["example.com"]). If unknown or not a real company, return [].`;

      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: fallbackPrompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 120, // Low-token optimization
        },
      });

      const jsonText = fallbackResponse.text?.trim() || "[]";
      const parsedArray = JSON.parse(jsonText);

      if (Array.isArray(parsedArray)) {
        for (const item of parsedArray) {
          if (typeof item === "string") {
            const parsed = parse(item);
            if (parsed.domain && !isThirdPartyPlatform(parsed.domain, cleanName)) {
              discoveredDomains.add(parsed.domain.toLowerCase());
            }
          }
        }
      }

      if (discoveredDomains.size > 0) {
        verificationSource = "Gemini Cyber Intelligence (Multi-Platform Knowledge Graph)";
      }
    } catch (fallbackErr: any) {
      console.warn(`[Dynamic Brand Resolver] Could not dynamically resolve "${cleanName}":`, fallbackErr?.message || fallbackErr);
    }
  }

  if (discoveredDomains.size === 0) {
    return null;
  }

  const profile: DynamicBrandProfile = {
    entityName: resolvedName,
    officialDomains: Array.from(discoveredDomains),
    isRecognizedEntity: true,
    category: "ORGANIZATION",
    verificationSource,
    discoveredAt: new Date().toISOString(),
  };

  DYNAMIC_BRAND_CACHE.set(normKey, profile);
  return profile;
}

/**
 * Filter out generic social media/directory platforms that host pages but aren't the brand's own domain.
 * If the candidate brand is the platform itself (e.g. YouTube, Google, GitHub, LinkedIn), it is not excluded.
 */
function isThirdPartyPlatform(domain: string, candidateBrand?: string): boolean {
  const normDom = domain.toLowerCase();
  if (candidateBrand) {
    const cleanCand = candidateBrand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const domBase = normDom.split(".")[0];
    if (cleanCand.includes(domBase) || domBase.includes(cleanCand)) {
      return false;
    }
  }
  const platforms = new Set([
    "wikipedia.org", "wikimedia.org", "google.com", "bing.com", "yahoo.com",
    "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
    "youtube.com", "reddit.com", "medium.com", "github.com", "crunchbase.com",
    "bloomberg.com", "forbes.com", "reuters.com", "techcrunch.com", "sec.gov"
  ]);
  return platforms.has(normDom);
}
