/**
 * Local DOM Security Sensor for TRUSTLENS Chrome Extension
 * 
 * STRICT PRIVACY CONTRACT:
 * - NEVER reads input values, passwords, OTP digits, or cookies.
 * - Only records structural presence flags (boolean) and public DOM metadata.
 */

import { ExtensionPageSignals, ExtensionScanPayload } from "../types";

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
];

const OTP_FIELD_REGEX = /(?:otp|one[-_\s]?time|verification[-_\s]?code|2fa|security[-_\s]?code)/i;
const PAYMENT_FIELD_REGEX = /(?:card[-_\s]?number|cc[-_\s]?num|cvv|cvc|exp[-_\s]?month|exp[-_\s]?year|credit[-_\s]?card)/i;

/**
 * Executes a lightweight, privacy-guaranteed scan of the current DOM.
 */
export function scanPageDOM(): ExtensionScanPayload {
  // Allow simulation testbed override if data-trustlens-mock-url attribute exists (for testing/hackathon demos)
  const mockUrl = document.documentElement.getAttribute("data-trustlens-mock-url") || document.body?.getAttribute("data-trustlens-mock-url");
  const currentUrl = mockUrl || window.location.href;
  let currentHostname = window.location.hostname;
  if (mockUrl) {
    try {
      currentHostname = new URL(mockUrl).hostname;
    } catch {}
  }

  // 1. Page Metadata
  const title = document.title ? document.title.trim() : "";
  const metaDescEl = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
  const metaDescription = metaDescEl ? metaDescEl.getAttribute("content") || "" : "";

  // 2. Extract Claimed Brand Names
  const claimedBrands = new Set<string>();

  // OpenGraph site name
  const ogSiteNameEl = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteNameEl) {
    const siteName = ogSiteNameEl.getAttribute("content")?.trim();
    if (siteName && siteName.length > 2 && siteName.length < 50) {
      claimedBrands.add(siteName);
    }
  }

  // Schema.org JSON-LD
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script) => {
      try {
        const parsed = JSON.parse(script.textContent || "");
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item) continue;
          const type = String(item["@type"] || "").toLowerCase();
          if (type.includes("organization") || type.includes("corporation") || type.includes("bank")) {
            if (typeof item.name === "string" && item.name.trim().length > 1) {
              claimedBrands.add(item.name.trim());
            }
          }
        }
      } catch {
        // Ignore malformed JSON-LD
      }
    });
  } catch {
    // Ignore querySelector failures
  }

  // Meta author & publisher
  const authorEl = document.querySelector('meta[name="author"]') || document.querySelector('meta[name="publisher"]');
  if (authorEl) {
    const author = authorEl.getAttribute("content")?.trim();
    if (author && author.length > 2 && author.length < 50) {
      claimedBrands.add(author);
    }
  }

  // Check title segments
  if (title) {
    const titleParts = title.split(/[-|:–—/]/).map((p) => p.trim());
    for (const part of titleParts) {
      if (part.length > 2 && part.length < 40 && !/^(home|login|index|welcome|official)$/i.test(part)) {
        claimedBrands.add(part);
      }
    }
  }

  // 3. Form & Input Security Signals (Zero value inspection)
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const hasPasswordField = passwordInputs.length > 0;

  const allInputs = document.querySelectorAll("input");
  let hasOtpField = false;
  let hasPaymentField = false;

  allInputs.forEach((input) => {
    // Check attributes strictly (never read .value)
    const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();
    const name = (input.getAttribute("name") || "").toLowerCase();
    const id = (input.getAttribute("id") || "").toLowerCase();
    const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();

    if (autocomplete === "one-time-code" || OTP_FIELD_REGEX.test(name) || OTP_FIELD_REGEX.test(id) || OTP_FIELD_REGEX.test(placeholder)) {
      hasOtpField = true;
    }

    if (
      autocomplete.includes("cc-") ||
      PAYMENT_FIELD_REGEX.test(name) ||
      PAYMENT_FIELD_REGEX.test(id) ||
      PAYMENT_FIELD_REGEX.test(placeholder)
    ) {
      hasPaymentField = true;
    }
  });

  // Cross-domain form action analysis
  const forms = document.querySelectorAll("form");
  let hasCrossDomainForm = false;
  let externalFormAction: string | undefined;

  forms.forEach((form) => {
    const rawAction = form.getAttribute("action");
    if (rawAction && !rawAction.startsWith("#") && !rawAction.startsWith("javascript:")) {
      try {
        const actionUrl = new URL(rawAction, window.location.href);
        if (actionUrl.hostname && actionUrl.hostname !== currentHostname && !actionUrl.hostname.endsWith(`.${currentHostname}`)) {
          hasCrossDomainForm = true;
          externalFormAction = actionUrl.hostname;
        }
      } catch {
        // Ignore invalid URL
      }
    }
  });

  // 4. Urgency & Social Engineering Detection
  const bodyTextSnippet = (document.body ? document.body.innerText || "" : "").substring(0, 3000);
  const urgencySnippets: string[] = [];

  for (const pattern of URGENCY_PATTERNS) {
    const match = bodyTextSnippet.match(pattern);
    if (match) {
      urgencySnippets.push(match[0]);
    }
  }

  const signals: ExtensionPageSignals = {
    hasPasswordField,
    hasOtpField,
    hasPaymentField,
    hasCrossDomainForm,
    externalFormAction,
    urgencyDetected: urgencySnippets.length > 0,
    urgencySnippets: urgencySnippets.slice(0, 3),
    inputCount: allInputs.length,
    formCount: forms.length,
  };

  return {
    url: currentUrl,
    hostname: currentHostname,
    page: {
      title,
      metaDescription,
      claimedBrands: Array.from(claimedBrands).slice(0, 5),
      snippet: bodyTextSnippet.substring(0, 300),
    },
    signals,
  };
}
