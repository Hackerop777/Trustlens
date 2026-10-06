import { parse } from "tldts";

/**
 * Restricted Second-Level Domains (ccSLDs) and Chartered gTLDs.
 * 
 * Unlike open generic TLDs (.com, .in, .xyz) where anyone can anonymously register 
 * deceptive domains (e.g. "hdfc-bank.in"), these restricted suffixes are strictly 
 * regulated by statutory authorities and central governments:
 * 
 * - .bank.in: Governed by IDRBT under Reserve Bank of India (RBI) authority.
 *   Only licensed scheduled commercial and cooperative banks can obtain .bank.in.
 * - .bank: Governed by fTLD Registry Services (strict banking verification).
 * - .gov.in / .nic.in: Governed by National Informatics Centre (NIC, Govt. of India).
 * - .gov: Governed by CISA / GSA for verified government bodies.
 * - .ac.in / .edu.in / .edu: Governed by ERNET & Ministries of Education (accredited institutions).
 * - .mil.in / .mil: Armed Forces and Defense.
 * - .res.in: Government of India Autonomous Research Institutes.
 */
export const RESTRICTED_PUBLIC_SUFFIXES = new Set([
  "bank.in",
  "bank",
  "gov.in",
  "nic.in",
  "gov",
  "ac.in",
  "edu.in",
  "edu",
  "mil.in",
  "mil",
  "res.in",
]);

export interface RestrictedDomainInfo {
  isRestricted: boolean;
  publicSuffix?: string;
  entityLabel?: string;
  registeredDomain?: string;
  category?: "BANKING" | "GOVERNMENT" | "EDUCATION" | "MILITARY" | "RESEARCH";
  authority?: string;
}

/**
 * Inspects a hostname to determine if it is registered under a restricted, government-regulated suffix.
 */
export function checkRestrictedDomain(hostname: string): RestrictedDomainInfo {
  const normHost = hostname.toLowerCase().trim();
  const parsed = parse(normHost);

  const suffix = (parsed.publicSuffix || "").toLowerCase();

  if (!suffix || !RESTRICTED_PUBLIC_SUFFIXES.has(suffix)) {
    return { isRestricted: false };
  }

  let category: RestrictedDomainInfo["category"] = "GOVERNMENT";
  let authority = "Government Statutory Registry";

  if (suffix === "bank.in" || suffix === "bank") {
    category = "BANKING";
    authority = suffix === "bank.in" ? "IDRBT / Reserve Bank of India (.bank.in)" : "fTLD Global Banking Registry (.bank)";
  } else if (suffix === "gov.in" || suffix === "nic.in") {
    category = "GOVERNMENT";
    authority = "National Informatics Centre (Govt. of India)";
  } else if (suffix === "gov") {
    category = "GOVERNMENT";
    authority = "CISA Official Government Registry (.gov)";
  } else if (suffix === "ac.in" || suffix === "edu.in" || suffix === "edu") {
    category = "EDUCATION";
    authority = "Ministry of Education / ERNET Accredited Institutions";
  } else if (suffix === "mil.in" || suffix === "mil") {
    category = "MILITARY";
    authority = "Armed Forces / Ministry of Defence";
  } else if (suffix === "res.in") {
    category = "RESEARCH";
    authority = "Government of India Autonomous Research Institutes";
  }

  return {
    isRestricted: true,
    publicSuffix: suffix,
    entityLabel: parsed.domainWithoutSuffix?.toLowerCase() || "",
    registeredDomain: parsed.domain?.toLowerCase() || "",
    category,
    authority,
  };
}
