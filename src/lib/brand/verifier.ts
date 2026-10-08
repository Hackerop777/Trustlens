import { BRAND_REGISTRY, BrandProfile } from "./registry";
import { BrandVerification } from "../types";
import { checkRestrictedDomain } from "../domain/restricted-tlds";

/**
 * Normalizes text for brand matching.
 */
function cleanText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Attempts to match a list of claimed brand cues against the authoritative registry.
 */
export function findMatchingBrandProfile(candidates: string[]): BrandProfile | null {
  for (const candidate of candidates) {
    const cleanCand = cleanText(candidate);
    if (!cleanCand || cleanCand.length < 3) continue;

    for (const profile of BRAND_REGISTRY) {
      const cleanPrimary = cleanText(profile.primaryName);
      if (cleanCand === cleanPrimary) {
        return profile;
      }
      // Check if candidate contains primary brand as a whole word (e.g. "welcome to hdfc bank")
      const primaryRegex = new RegExp(`\\b${cleanPrimary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (primaryRegex.test(cleanCand)) {
        return profile;
      }

      for (const alias of profile.aliases) {
        const cleanAlias = cleanText(alias);
        if (!cleanAlias || cleanAlias.length < 3) continue;

        // Exact match
        if (cleanCand === cleanAlias) {
          return profile;
        }

        // Whole-word match in candidate (e.g. candidate is page text: "log into icici direct")
        const aliasRegex = new RegExp(`\\b${cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (aliasRegex.test(cleanCand)) {
          return profile;
        }
      }
    }
  }
  return null;
}

/**
 * Authoritatively verifies whether the observed domain corresponds to the claimed brand.
 */
export function verifyBrandDomain(
  claimedBrandCandidates: string[],
  observedDomain: string
): BrandVerification {
  const normObservedDomain = observedDomain.toLowerCase().trim();
  const matchedProfile = findMatchingBrandProfile(claimedBrandCandidates);
  const restrictedInfo = checkRestrictedDomain(normObservedDomain);

  // If no authoritative profile matches the claimed candidates:
  if (!matchedProfile) {
    const primaryCandidate = claimedBrandCandidates[0] || "Unknown Organization";

    // If hosted on a restricted statutory domain (.bank.in, .gov.in, .ac.in, etc.) or Corporate Brand TLD (.apple, .google, .chase, etc.)
    if (restrictedInfo.isRestricted) {
      if (restrictedInfo.category === "BRAND_TLD") {
        return {
          claimedBrand: restrictedInfo.brandName || primaryCandidate,
          observedDomain: normObservedDomain,
          expectedDomains: [restrictedInfo.registeredDomain || normObservedDomain],
          status: "MATCH",
          confidence: "high",
          reason: `Domain '${normObservedDomain}' is an authentic corporate Brand TLD (.${restrictedInfo.publicSuffix}) exclusively owned and operated by ${restrictedInfo.brandName}. Cannot be registered by unauthorized parties.`,
          verificationSource: restrictedInfo.authority || "ICANN Corporate Brand Registry",
        };
      }

      return {
        claimedBrand: primaryCandidate,
        observedDomain: normObservedDomain,
        expectedDomains: [restrictedInfo.registeredDomain || normObservedDomain],
        status: "MATCH",
        confidence: "high",
        reason: `Domain '${normObservedDomain}' is chartered under ${restrictedInfo.authority}. Regulated statutory domain cannot be forged or registered by unauthorized parties.`,
        verificationSource: restrictedInfo.authority || "Government Statutory Registry",
      };
    }

    return {
      claimedBrand: primaryCandidate,
      observedDomain: normObservedDomain,
      expectedDomains: [],
      status: "UNKNOWN",
      confidence: "low",
      reason: `The entity claimed ('${primaryCandidate}') is not indexed in the authoritative brand registry. Identity cannot be definitively established.`,
      verificationSource: "TRUSTLENS Authoritative Brand Verifier",
    };
  }

  // Check if observed domain matches any legitimate domain for this profile
  let isMatch = matchedProfile.legitimateDomains.some((legit) => {
    return normObservedDomain === legit || normObservedDomain.endsWith(`.${legit}`);
  });

  // If claimed brand matches a corporate Brand TLD (.apple, .google, .microsoft, .chase, etc.)
  if (!isMatch && restrictedInfo.isRestricted && restrictedInfo.category === "BRAND_TLD") {
    if (
      restrictedInfo.brandName &&
      (cleanText(matchedProfile.primaryName).includes(cleanText(restrictedInfo.brandName)) ||
        cleanText(restrictedInfo.brandName).includes(cleanText(matchedProfile.primaryName)) ||
        matchedProfile.aliases.some((a) => cleanText(a).includes(cleanText(restrictedInfo.brandName!))))
    ) {
      isMatch = true;
    }
  }

  // If claimed brand matches a bank and domain is under restricted .bank.in with matching entity label
  if (!isMatch && restrictedInfo.isRestricted && restrictedInfo.entityLabel) {
    const cleanBrandName = cleanText(matchedProfile.primaryName);
    const labelMatches = cleanBrandName.includes(restrictedInfo.entityLabel) || 
      matchedProfile.aliases.some(a => cleanText(a).includes(restrictedInfo.entityLabel!));
    if (labelMatches) {
      isMatch = true;
    }
  }

  if (isMatch) {
    return {
      claimedBrand: matchedProfile.primaryName,
      observedDomain: normObservedDomain,
      expectedDomains: matchedProfile.legitimateDomains,
      status: "MATCH",
      confidence: "high",
      reason: `Domain '${normObservedDomain}' is verified as an official, authoritative domain for ${matchedProfile.primaryName}.`,
      verificationSource: matchedProfile.authoritativeSource,
    };
  } else {
    return {
      claimedBrand: matchedProfile.primaryName,
      observedDomain: normObservedDomain,
      expectedDomains: matchedProfile.legitimateDomains,
      status: "MISMATCH",
      confidence: "high",
      reason: `IMPERSONATION DETECTED: The page claims to represent '${matchedProfile.primaryName}', but is hosted on '${normObservedDomain}'. Authentic domains are [${matchedProfile.legitimateDomains.join(", ")}].`,
      verificationSource: matchedProfile.authoritativeSource,
    };
  }
}

import { resolveBrandViaLiveWeb } from "./dynamic-resolver";

/**
 * Async brand verifier: first checks authoritative registry; if UNKNOWN, searches the live internet
 * using Google Search Grounding to discover legitimate domains for the claimed organization.
 */
export async function verifyBrandDomainAsync(
  claimedBrandCandidates: string[],
  observedDomain: string
): Promise<BrandVerification> {
  const syncResult = verifyBrandDomain(claimedBrandCandidates, observedDomain);

  // If local authoritative registry produced a definitive MATCH or MISMATCH, return immediately
  if (syncResult.status === "MATCH" || syncResult.status === "MISMATCH") {
    return syncResult;
  }

  // If UNKNOWN, trigger live web search grounding across candidate names
  const normObservedDomain = observedDomain.toLowerCase().trim();
  for (const candidate of claimedBrandCandidates.slice(0, 3)) {
    try {
      const liveProfile = await resolveBrandViaLiveWeb(candidate);
      if (liveProfile && liveProfile.officialDomains.length > 0) {
        const isMatch = liveProfile.officialDomains.some((legit) => {
          return normObservedDomain === legit || normObservedDomain.endsWith(`.${legit}`);
        });

        if (isMatch) {
          return {
            claimedBrand: liveProfile.entityName,
            observedDomain: normObservedDomain,
            expectedDomains: liveProfile.officialDomains,
            status: "MATCH",
            confidence: "high",
            reason: `Domain '${normObservedDomain}' is verified as an official, authoritative domain for ${liveProfile.entityName} via live internet search intelligence.`,
            verificationSource: liveProfile.verificationSource,
          };
        } else {
          return {
            claimedBrand: liveProfile.entityName,
            observedDomain: normObservedDomain,
            expectedDomains: liveProfile.officialDomains,
            status: "MISMATCH",
            confidence: "high",
            reason: `IMPERSONATION DETECTED via live internet grounding: The page claims to represent '${liveProfile.entityName}', but official web domains are [${liveProfile.officialDomains.join(", ")}]. Observed host '${normObservedDomain}' does not match.`,
            verificationSource: liveProfile.verificationSource,
          };
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return syncResult;
}

