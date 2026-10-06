/**
 * Background Service Worker for TRUSTLENS Chrome Extension (Manifest V3)
 * Orchestrates API communication, persistent storage caching, tab state management,
 * offline fallbacks, and real-time badge updates.
 */

import { ExtensionScanPayload, ExtensionAnalysisResponse, CachedScanResult } from "./types";

const BACKEND_API_URL = "http://localhost:3000/api/extension/analyze";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-memory tab results and URL cache
const TAB_RESULTS = new Map<number, ExtensionAnalysisResponse>();
const URL_CACHE = new Map<string, CachedScanResult>();

// Load persisted cache from chrome.storage.local on startup (survives service worker restarts)
chrome.storage.local.get(["tl_cache"], (result) => {
  if (result.tl_cache && typeof result.tl_cache === "object") {
    for (const [key, val] of Object.entries(result.tl_cache)) {
      const item = val as CachedScanResult;
      if (Date.now() - item.timestamp < CACHE_TTL_MS) {
        URL_CACHE.set(key, item);
      }
    }
  }
});

function persistCache() {
  const serializable: Record<string, CachedScanResult> = {};
  URL_CACHE.forEach((val, key) => {
    serializable[key] = val;
  });
  chrome.storage.local.set({ tl_cache: serializable });
}

async function getSettings(): Promise<{ realtimeMonitoring: boolean; inPageWarnings: boolean }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["tl_settings"], (res) => {
      resolve(res.tl_settings || { realtimeMonitoring: true, inPageWarnings: true });
    });
  });
}

/**
 * Updates the extension badge text and background color according to risk severity.
 */
function updateBadge(tabId: number, analysis: ExtensionAnalysisResponse) {
  let badgeText = "";
  let badgeColor = "#6B7280"; // Gray

  switch (analysis.classification) {
    case "CRITICAL":
      badgeText = "RISK";
      badgeColor = "#DC2626"; // Bright Red
      break;
    case "HIGH":
      badgeText = `${analysis.riskScore}`;
      badgeColor = "#EF4444"; // Red
      break;
    case "SUSPICIOUS":
      badgeText = "WARN";
      badgeColor = "#D97706"; // Amber
      break;
    case "LOW":
      badgeText = "SAFE";
      badgeColor = "#16A34A"; // Green
      break;
    case "UNKNOWN":
    default:
      badgeText = "?";
      badgeColor = "#4B5563"; // Dark Gray
      break;
  }

  chrome.action.setBadgeText({ tabId, text: badgeText });
  chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
}

/**
 * Sends security payload to TRUSTLENS backend for AI & threat intelligence analysis.
 * Implements persistent cache checks and truthful offline fallbacks.
 */
async function analyzeWithBackend(payload: ExtensionScanPayload): Promise<ExtensionAnalysisResponse | null> {
  // Check URL Cache first
  const cacheKey = payload.url.split("?")[0].toLowerCase();
  const cached = URL_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.analysis;
  }

  try {
    const res = await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`[TRUSTLENS Service Worker] API returned HTTP ${res.status}`);
      return createOfflineFallback(payload);
    }

    const data: ExtensionAnalysisResponse = await res.json();

    // Cache result in-memory and persistently in chrome.storage.local
    URL_CACHE.set(cacheKey, {
      url: payload.url,
      hostname: payload.hostname,
      timestamp: Date.now(),
      analysis: data,
    });
    persistCache();

    return data;
  } catch (err) {
    console.warn("[TRUSTLENS Service Worker] Backend unreachable. Using offline heuristic fallback.", err);
    return createOfflineFallback(payload);
  }
}

/**
 * Truthful offline fallback: Never fabricates AI decisions when offline.
 */
function createOfflineFallback(payload: ExtensionScanPayload): ExtensionAnalysisResponse {
  const isSuspiciousLocal =
    payload.signals.hasPasswordField && (payload.signals.hasCrossDomainForm || payload.signals.urgencyDetected);

  return {
    investigationId: `offline_${Date.now()}`,
    riskScore: isSuspiciousLocal ? 40 : 0,
    classification: "UNKNOWN",
    summary: "TRUSTLENS analysis temporarily unavailable (Backend Offline). Local heuristic scan completed.",
    topSignals: [
      payload.signals.hasPasswordField ? "Password input field detected" : "No credential fields observed",
      payload.signals.hasCrossDomainForm ? "Cross-domain form destination detected" : "Same-origin form action",
      "Cloud AI & live threat intelligence feeds unreachable",
    ],
    attackChain: isSuspiciousLocal ? ["Local Sensor: Credential Input on Unverified Form"] : [],
    recommendedActions: [
      "Verify the URL spelling manually before entering any credentials.",
      "Ensure the TRUSTLENS backend server is running on port 3000.",
    ],
    reportUrl: "http://localhost:3000",
  };
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === "PAGE_SCANNED") {
    const payload: ExtensionScanPayload = message.payload;

    getSettings().then((settings) => {
      if (!settings.realtimeMonitoring) {
        sendResponse({ success: false, disabled: true });
        return;
      }

      analyzeWithBackend(payload).then((analysis) => {
        if (analysis) {
          if (tabId) {
            TAB_RESULTS.set(tabId, analysis);
            updateBadge(tabId, analysis);
          }
          sendResponse({ success: true, analysis, showWarnings: settings.inPageWarnings });
        } else {
          sendResponse({ success: false });
        }
      });
    });

    return true; // Keep message channel open for async response
  }

  if (message.type === "GET_CURRENT_TAB_STATUS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        let analysis = TAB_RESULTS.get(activeTab.id);

        // 1. Check persistent URL_CACHE if service worker just woke up from sleep
        if (!analysis && activeTab.url) {
          const cacheKey = activeTab.url.split("?")[0].toLowerCase();
          const cached = URL_CACHE.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            analysis = cached.analysis;
            TAB_RESULTS.set(activeTab.id, analysis);
          }
        }

        // 2. If still unanalyzed on an http/https tab, immediately trigger scan or inject script
        if (!analysis && activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"))) {
          try {
            chrome.tabs.sendMessage(activeTab.id, { type: "RESCAN_PAGE" }, () => {
              if (chrome.runtime.lastError) {
                // Tab was opened before extension was loaded/reloaded — inject content.js dynamically!
                chrome.scripting.executeScript({
                  target: { tabId: activeTab.id! },
                  files: ["content.js"],
                }).catch(() => {});
              }
            });
          } catch {}
        }

        sendResponse({ analysis: analysis || null, tab: activeTab });
      } else {
        sendResponse({ analysis: null });
      }
    });

    return true;
  }

  if (message.type === "TRIGGER_RESCAN") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: "RESCAN_PAGE" }, (res) => {
          sendResponse(res);
        });
      }
    });

    return true;
  }

  return false;
});

// Clear tab state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  TAB_RESULTS.delete(tabId);
});

// Synchronize toolbar badge whenever the user switches active tabs
chrome.tabs.onActivated.addListener((activeInfo) => {
  const analysis = TAB_RESULTS.get(activeInfo.tabId);
  if (analysis) {
    updateBadge(activeInfo.tabId, analysis);
  } else {
    chrome.action.setBadgeText({ tabId: activeInfo.tabId, text: "" });
  }
});

// Handle tab navigation state changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    chrome.action.setBadgeText({ tabId, text: "..." });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#4B5563" });
  }
});
