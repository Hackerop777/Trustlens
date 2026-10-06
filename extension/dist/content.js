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
    width: min(92vw, 360px);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 50%, rgba(15, 23, 42, 0.05) 100%), rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(40px) saturate(210%);
    -webkit-backdrop-filter: blur(40px) saturate(210%);
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-top: 1px solid rgba(255, 255, 255, 0.38);
    box-shadow: 
      0 32px 64px -12px rgba(0, 0, 0, 0.60),
      0 16px 32px -8px rgba(0, 0, 0, 0.45),
      inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45),
      inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35);
    border-radius: 24px;
    padding: 18px 20px 15px 20px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #F8FAFC;
    display: flex;
    flex-direction: column;
    animation: trustlens-float-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    box-sizing: border-box;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
  `
    );
    const styleEl = document.createElement("style");
    styleEl.textContent = `
    @keyframes trustlens-float-in {
      from { opacity: 0; transform: translateY(20px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    #trustlens-security-banner * {
      box-sizing: border-box;
    }
    #trustlens-security-banner a:hover { opacity: 0.85; }
    #trustlens-security-banner button:hover { opacity: 0.92; }
    #trustlens-safety-btn:hover { background: #2563EB !important; }
    #trustlens-close-btn:hover { color: #FFFFFF !important; }
  `;
    document.head.appendChild(styleEl);
    const badgeText = analysis.classification === "CRITICAL" ? `CRITICAL ALERT (${analysis.riskScore}/100)` : `HIGH RISK (${analysis.riskScore}/100)`;
    const claimed = analysis.brandClaim?.claimedBrand || "official organization";
    const headline = analysis.brandClaim?.status === "MISMATCH" ? "Potential Impersonation" : analysis.riskScore >= 75 ? "Potential Impersonation" : "Suspicious Site Alert";
    let signal1 = `<strong style="font-weight: 700; color: #FFFFFF;">Fake Domain:</strong> Doesn't match official ${escapeHtml(claimed)}`;
    if (analysis.brandClaim?.status === "MATCH") {
      signal1 = `<strong style="font-weight: 700; color: #FFFFFF;">Domain Status:</strong> Verified domain with flagged form anomalies`;
    }
    let signal2 = `<strong style="font-weight: 700; color: #FFFFFF;">Unverified Fields:</strong> Detects attempts to harvest passwords`;
    if (analysis.topSignals && analysis.topSignals.length > 0) {
      const credSignal = analysis.topSignals.find((s) => s.toLowerCase().includes("password") || s.toLowerCase().includes("otp") || s.toLowerCase().includes("harvest"));
      if (credSignal) {
        signal2 = `<strong style="font-weight: 700; color: #FFFFFF;">Unverified Fields:</strong> Detects attempts to harvest passwords`;
      } else {
        signal2 = `<strong style="font-weight: 700; color: #FFFFFF;">Security Indicator:</strong> ${escapeHtml(analysis.topSignals[0])}`;
      }
    }
    banner.innerHTML = `
    <!-- Top Row: Logo & Critical Alert Pill -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
      <div style="display: flex; align-items: center; gap: 7px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
          <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#F97316"/>
          <rect x="13" y="2" width="9" height="9" rx="2.5" fill="#10B981"/>
          <rect x="2" y="13" width="9" height="9" rx="2.5" fill="#8B5CF6"/>
          <rect x="13" y="13" width="9" height="9" rx="2.5" fill="#3B82F6"/>
        </svg>
        <span style="font-weight: 800; font-size: 13px; letter-spacing: 0.05em; color: #FFFFFF;">TRUSTLENS</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 10px; font-weight: 700; background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.45); padding: 2px 8px; border-radius: 9999px; letter-spacing: 0.03em; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);">
          ${badgeText}
        </span>
        <button id="trustlens-close-btn" title="Dismiss Alert" style="background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">\u2715</button>
      </div>
    </div>

    <!-- Title Row: Potential Impersonation \u26A0 -->
    <div style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin-top: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
      <span>${headline}</span>
      <span style="color: #F87171; font-size: 16px;">\u26A0</span>
    </div>

    <!-- Signal Bullets -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
      <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.45; color: #D1D5DB;">
        <span style="color: #F87171; font-size: 14px; flex-shrink: 0; line-height: 1.3;">\u26A0</span>
        <div>${signal1}</div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.45; color: #D1D5DB;">
        <span style="color: #F87171; font-size: 14px; flex-shrink: 0; line-height: 1.3;">\u{1F6AB}</span>
        <div>${signal2}</div>
      </div>
    </div>

    <!-- Go Back to Safety Button -->
    <button id="trustlens-safety-btn" style="width: 100%; background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.22); font-size: 14px; font-weight: 600; padding: 11px 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 6px 16px rgba(29, 78, 216, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);">
      Go Back to Safety
    </button>

    <!-- Secondary Links: Ignore (Unsafe) | View Detailed Report -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; font-size: 12px; color: #94A3B8;">
      <span id="trustlens-ignore-btn" style="cursor: pointer; text-decoration: underline; text-underline-offset: 2px;">Ignore (Unsafe)</span>
      <span>|</span>
      <a href="${analysis.reportUrl}" target="_blank" style="color: #94A3B8; text-decoration: underline; text-underline-offset: 2px;">View Detailed Report</a>
    </div>

    <!-- Footer: \u{1F6E1} Protected by TrustLens -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 11px; color: #94A3B8; opacity: 0.85;">
      <span>\u{1F6E1}</span>
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
