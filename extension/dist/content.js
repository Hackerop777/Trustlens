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
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    width: min(92vw, 560px);
    background: rgba(14, 15, 20, 0.94);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(239, 68, 68, 0.45);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.65), 0 0 24px rgba(239, 68, 68, 0.2);
    border-radius: 18px;
    padding: 14px 18px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    color: #F3F4F6;
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: trustlens-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
  `
    );
    const styleEl = document.createElement("style");
    styleEl.textContent = `
    @keyframes trustlens-slide-down {
      from { opacity: 0; transform: translate(-50%, -18px) scale(0.98); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    #trustlens-security-banner a:hover { opacity: 0.85; }
    #trustlens-security-banner button:hover { opacity: 0.85; }
  `;
    document.head.appendChild(styleEl);
    const topSignalsList = (analysis.topSignals || []).slice(0, 3).map((s) => `<li style="margin-bottom: 2px;">${escapeHtml(s)}</li>`).join("");
    banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 10px #EF4444;"></span>
        <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #FCA5A5;">TRUSTLENS WARNING</span>
        <span style="font-size: 11px; background: rgba(239, 68, 68, 0.22); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 1px 7px; border-radius: 9999px; font-weight: 700;">
          ${analysis.riskScore}/100
        </span>
      </div>
      <button id="trustlens-close-btn" title="Dismiss Alert" style="background: rgba(255,255,255,0.08); border: none; color: #D1D5DB; cursor: pointer; font-size: 13px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1;">\u2715</button>
    </div>
    
    <div style="font-size: 13px; font-weight: 500; color: #E5E7EB; line-height: 1.4;">
      ${escapeHtml(analysis.summary)}
    </div>

    ${topSignalsList ? `
      <ul style="font-size: 11px; color: #9CA3AF; margin-left: 16px; margin-top: 2px; line-height: 1.35;">
        ${topSignalsList}
      </ul>
    ` : ""}

    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05);">
      <span style="font-size: 11px; color: #EF4444; font-weight: 500;">Do not submit passwords, OTPs, or card details.</span>
      <a href="${analysis.reportUrl}" target="_blank" style="font-size: 12px; font-weight: 600; color: #60A5FA; text-decoration: none; display: flex; align-items: center; gap: 4px;">
        View Investigation \u2197
      </a>
    </div>
  `;
    document.body.appendChild(banner);
    warningBannerEl = banner;
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
