"use strict";
(() => {
  // extension/src/popup/popup.ts
  document.addEventListener("DOMContentLoaded", () => {
    const loadingEl = document.getElementById("loading");
    const contentEl = document.getElementById("content");
    const hostnameEl = document.getElementById("tab-hostname");
    const brandPillEl = document.getElementById("brand-pill");
    const riskBannerEl = document.getElementById("risk-banner");
    const riskLabelEl = document.getElementById("risk-label");
    const riskScoreValueEl = document.getElementById("risk-score-value");
    const riskIconEl = document.getElementById("risk-icon");
    const summaryTextEl = document.getElementById("summary-text");
    const chainBoxEl = document.getElementById("chain-box");
    const chainStepsEl = document.getElementById("chain-steps");
    const signalsBoxEl = document.getElementById("signals-box");
    const signalsListEl = document.getElementById("signals-list");
    const viewReportBtn = document.getElementById("view-report-btn");
    const rescanBtn = document.getElementById("rescan-btn");
    const fpBtn = document.getElementById("fp-btn");
    const fpFeedbackEl = document.getElementById("fp-feedback");
    function renderStatus(analysis, tabUrl) {
      loadingEl.style.display = "none";
      contentEl.style.display = "block";
      let hostname = "Current Webpage";
      if (tabUrl) {
        try {
          hostname = new URL(tabUrl).hostname;
        } catch {
          hostname = tabUrl;
        }
      }
      hostnameEl.textContent = hostname;
      if (!analysis) {
        document.body.setAttribute("data-theme", "unknown");
        riskBannerEl.className = "risk-banner UNKNOWN";
        riskLabelEl.textContent = "Unanalyzed";
        riskLabelEl.style.color = "#9CA3AF";
        riskScoreValueEl.textContent = "--";
        riskIconEl.textContent = "\u26AA";
        summaryTextEl.textContent = "No security signals recorded yet. Click 'Scan Page Again' to evaluate.";
        signalsBoxEl.style.display = "none";
        chainBoxEl.style.display = "none";
        brandPillEl.style.display = "none";
        viewReportBtn.style.display = "none";
        return;
      }
      const { riskScore, classification, summary, topSignals, attackChain, brandClaim, reportUrl } = analysis;
      document.body.setAttribute("data-theme", classification.toLowerCase());
      riskScoreValueEl.textContent = String(riskScore);
      summaryTextEl.textContent = summary;
      viewReportBtn.href = reportUrl;
      viewReportBtn.style.display = "block";
      riskBannerEl.className = `risk-banner ${classification}`;
      if (brandClaim && brandClaim.claimedBrand) {
        if (brandClaim.status === "MATCH") {
          brandPillEl.className = "brand-pill MATCH";
          brandPillEl.innerHTML = `<span>\u2713</span> Verified Official ${escapeHtml(brandClaim.claimedBrand)}`;
          brandPillEl.style.display = "inline-flex";
        } else if (brandClaim.status === "MISMATCH") {
          brandPillEl.className = "brand-pill MISMATCH";
          brandPillEl.innerHTML = `<span>\u26A0\uFE0F</span> Impersonation: Claims to be ${escapeHtml(brandClaim.claimedBrand)}`;
          brandPillEl.style.display = "inline-flex";
        } else {
          brandPillEl.style.display = "none";
        }
      } else {
        brandPillEl.style.display = "none";
      }
      switch (classification) {
        case "CRITICAL":
          riskLabelEl.textContent = "Critical Threat";
          riskLabelEl.style.color = "#EF4444";
          riskIconEl.textContent = "\u{1F6A8}";
          break;
        case "HIGH":
          riskLabelEl.textContent = "High Risk";
          riskLabelEl.style.color = "#F87171";
          riskIconEl.textContent = "\u{1F534}";
          break;
        case "SUSPICIOUS":
          riskLabelEl.textContent = "Suspicious";
          riskLabelEl.style.color = "#F59E0B";
          riskIconEl.textContent = "\u{1F7E1}";
          break;
        case "LOW":
          riskLabelEl.textContent = "Verified Safe";
          riskLabelEl.style.color = "#10B981";
          riskIconEl.textContent = "\u{1F7E2}";
          break;
        case "UNKNOWN":
        default:
          riskLabelEl.textContent = "Unidentified";
          riskLabelEl.style.color = "#9CA3AF";
          riskIconEl.textContent = "\u26AA";
          break;
      }
      if (attackChain && attackChain.length > 0 && classification !== "LOW") {
        chainStepsEl.innerHTML = "";
        attackChain.forEach((step, idx) => {
          const item = document.createElement("div");
          item.className = "chain-step";
          item.innerHTML = `<span class="chain-arrow">${idx + 1}.</span> <span>${escapeHtml(step)}</span>`;
          chainStepsEl.appendChild(item);
        });
        chainBoxEl.style.display = "block";
      } else {
        chainBoxEl.style.display = "none";
      }
      if (topSignals && topSignals.length > 0) {
        signalsListEl.innerHTML = "";
        topSignals.forEach((signal) => {
          const item = document.createElement("div");
          item.className = "signal-item";
          item.innerHTML = `<span class="signal-bullet">\u2022</span> <span>${escapeHtml(signal)}</span>`;
          signalsListEl.appendChild(item);
        });
        signalsBoxEl.style.display = "block";
      } else {
        signalsBoxEl.style.display = "none";
      }
    }
    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        renderStatus(null);
        return;
      }
      if (!response.analysis && response.tab?.url && !response.tab.url.startsWith("chrome://")) {
        loadingEl.style.display = "flex";
        contentEl.style.display = "none";
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" }, (res2) => {
            renderStatus(res2 ? res2.analysis : null, res2 ? res2.tab?.url : response.tab?.url);
          });
        }, 900);
      } else {
        renderStatus(response.analysis, response.tab?.url);
      }
    });
    rescanBtn.addEventListener("click", () => {
      loadingEl.style.display = "flex";
      contentEl.style.display = "none";
      chrome.runtime.sendMessage({ type: "TRIGGER_RESCAN" }, () => {
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" }, (response) => {
            renderStatus(response ? response.analysis : null, response ? response.tab?.url : void 0);
          });
        }, 1200);
      });
    });
    fpBtn.addEventListener("click", () => {
      fpFeedbackEl.style.display = "block";
      fpBtn.style.opacity = "0.5";
      fpBtn.disabled = true;
      setTimeout(() => {
        fpFeedbackEl.style.display = "none";
      }, 4e3);
    });
    const settingsToggleBtn = document.getElementById("settings-toggle-btn");
    const settingsCard = document.getElementById("settings-card");
    const settingRealtime = document.getElementById("setting-realtime");
    const settingWarnings = document.getElementById("setting-warnings");
    const settingDeep = document.getElementById("setting-deep");
    if (settingsToggleBtn && settingsCard) {
      settingsToggleBtn.addEventListener("click", () => {
        const isVisible = settingsCard.style.display === "block";
        settingsCard.style.display = isVisible ? "none" : "block";
      });
    }
    chrome.storage.local.get(["tl_settings"], (res) => {
      const settings = res.tl_settings || { realtimeMonitoring: true, inPageWarnings: true, deepAnalysis: true };
      if (settingRealtime) settingRealtime.checked = settings.realtimeMonitoring !== false;
      if (settingWarnings) settingWarnings.checked = settings.inPageWarnings !== false;
      if (settingDeep) settingDeep.checked = settings.deepAnalysis !== false;
    });
    function saveSettings() {
      const newSettings = {
        realtimeMonitoring: settingRealtime ? settingRealtime.checked : true,
        inPageWarnings: settingWarnings ? settingWarnings.checked : true,
        deepAnalysis: settingDeep ? settingDeep.checked : true
      };
      chrome.storage.local.set({ tl_settings: newSettings });
    }
    settingRealtime?.addEventListener("change", saveSettings);
    settingWarnings?.addEventListener("change", saveSettings);
    settingDeep?.addEventListener("change", saveSettings);
  });
})();
