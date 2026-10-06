// extension/src/background.ts
var BACKEND_API_URL = "http://localhost:3000/api/extension/analyze";
var CACHE_TTL_MS = 15 * 60 * 1e3;
var TAB_RESULTS = /* @__PURE__ */ new Map();
var URL_CACHE = /* @__PURE__ */ new Map();
chrome.storage.local.get(["tl_cache"], (result) => {
  if (result.tl_cache && typeof result.tl_cache === "object") {
    for (const [key, val] of Object.entries(result.tl_cache)) {
      const item = val;
      if (Date.now() - item.timestamp < CACHE_TTL_MS) {
        URL_CACHE.set(key, item);
      }
    }
  }
});
function persistCache() {
  const serializable = {};
  URL_CACHE.forEach((val, key) => {
    serializable[key] = val;
  });
  chrome.storage.local.set({ tl_cache: serializable });
}
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["tl_settings"], (res) => {
      resolve(res.tl_settings || { realtimeMonitoring: true, inPageWarnings: true });
    });
  });
}
function updateBadge(tabId, analysis) {
  let badgeText = "";
  let badgeColor = "#6B7280";
  switch (analysis.classification) {
    case "CRITICAL":
      badgeText = "RISK";
      badgeColor = "#DC2626";
      break;
    case "HIGH":
      badgeText = `${analysis.riskScore}`;
      badgeColor = "#EF4444";
      break;
    case "SUSPICIOUS":
      badgeText = "WARN";
      badgeColor = "#D97706";
      break;
    case "LOW":
      badgeText = "SAFE";
      badgeColor = "#16A34A";
      break;
    case "UNKNOWN":
    default:
      badgeText = "?";
      badgeColor = "#4B5563";
      break;
  }
  chrome.action.setBadgeText({ tabId, text: badgeText });
  chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
}
async function analyzeWithBackend(payload) {
  const cacheKey = payload.url.split("?")[0].toLowerCase();
  const cached = URL_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.analysis;
  }
  try {
    const res = await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.warn(`[TRUSTLENS Service Worker] API returned HTTP ${res.status}`);
      return createOfflineFallback(payload);
    }
    const data = await res.json();
    URL_CACHE.set(cacheKey, {
      url: payload.url,
      hostname: payload.hostname,
      timestamp: Date.now(),
      analysis: data
    });
    persistCache();
    return data;
  } catch (err) {
    console.warn("[TRUSTLENS Service Worker] Backend unreachable. Using offline heuristic fallback.", err);
    return createOfflineFallback(payload);
  }
}
function createOfflineFallback(payload) {
  const isSuspiciousLocal = payload.signals.hasPasswordField && (payload.signals.hasCrossDomainForm || payload.signals.urgencyDetected);
  return {
    investigationId: `offline_${Date.now()}`,
    riskScore: isSuspiciousLocal ? 40 : 0,
    classification: "UNKNOWN",
    summary: "TRUSTLENS analysis temporarily unavailable (Backend Offline). Local heuristic scan completed.",
    topSignals: [
      payload.signals.hasPasswordField ? "Password input field detected" : "No credential fields observed",
      payload.signals.hasCrossDomainForm ? "Cross-domain form destination detected" : "Same-origin form action",
      "Cloud AI & live threat intelligence feeds unreachable"
    ],
    attackChain: isSuspiciousLocal ? ["Local Sensor: Credential Input on Unverified Form"] : [],
    recommendedActions: [
      "Verify the URL spelling manually before entering any credentials.",
      "Ensure the TRUSTLENS backend server is running on port 3000."
    ],
    reportUrl: "http://localhost:3000"
  };
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (message.type === "PAGE_SCANNED") {
    const payload = message.payload;
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
    return true;
  }
  if (message.type === "GET_CURRENT_TAB_STATUS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        let analysis = TAB_RESULTS.get(activeTab.id);
        if (!analysis && activeTab.url) {
          const cacheKey = activeTab.url.split("?")[0].toLowerCase();
          const cached = URL_CACHE.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            analysis = cached.analysis;
            TAB_RESULTS.set(activeTab.id, analysis);
          }
        }
        if (!analysis && activeTab.url && (activeTab.url.startsWith("http://") || activeTab.url.startsWith("https://"))) {
          try {
            chrome.tabs.sendMessage(activeTab.id, { type: "RESCAN_PAGE" }, () => {
              if (chrome.runtime.lastError) {
                chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ["content.js"]
                }).catch(() => {
                });
              }
            });
          } catch {
          }
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
chrome.tabs.onRemoved.addListener((tabId) => {
  TAB_RESULTS.delete(tabId);
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  const analysis = TAB_RESULTS.get(activeInfo.tabId);
  if (analysis) {
    updateBadge(activeInfo.tabId, analysis);
  } else {
    chrome.action.setBadgeText({ tabId: activeInfo.tabId, text: "" });
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    chrome.action.setBadgeText({ tabId, text: "..." });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#4B5563" });
  }
});
