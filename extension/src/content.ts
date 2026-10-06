/**
 * Content Script for TRUSTLENS Chrome Extension (Manifest V3)
 * Injected into web pages to observe security signals, track SPA navigations,
 * monitor meaningful DOM mutations, and render Apple frosted glass alert banners.
 */

import { scanPageDOM } from "./scanner/local-scanner";
import { ExtensionAnalysisResponse, ExtensionPageSignals } from "./types";

let currentAnalysis: ExtensionAnalysisResponse | null = null;
let warningBannerEl: HTMLElement | null = null;
let lastScannedUrl = "";
let lastScanTimestamp = 0;
let mutationDebounceTimer: any = null;

// Fingerprint of key security cues to avoid redundant API triggers
interface SecurityFingerprint {
  hasPasswordField: boolean;
  hasOtpField: boolean;
  hasPaymentField: boolean;
  hasCrossDomainForm: boolean;
  inputCount: number;
  formCount: number;
}

let lastFingerprint: SecurityFingerprint = {
  hasPasswordField: false,
  hasOtpField: false,
  hasPaymentField: false,
  hasCrossDomainForm: false,
  inputCount: 0,
  formCount: 0,
};

const RESCAN_COOLDOWN_MS = 8000; // 8 seconds cooldown between DOM-triggered rescans
const DEBOUNCE_DELAY_MS = 1500;  // 1.5 seconds debounce for DOM mutations

/**
 * Checks if a dismissal flag was stored in sessionStorage for current page
 */
function isBannerDismissed(): boolean {
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
    // Ignore storage restrictions
  }
}

/**
 * Executes local scan and dispatches security payload to service worker.
 */
function runScan(force = false) {
  // Skip scanning internal browser extensions or about pages
  if (window.location.protocol === "chrome:" || window.location.protocol === "chrome-extension:") {
    return;
  }

  // Skip scanning localhost / local development ports UNLESS explicitly a synthetic demo testbed
  const isMockDemo = !!(
    document.documentElement.getAttribute("data-trustlens-mock-url") ||
    document.body?.getAttribute("data-trustlens-mock-url")
  );
  if (
    !isMockDemo &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.endsWith(".local"))
  ) {
    return;
  }

  const currentUrl = window.location.href;
  const now = Date.now();

  // If not forced and within cooldown on exact same URL, skip
  if (!force && currentUrl === lastScannedUrl && now - lastScanTimestamp < RESCAN_COOLDOWN_MS) {
    return;
  }

  const payload = scanPageDOM();
  lastScannedUrl = currentUrl;
  lastScanTimestamp = now;

  // Update fingerprint
  lastFingerprint = {
    hasPasswordField: payload.signals.hasPasswordField,
    hasOtpField: payload.signals.hasOtpField,
    hasPaymentField: payload.signals.hasPaymentField,
    hasCrossDomainForm: payload.signals.hasCrossDomainForm,
    inputCount: payload.signals.inputCount,
    formCount: payload.signals.formCount,
  };

  // Send structured security signals to background service worker
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
    // Context invalidated (extension reloaded)
  }
}

/**
 * Handles incoming risk analysis from the backend.
 */
function handleAnalysisResult(analysis: ExtensionAnalysisResponse, allowWarnings = true) {
  currentAnalysis = analysis;

  if ((analysis.classification === "CRITICAL" || analysis.classification === "HIGH") && allowWarnings) {
    if (!isBannerDismissed()) {
      showWarningBanner(analysis);
    }
  } else {
    removeWarningBanner();
  }
}

/**
 * Displays a non-intrusive, Apple frosted glass warning banner at top of page for dangerous sites.
 */
function showWarningBanner(analysis: ExtensionAnalysisResponse) {
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

  const badgeText = analysis.classification === "CRITICAL"
    ? `CRITICAL ALERT (${analysis.riskScore}/100)`
    : `HIGH RISK (${analysis.riskScore}/100)`;

  const claimed = analysis.brandClaim?.claimedBrand || "official organization";
  const headline = analysis.brandClaim?.status === "MISMATCH"
    ? "Potential Impersonation"
    : (analysis.riskScore >= 75 ? "Potential Impersonation" : "Suspicious Site Alert");

  // Determine key bullet signals
  let signal1 = `<strong style="font-weight: 700; color: #FFFFFF;">Fake Domain:</strong> Doesn't match official ${escapeHtml(claimed)}`;
  if (analysis.brandClaim?.status === "MATCH") {
    signal1 = `<strong style="font-weight: 700; color: #FFFFFF;">Domain Status:</strong> Verified domain with flagged form anomalies`;
  }

  let signal2 = `<strong style="font-weight: 700; color: #FFFFFF;">Unverified Fields:</strong> Detects attempts to harvest passwords`;
  if (analysis.topSignals && analysis.topSignals.length > 0) {
    const credSignal = analysis.topSignals.find(s => s.toLowerCase().includes("password") || s.toLowerCase().includes("otp") || s.toLowerCase().includes("harvest"));
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
        <button id="trustlens-close-btn" title="Dismiss Alert" style="background: transparent; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 14px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">✕</button>
      </div>
    </div>

    <!-- Title Row: Potential Impersonation ⚠ -->
    <div style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin-top: 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
      <span>${headline}</span>
      <span style="color: #F87171; font-size: 16px;">⚠</span>
    </div>

    <!-- Signal Bullets -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
      <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.45; color: #D1D5DB;">
        <span style="color: #F87171; font-size: 14px; flex-shrink: 0; line-height: 1.3;">⚠</span>
        <div>${signal1}</div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.45; color: #D1D5DB;">
        <span style="color: #F87171; font-size: 14px; flex-shrink: 0; line-height: 1.3;">🚫</span>
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

    <!-- Footer: 🛡 Protected by TrustLens -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 11px; color: #94A3B8; opacity: 0.85;">
      <span>🛡</span>
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

function updateBannerContent(analysis: ExtensionAnalysisResponse) {
  if (!warningBannerEl) return;
  // If already rendered, refresh URL if changed
  const link = warningBannerEl.querySelector("a");
  if (link) link.href = analysis.reportUrl;
}

function removeWarningBanner() {
  if (warningBannerEl) {
    warningBannerEl.remove();
    warningBannerEl = null;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// REAL-TIME MONITORING: SPA ROUTING & MUTATIONS
// ==========================================

/**
 * Handles Single Page Application (SPA) client-side routing changes
 */
function handleUrlChange() {
  setTimeout(() => {
    runScan(true);
  }, 200);
}

// Hook browser navigation events
window.addEventListener("popstate", handleUrlChange);
window.addEventListener("hashchange", handleUrlChange);

// Monkey-patch history.pushState and replaceState to detect SPA route changes
const originalPushState = history.pushState;
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  handleUrlChange();
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
  originalReplaceState.apply(this, args);
  handleUrlChange();
};

/**
 * Debounced MutationObserver to detect dynamically mounted credential/payment forms
 * without spamming the server or consuming excessive CPU.
 */
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let hasPotentialSecurityNode = false;

    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            if (
              node.tagName === "FORM" ||
              node.tagName === "INPUT" ||
              node.querySelector("form, input[type='password'], input[name*='otp' i]")
            ) {
              hasPotentialSecurityNode = true;
              break;
            }
          }
        }
      }
      if (hasPotentialSecurityNode) break;
    }

    // Only proceed if a form or input was dynamically added
    if (hasPotentialSecurityNode) {
      if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);

      mutationDebounceTimer = setTimeout(() => {
        // Compare with previous fingerprint
        const passwordCount = document.querySelectorAll('input[type="password"]').length;
        const formCount = document.querySelectorAll("form").length;

        // If new password field or new form appeared, trigger rescan
        if (
          (!lastFingerprint.hasPasswordField && passwordCount > 0) ||
          formCount > lastFingerprint.formCount
        ) {
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

// Initialize on page load
if (document.readyState === "complete" || document.readyState === "interactive") {
  runScan();
  setupMutationObserver();
} else {
  window.addEventListener("DOMContentLoaded", () => {
    runScan();
    setupMutationObserver();
  });
}

// Listen for messages from background / popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RESCAN_PAGE") {
    runScan(true);
    sendResponse({ status: "SCANNING" });
  } else if (message.type === "GET_IN_PAGE_STATUS") {
    sendResponse({ analysis: currentAnalysis });
  }
  return true;
});
