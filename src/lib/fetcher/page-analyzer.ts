import * as cheerio from "cheerio";
import { parse } from "tldts";
import { PageAnalysis, SecurityForm } from "../types";

const URGENCY_PATTERNS = [
  /account (?:suspended|blocked|frozen|disabled|locked)/i,
  /(?:immediate|urgent|mandatory) action required/i,
  /(?:within|in) (?:24|48|12) hours/i,
  /kyc (?:expired|pending|verification needed)/i,
  /unauthorized (?:activity|transaction|access) detected/i,
  /security alert/i,
  /verify (?:now|immediately|identity)/i,
  /confirm your identity to prevent closure/i,
  /failure to verify will result in/i,
  /claim your (?:refund|prize|reward|compensation)/i,
  /limited time only/i,
];

const SOCIAL_ENGINEERING_TERMS = [
  "kyc",
  "aadhaar",
  "pan card",
  "ssn",
  "social security",
  "lottery",
  "cashback",
  "refund",
  "tax refund",
  "crypto giveaway",
  "dear customer",
  "valuable user",
  "bank alert",
  "beneficiary",
];

/**
 * Parses safe HTML and extracts security-relevant DOM signals, forms, and social engineering indicators.
 */
export function analyzePageContent(html: string, pageUrl: string): PageAnalysis {
  if (!html) {
    return {
      finalUrl: pageUrl,
      httpStatus: 200,
      contentType: "text/html",
      redirectChain: [],
      title: "",
      metaDescription: "",
      claimedBrandCandidates: [],
      forms: [],
      hasCredentialForm: false,
      hasOtpForm: false,
      hasPaymentForm: false,
      hasCrossDomainForm: false,
      urgencyIndicators: [],
      socialEngineeringKeywords: [],
      iframeCount: 0,
      scriptCount: 0,
      sanitizedTextSnippet: "",
    };
  }

  const $ = cheerio.load(html);

  // 1. Extract Schema.org JSON-LD structured organization data BEFORE removing scripts
  const brandCandidates = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item) continue;
        const type = String(item["@type"] || "").toLowerCase();
        if (type.includes("organization") || type.includes("corporation") || type.includes("bank") || type.includes("company")) {
          if (typeof item.name === "string" && item.name.trim().length > 1) {
            brandCandidates.add(item.name.trim());
          }
          if (typeof item.legalName === "string" && item.legalName.trim().length > 1) {
            brandCandidates.add(item.legalName.trim());
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD
    }
  });

  // Extract author / publisher / application-name / copyright meta tags
  const metaAuthor = $('meta[name="author"]').attr("content")?.trim();
  const metaPublisher = $('meta[name="publisher"]').attr("content")?.trim();
  const metaAppName = $('meta[name="application-name"]').attr("content")?.trim();
  if (metaAuthor && metaAuthor.length < 50) brandCandidates.add(metaAuthor);
  if (metaPublisher && metaPublisher.length < 50) brandCandidates.add(metaPublisher);
  if (metaAppName && metaAppName.length < 50) brandCandidates.add(metaAppName);

  // Match copyright notice in raw HTML (e.g. "© 2026 Anthropic" or "Copyright OpenAI")
  const copyrightMatch = html.match(/(?:©|copyright|\(c\))\s*(?:\d{4})?\s*([A-Za-z0-9\s.,]{3,35}?)(?:(?:all\s+rights\s+reserved)|inc|llc|pbc|ltd|\.|\n|<)/i);
  if (copyrightMatch && copyrightMatch[1]) {
    const cleanCr = copyrightMatch[1].replace(/inc|llc|pbc|ltd|corp/gi, "").trim();
    if (cleanCr.length >= 3 && cleanCr.length <= 35 && !/^(all|the|our|your)$/i.test(cleanCr)) {
      brandCandidates.add(cleanCr);
    }
  }

  // Remove dangerous or noise elements before text extraction
  $("script, style, noscript, svg, object, embed, iframe").remove();

  // 2. Metadata
  const title = $("title").first().text().trim() || "";
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  if (ogSiteName) brandCandidates.add(ogSiteName);

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  if (ogTitle && ogTitle.length < 60) brandCandidates.add(ogTitle);

  // Check title
  if (title) {
    if (title.length < 60) {
      brandCandidates.add(title);
    }
    const titleParts = title.split(/[-|:–—/]/).map((p) => p.trim());
    for (const part of titleParts) {
      if (part.length > 2 && part.length < 50 && !/^(home|login|index|welcome)$/i.test(part)) {
        brandCandidates.add(part);
      }
    }
  }

  // Check top headings (h1, h2)
  $("h1, h2").slice(0, 3).each((_, el) => {
    const heading = $(el).text().trim();
    if (heading.length > 2 && heading.length < 50) {
      brandCandidates.add(heading);
    }
  });

  // Check logo images or prominent header texts
  $('img[alt*="logo" i], img[class*="logo" i], img[id*="logo" i]').each((_, el) => {
    const alt = $(el).attr("alt")?.trim();
    if (alt && alt.length > 2 && alt.length < 40) {
      const cleanAlt = alt.replace(/logo/i, "").trim();
      if (cleanAlt) brandCandidates.add(cleanAlt);
    }
  });

  // 3. Form Analysis
  const pageOrigin = new URL(pageUrl).origin;
  const pageDomainParsed = parse(pageUrl);
  const pageRootDomain = pageDomainParsed.domain || "";

  const forms: SecurityForm[] = [];
  let hasCredentialForm = false;
  let hasOtpForm = false;
  let hasPaymentForm = false;
  let hasCrossDomainForm = false;

  $("form").each((idx, formEl) => {
    const $form = $(formEl);
    const rawAction = $form.attr("action")?.trim() || "";
    const method = ($form.attr("method") || "GET").toUpperCase();

    let resolvedAction = rawAction;
    let isCrossDomain = false;

    if (rawAction) {
      try {
        const actionUrl = new URL(rawAction, pageUrl);
        resolvedAction = actionUrl.toString();
        const actionDomainParsed = parse(actionUrl.hostname);
        const actionRootDomain = actionDomainParsed.domain || "";

        if (actionRootDomain && pageRootDomain && actionRootDomain !== pageRootDomain) {
          isCrossDomain = true;
          hasCrossDomainForm = true;
        }
      } catch {
        resolvedAction = rawAction;
      }
    }

    const fieldNames: string[] = [];
    let hasPasswordInput = false;
    let hasOtpInput = false;
    let hasPaymentInput = false;

    $form.find("input, select, textarea").each((_, inputEl) => {
      const $input = $(inputEl);
      const type = ($input.attr("type") || "text").toLowerCase();
      const name = ($input.attr("name") || "").toLowerCase();
      const id = ($input.attr("id") || "").toLowerCase();
      const placeholder = ($input.attr("placeholder") || "").toLowerCase();
      const labelText = $input.closest("label").text().toLowerCase();

      const combinedIdentifiers = `${name} ${id} ${placeholder} ${labelText}`;
      if (name) fieldNames.push(name);
      else if (id) fieldNames.push(id);

      if (type === "password" || combinedIdentifiers.includes("password") || combinedIdentifiers.includes("passwd")) {
        hasPasswordInput = true;
        hasCredentialForm = true;
      }

      if (
        combinedIdentifiers.includes("otp") ||
        combinedIdentifiers.includes("one time password") ||
        combinedIdentifiers.includes("verification code") ||
        combinedIdentifiers.includes("security code") ||
        combinedIdentifiers.includes("2fa") ||
        combinedIdentifiers.includes("mfa")
      ) {
        hasOtpInput = true;
        hasOtpForm = true;
      }

      if (
        combinedIdentifiers.includes("card") ||
        combinedIdentifiers.includes("cvv") ||
        combinedIdentifiers.includes("cvc") ||
        combinedIdentifiers.includes("expiry") ||
        combinedIdentifiers.includes("upi") ||
        combinedIdentifiers.includes("vpa") ||
        combinedIdentifiers.includes("bank account") ||
        combinedIdentifiers.includes("credit card")
      ) {
        hasPaymentInput = true;
        hasPaymentForm = true;
      }
    });

    forms.push({
      id: $form.attr("id") || `form-${idx + 1}`,
      action: resolvedAction,
      method,
      isCrossDomain,
      hasPasswordInput,
      hasOtpInput,
      hasPaymentInput,
      fieldNames,
    });
  });

  // 4. Urgency & Social Engineering Analysis
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const urgencyIndicators: string[] = [];
  const socialEngineeringKeywords: string[] = [];

  for (const pattern of URGENCY_PATTERNS) {
    const match = bodyText.match(pattern);
    if (match) {
      urgencyIndicators.push(match[0].trim());
    }
  }

  const lowerBody = bodyText.toLowerCase();
  for (const kw of SOCIAL_ENGINEERING_TERMS) {
    if (lowerBody.includes(kw)) {
      socialEngineeringKeywords.push(kw);
    }
  }

  // 5. Structure counts
  const iframeCount = $("iframe").length;
  const scriptCount = $("script").length;

  // Sanitized text snippet capped at 3000 chars for safe inspection
  const sanitizedTextSnippet = bodyText.slice(0, 3000);

  return {
    finalUrl: pageUrl,
    httpStatus: 200,
    contentType: "text/html",
    redirectChain: [],
    title,
    metaDescription,
    ogSiteName,
    claimedBrandCandidates: Array.from(brandCandidates),
    forms,
    hasCredentialForm,
    hasOtpForm,
    hasPaymentForm,
    hasCrossDomainForm,
    urgencyIndicators,
    socialEngineeringKeywords,
    iframeCount,
    scriptCount,
    sanitizedTextSnippet,
  };
}
