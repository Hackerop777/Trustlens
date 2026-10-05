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

  const topSignalsList = (analysis.topSignals || [])
    .slice(0, 3)
    .map((s) => `<li style="margin-bottom: 2px;">${escapeHtml(s)}</li>`)
    .join("");

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #EF4444; box-shadow: 0 0 10px #EF4444;"></span>
        <span style="font-weight: 700; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; color: #FCA5A5;">TRUSTLENS WARNING</span>
        <span style="font-size: 11px; background: rgba(239, 68, 68, 0.22); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.35); padding: 1px 7px; border-radius: 9999px; font-weight: 700;">
          ${analysis.riskScore}/100
        </span>
      </div>
      <button id="trustlens-close-btn" title="Dismiss Alert" style="background: rgba(255,255,255,0.08); border: none; color: #D1D5DB; cursor: pointer; font-size: 13px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1;">✕</button>
    </div>
    
    <div style="font-size: 13px; font-weight: 500; color: #E5E7EB; line-height: 1.4;">
      ${escapeHtml(analysis.summary)}
    </div>

    ${
      topSignalsList
        ? `
      <ul style="font-size: 11px; color: #9CA3AF; margin-left: 16px; margin-top: 2px; line-height: 1.35;">
        ${topSignalsList}
      </ul>
    `
        : ""
    }

    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05);">
      <span style="font-size: 11px; color: #EF4444; font-weight: 500;">Do not submit passwords, OTPs, or card details.</span>
      <a href="${analysis.reportUrl}" target="_blank" style="font-size: 12px; font-weight: 600; color: #60A5FA; text-decoration: none; display: flex; align-items: center; gap: 4px;">
        View Investigation ↗
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
