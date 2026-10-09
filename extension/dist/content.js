"use strict";
(() => {
  // extension/src/scanner/local-scanner.ts
  var URGENCY_PATTERNS = [
    /account (?:suspended|blocked|frozen|disabled|locked)/i,
    /(?:immediate|urgent|mandatory) action required/i,
    /(?:within|in) (?:24|48|12) hours/i,
    /kyc (?:expired|pending|verification needed)/i,
    /unauthorized (?:activity|transaction|access) detected/i,
    /security alert/i,
    /verify (?:now|immediately|identity)/i,
    /confirm your identity to prevent closure/i,
    /failure to verify will result in/i
  ];
  var OTP_FIELD_REGEX = /(?:otp|one[-_\s]?time|verification[-_\s]?code|2fa|security[-_\s]?code)/i;
  var PAYMENT_FIELD_REGEX = /(?:card[-_\s]?number|cc[-_\s]?num|cvv|cvc|exp[-_\s]?month|exp[-_\s]?year|credit[-_\s]?card)/i;
  function scanPageDOM() {
    const mockUrl = document.documentElement.getAttribute("data-trustlens-mock-url") || document.body?.getAttribute("data-trustlens-mock-url");
    const currentUrl = mockUrl || window.location.href;
    let currentHostname = window.location.hostname;
    if (mockUrl) {
      try {
        currentHostname = new URL(mockUrl).hostname;
      } catch {
      }
    }
    const title = document.title ? document.title.trim() : "";
    const metaDescEl = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
    const metaDescription = metaDescEl ? metaDescEl.getAttribute("content") || "" : "";
    const claimedBrands = /* @__PURE__ */ new Set();
    const ogSiteNameEl = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteNameEl) {
      const siteName = ogSiteNameEl.getAttribute("content")?.trim();
      if (siteName && siteName.length > 2 && siteName.length < 50) {
        claimedBrands.add(siteName);
      }
    }
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
        }
      });
    } catch {
    }
    const authorEl = document.querySelector('meta[name="author"]') || document.querySelector('meta[name="publisher"]');
    if (authorEl) {
      const author = authorEl.getAttribute("content")?.trim();
      if (author && author.length > 2 && author.length < 50) {
        claimedBrands.add(author);
      }
    }
    if (title) {
      const titleParts = title.split(/[-|:–—/]/).map((p) => p.trim());
      for (const part of titleParts) {
        if (part.length > 2 && part.length < 40 && !/^(home|login|index|welcome|official)$/i.test(part)) {
          claimedBrands.add(part);
        }
      }
    }
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const hasPasswordField = passwordInputs.length > 0;
    const allInputs = document.querySelectorAll("input");
    let hasOtpField = false;
    let hasPaymentField = false;
    allInputs.forEach((input) => {
      const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();
      const name = (input.getAttribute("name") || "").toLowerCase();
      const id = (input.getAttribute("id") || "").toLowerCase();
      const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();
      if (autocomplete === "one-time-code" || OTP_FIELD_REGEX.test(name) || OTP_FIELD_REGEX.test(id) || OTP_FIELD_REGEX.test(placeholder)) {
        hasOtpField = true;
      }
      if (autocomplete.includes("cc-") || PAYMENT_FIELD_REGEX.test(name) || PAYMENT_FIELD_REGEX.test(id) || PAYMENT_FIELD_REGEX.test(placeholder)) {
        hasPaymentField = true;
      }
    });
    const forms = document.querySelectorAll("form");
    let hasCrossDomainForm = false;
    let externalFormAction;
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
        }
      }
    });
    const bodyTextSnippet = (document.body ? document.body.innerText || "" : "").substring(0, 3e3);
    const urgencySnippets = [];
    for (const pattern of URGENCY_PATTERNS) {
      const match = bodyTextSnippet.match(pattern);
      if (match) {
        urgencySnippets.push(match[0]);
      }
    }
    const signals = {
      hasPasswordField,
      hasOtpField,
      hasPaymentField,
      hasCrossDomainForm,
      externalFormAction,
      urgencyDetected: urgencySnippets.length > 0,
      urgencySnippets: urgencySnippets.slice(0, 3),
      inputCount: allInputs.length,
      formCount: forms.length
    };
    return {
      url: currentUrl,
      hostname: currentHostname,
      page: {
        title,
        metaDescription,
        claimedBrands: Array.from(claimedBrands).slice(0, 5),
        snippet: bodyTextSnippet.substring(0, 300)
      },
      signals
    };
  }

  // extension/src/content.ts
  var currentAnalysis = null;
  var warningBannerEl = null;
  var lastScannedUrl = "";
  var lastScanTimestamp = 0;
  var mutationDebounceTimer = null;
  var lastFingerprint = {
    hasPasswordField: false,
    hasOtpField: false,
    hasPaymentField: false,
    hasCrossDomainForm: false,
    inputCount: 0,
    formCount: 0
  };
  var RESCAN_COOLDOWN_MS = 8e3;
  var DEBOUNCE_DELAY_MS = 1500;
  function isBannerDismissed() {
    try {
      return sessionStorage.getItem(`tl_dismissed_${window.location.hostname}`) === "true";
    } catch {
      return false;
    }
  }
  function setBannerDismissed() {
    try {
      sessionStorage.setItem(`tl_dismissed_${window.location.hostname}`, "true");
    } catch {
    }
  }
  function runScan(force = false) {
    if (window.location.protocol === "chrome:" || window.location.protocol === "chrome-extension:") {
      return;
    }
    const isMockDemo = !!(document.documentElement.getAttribute("data-trustlens-mock-url") || document.body?.getAttribute("data-trustlens-mock-url"));
    if (!isMockDemo && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.endsWith(".local"))) {
      return;
    }
    const currentUrl = window.location.href;
    const now = Date.now();
    if (!force && currentUrl === lastScannedUrl && now - lastScanTimestamp < RESCAN_COOLDOWN_MS) {
      return;
    }
    const payload = scanPageDOM();
    lastScannedUrl = currentUrl;
    lastScanTimestamp = now;
    lastFingerprint = {
      hasPasswordField: payload.signals.hasPasswordField,
      hasOtpField: payload.signals.hasOtpField,
      hasPaymentField: payload.signals.hasPaymentField,
      hasCrossDomainForm: payload.signals.hasCrossDomainForm,
      inputCount: payload.signals.inputCount,
      formCount: payload.signals.formCount
    };
    try {
      chrome.runtime.sendMessage({ type: "PAGE_SCANNED", payload }, (response) => {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response && response.analysis) {
          handleAnalysisResult(response.analysis, response.showWarnings !== false);
        }
      });
    } catch {
    }
  }
  function handleAnalysisResult(analysis, allowWarnings = true) {
    currentAnalysis = analysis;
    if ((analysis.classification === "CRITICAL" || analysis.classification === "HIGH") && allowWarnings) {
      if (!isBannerDismissed()) {
        showWarningBanner(analysis);
      }
    } else {
      removeWarningBanner();
    }
  }
  function showWarningBanner(analysis) {
    if (warningBannerEl) {
      updateBannerContent(analysis);
      return;
    }
    const banner = document.createElement("div");
    banner.id = "trustlens-security-banner";
    banner.setAttribute(
      "style",
      `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    width: 382px;
    max-width: calc(100vw - 32px);
    background: radial-gradient(135% 125% at 50% -15%, rgba(45, 92, 75, 0.78) 0%, rgba(28, 64, 52, 0.76) 35%, rgba(18, 42, 38, 0.78) 70%, rgba(12, 24, 24, 0.84) 100%);
    backdrop-filter: blur(48px) saturate(210%);
    -webkit-backdrop-filter: blur(48px) saturate(210%);
    border: 1px solid rgba(52, 211, 153, 0.20);
    border-top: 1px solid rgba(167, 243, 208, 0.45);
    box-shadow: 
      0 32px 64px -12px rgba(0, 0, 0, 0.75),
      0 16px 32px -8px rgba(0, 0, 0, 0.55),
      0 0 40px -10px rgba(16, 185, 129, 0.15),
      inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.40),
      inset 0 -1px 1px 0 rgba(0, 0, 0, 0.50);
    border-radius: 26px;
    padding: 22px 24px 20px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #F3F4F6;
    display: flex;
    flex-direction: column;
    animation: trustlens-float-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    box-sizing: border-box;
  `
    );
    const styleEl = document.createElement("style");
    styleEl.textContent = `
    @keyframes trustlens-float-in {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    #trustlens-security-banner * {
      box-sizing: border-box;
    }
    #trustlens-safety-btn:hover {
      background: #1E3760 !important;
      border-color: rgba(255, 255, 255, 0.28) !important;
      box-shadow: 0 6px 18px rgba(10, 20, 35, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.20) !important;
    }
    #trustlens-safety-btn:active {
      transform: scale(0.985);
    }
    #trustlens-ignore-btn:hover, #trustlens-report-btn:hover {
      color: #F1F5F9 !important;
    }
    #trustlens-close-btn:hover {
      color: #FFFFFF !important;
      opacity: 1 !important;
    }
  `;
    document.head.appendChild(styleEl);
    const scoreText = `${analysis.riskScore || 100}/100`;
    const cleanHost = (h) => (h || "").toLowerCase().trim().replace(/^www\./, "");
    const currentHost = window.location.hostname || "current site";
    const cleanCurrent = cleanHost(currentHost);
    const claimedBrandName = analysis.brandClaim?.claimedBrand || "official site";
    const expectedDomain = analysis.brandClaim?.expectedDomain || claimedBrandName.toLowerCase().replace(/\s+/g, "") + ".com";
    const cleanExpected = cleanHost(expectedDomain);
    const isDomainMatch = analysis.brandClaim?.isMatch === true || analysis.brandClaim?.status === "MATCH" || cleanCurrent === cleanExpected || cleanCurrent.endsWith(`.${cleanExpected}`);
    let fakeDomainMarkup = `The URL <span style="background: rgba(239, 68, 68, 0.22); color: #FCA5A5; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">'${escapeHtml(currentHost)}'</span> does not match the official <span style="background: rgba(239, 68, 68, 0.22); color: #FCA5A5; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">'${escapeHtml(expectedDomain)}'</span> domain.`;
    if (isDomainMatch) {
      fakeDomainMarkup = `The domain <span style="background: rgba(16, 185, 129, 0.22); color: #6EE7B7; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 12px;">'${escapeHtml(currentHost)}'</span> matches official identity, but suspicious activity was flagged.`;
    }
    let unverifiedFieldsMarkup = `Detects attempts to harvest passwords and 2FA codes on this unverified domain.`;
    if (analysis.topSignals && analysis.topSignals.length > 0) {
      const credSignal = analysis.topSignals.find((s) => s.toLowerCase().includes("password") || s.toLowerCase().includes("otp") || s.toLowerCase().includes("credential") || s.toLowerCase().includes("form"));
      if (credSignal) {
        unverifiedFieldsMarkup = escapeHtml(credSignal);
      }
    }
    banner.innerHTML = `
    <!-- Top Row: Hex Logo + Title & Capsule Badges -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <!-- Brand on Left -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
          <circle cx="12" cy="12" r="10.5" stroke="#38BDF8" stroke-width="1.8" fill="rgba(14, 165, 233, 0.15)"/>
          <path d="M12 6.5V17.5M7.5 12H16.5" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="12" cy="12" r="3" fill="#38BDF8"/>
        </svg>
        <span style="font-weight: 700; font-size: 13px; letter-spacing: 0.08em; color: #FFFFFF;">TRUSTLENS</span>
      </div>

      <!-- Badges on Right -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 10.5px; font-weight: 600; color: #D1D5DB; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.12); padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.04em;">
          INVESTIGATION ALERT
        </span>
        <span style="font-size: 10.5px; font-weight: 600; color: #E5E7EB; background: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.12); padding: 3px 9px; border-radius: 9999px; font-variant-numeric: tabular-nums;">
          ${scoreText}
        </span>
        <button id="trustlens-close-btn" title="Dismiss" style="background: transparent; border: none; color: #9CA3AF; cursor: pointer; font-size: 13px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0; margin-left: 2px;">\u2715</button>
      </div>
    </div>

    <!-- Title Row -->
    <div style="font-size: 20px; font-weight: 600; color: #FFFFFF; line-height: 1.35; margin-bottom: 18px; letter-spacing: -0.01em;">
      ${isDomainMatch ? "Suspicious Activity<br>Detected" : "Potential Impersonation<br>Detected"}
    </div>

    <!-- Threat Bullets -->
    <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
      <!-- Bullet 1: Domain Check -->
      <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.5; color: #D1D5DB;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; margin-top: 2px;">
          <path d="M12 3L2 21H22L12 3Z" stroke="${isDomainMatch ? "#34D399" : "#F87171"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 9V13M12 17H12.01" stroke="${isDomainMatch ? "#34D399" : "#F87171"}" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <span style="font-weight: 600; color: #FFFFFF;">${isDomainMatch ? "Domain Status:" : "Fake Domain:"}</span> ${fakeDomainMarkup}
        </div>
      </div>

      <!-- Bullet 2: Unverified Fields -->
      <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.5; color: #D1D5DB;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0; margin-top: 2px;">
          <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 2V8H20" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 13H15M9 17H13" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <span style="font-weight: 600; color: #FFFFFF;">Unverified Fields:</span> ${unverifiedFieldsMarkup}
        </div>
      </div>
    </div>

    <!-- Primary Action: Go Back to Safety Button -->
    <button id="trustlens-safety-btn" style="width: 100%; background: #1B2F52; color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.15); font-size: 14.5px; font-weight: 500; padding: 12px 18px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(10, 20, 35, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12); margin-bottom: 12px;">
      Go Back to Safety
    </button>

    <!-- Secondary Actions Row: Ignore & Continue (Unsafe) | View Detailed Report -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: #94A3B8; margin-bottom: 16px;">
      <span id="trustlens-ignore-btn" style="cursor: pointer; text-decoration: underline; text-underline-offset: 3px; color: #94A3B8;">Ignore & Continue (Unsafe)</span>
      <span style="opacity: 0.5;">|</span>
      <a id="trustlens-report-btn" href="${analysis.reportUrl}" target="_blank" style="cursor: pointer; color: #94A3B8; text-decoration: underline; text-underline-offset: 3px;">View Detailed Report</a>
    </div>

    <!-- Subtle Footer: \u{1F6E1} Protected by TrustLens -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11.5px; color: #64748B;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 5V11C4 16.52 7.42 21.62 12 22C16.58 21.62 20 16.52 20 11V5L12 2Z" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 12L11 14L15 10" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Protected by TrustLens</span>
    </div>
  `;
    document.body.appendChild(banner);
    warningBannerEl = banner;
    const safetyBtn = banner.querySelector("#trustlens-safety-btn");
    if (safetyBtn) {
      safetyBtn.addEventListener("click", () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = "https://www.google.com";
        }
      });
    }
    const ignoreBtn = banner.querySelector("#trustlens-ignore-btn");
    if (ignoreBtn) {
      ignoreBtn.addEventListener("click", () => {
        setBannerDismissed();
        removeWarningBanner();
      });
    }
    const closeBtn = banner.querySelector("#trustlens-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        setBannerDismissed();
        removeWarningBanner();
      });
    }
  }
  function updateBannerContent(analysis) {
    if (!warningBannerEl) return;
    const link = warningBannerEl.querySelector("a");
    if (link) link.href = analysis.reportUrl;
  }
  function removeWarningBanner() {
    if (warningBannerEl) {
      warningBannerEl.remove();
      warningBannerEl = null;
    }
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  function handleUrlChange() {
    setTimeout(() => {
      runScan(true);
    }, 200);
  }
  window.addEventListener("popstate", handleUrlChange);
  window.addEventListener("hashchange", handleUrlChange);
  var originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    handleUrlChange();
  };
  var originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    handleUrlChange();
  };
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasPotentialSecurityNode = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              if (node.tagName === "FORM" || node.tagName === "INPUT" || node.querySelector("form, input[type='password'], input[name*='otp' i]")) {
                hasPotentialSecurityNode = true;
                break;
              }
            }
          }
        }
        if (hasPotentialSecurityNode) break;
      }
      if (hasPotentialSecurityNode) {
        if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
        mutationDebounceTimer = setTimeout(() => {
          const passwordCount = document.querySelectorAll('input[type="password"]').length;
          const formCount = document.querySelectorAll("form").length;
          if (!lastFingerprint.hasPasswordField && passwordCount > 0 || formCount > lastFingerprint.formCount) {
            runScan(false);
          }
        }, DEBOUNCE_DELAY_MS);
      }
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
  if (document.readyState === "complete" || document.readyState === "interactive") {
    runScan();
    setupMutationObserver();
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      runScan();
      setupMutationObserver();
    });
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "RESCAN_PAGE") {
      runScan(true);
      sendResponse({ status: "SCANNING" });
    } else if (message.type === "GET_IN_PAGE_STATUS") {
      sendResponse({ analysis: currentAnalysis });
    }
    return true;
  });
})();
