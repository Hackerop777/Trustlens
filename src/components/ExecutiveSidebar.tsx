"use client";

import React, { useState } from "react";
import { InvestigationResult } from "@/lib/types";
import { getRiskTheme } from "@/lib/theme/risk-theme";
import {
  EyeOff,
  Eye,
  Check,
  X,
  LifeBuoy,
  Maximize2,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface ExecutiveSidebarProps {
  result: InvestigationResult | null;
  onOpenPostVictim?: () => void;
  onHide?: () => void;
}

export function ExecutiveSidebar({ result, onOpenPostVictim, onHide }: ExecutiveSidebarProps) {
  const [isScoreBoxHidden, setIsScoreBoxHidden] = useState(false);
  const [isAssessmentBoxHidden, setIsAssessmentBoxHidden] = useState(false);
  const [isActionsBoxHidden, setIsActionsBoxHidden] = useState(false);
  const [popupType, setPopupType] = useState<"SCORE" | "ASSESSMENT" | "ACTIONS" | null>(null);

  const theme = getRiskTheme(result);

  // If no scan has run yet, provide default initial placeholder state matching the photo
  const score = result ? result.riskAssessment.score : 0;
  const classification = result ? result.riskAssessment.classification : "UNKNOWN";
  const headline = result
    ? result.riskAssessment.verdictHeadline
    : "Verified Safe / Insufficient Risk";

  const plainVerdict = result
    ? result.aiAssessment.plainLanguageVerdict
    : "Inactive or parked domain masquerading as a business.";

  const deceptions = result?.aiAssessment.identifiedDeceptions || [
    "Unverified Brand Identity",
  ];

  const doList = result?.recommendations.doList.slice(0, 2) || [
    "Verify that the browser address bar displays the secure lock icon",
    "Ensure your two-factor authentication remains enabled",
  ];

  const doNotList = result?.recommendations.doNotList.slice(0, 1) || [
    "Do not submit credentials or one-time verification passcodes",
  ];

  return (
    <>
      <aside className="w-full h-full flex flex-col gap-2 sm:gap-2.5 animate-in fade-in duration-300 min-h-0">
        {/* Top Header with Master Hide All Button */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <div className="flex items-center space-x-1.5 text-white/50 text-[10px] font-mono tracking-wider uppercase">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Threat Intelligence</span>
          </div>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#081b12]/90 hover:bg-[#0a2e1d] border border-white/[0.08] hover:border-emerald-600/40 text-[11px] text-white/70 hover:text-emerald-300 transition-all apple-button-press cursor-pointer"
              title="Hide all 3 boxes"
            >
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hide All (3)</span>
            </button>
          )}
        </div>

        {/* 1. Threat Score Block */}
        <div
          onClick={() => setPopupType("SCORE")}
          title="Click to view detailed score & evaluation popup"
          className={`apple-glass rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between group hover:border-emerald-500/40 hover:bg-[#062615]/90 transition-all duration-300 cursor-pointer ${
            isScoreBoxHidden ? "shrink-0 py-2.5" : "flex-1 min-h-0"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="font-semibold text-white/70 tracking-wider uppercase text-[10px] group-hover:text-emerald-300 transition-colors">
              Threat Score
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsScoreBoxHidden(!isScoreBoxHidden);
                }}
                className="flex items-center space-x-1 text-[10px] text-white/40 hover:text-white transition-colors apple-button-press"
                title={isScoreBoxHidden ? "Unhide Threat Score box" : "Hide Threat Score box"}
              >
                {isScoreBoxHidden ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                <span>{isScoreBoxHidden ? "Show" : "Hide"}</span>
              </button>
              <Maximize2 className="w-3 h-3 text-white/30 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>

          {!isScoreBoxHidden ? (
            <>
              <div className="my-auto py-0.5">
                <div className="flex items-baseline space-x-2">
                  <div className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight leading-none transition-colors duration-500 ${theme.scoreColor}`}>
                    {score}/100
                  </div>
                  <span className={`text-[11px] font-bold tracking-wider uppercase font-mono px-2 py-0.5 rounded-full ${
                    theme.isUnknownZero
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                      : classification === "LOW" && score === 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : theme.badgeClass
                  }`}>
                    {theme.isUnknownZero
                      ? "UNVERIFIED"
                      : classification === "LOW" && score === 0
                      ? "0% THREAT (SAFE)"
                      : "THREAT"}
                  </span>
                </div>

                <div
                  className={`text-[11px] font-medium truncate group-hover:whitespace-normal group-hover:break-words transition-all mt-1.5 ${theme.scoreColor}`}
                  title={headline}
                >
                  {headline}
                </div>

                {theme.isUnknownZero ? (
                  <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-[10px] text-amber-300 font-semibold leading-tight flex items-center space-x-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>0/100 != Safe • Unindexed target with unknown posture</span>
                  </div>
                ) : classification === "LOW" && score === 0 ? (
                  <div className="mt-1.5 text-[10px] text-emerald-400/90 font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>0% Threat detected • Domain is verified safe to browse</span>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                {/* Apple Glass Progress Bar */}
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      classification === "LOW" && score === 0
                        ? "bg-[#30d158] shadow-[0_0_12px_rgba(48,209,88,0.7)]"
                        : theme.progressBarClass
                    }`}
                    style={{
                      width: `${
                        classification === "LOW" && score === 0
                          ? 100
                          : Math.max(score, theme.isUnknownZero ? 15 : 4)
                      }%`,
                    }}
                  />
                </div>

                <div
                  className="text-[10px] text-white/40 group-hover:text-white/70 leading-tight truncate group-hover:whitespace-normal group-hover:break-words transition-all"
                  title={
                    result
                      ? `Confidence: ${result.riskAssessment.confidence}% • ${result.riskAssessment.scoreBreakdownSummary}`
                      : "Deterministic security evaluation synthesized across observed signals."
                  }
                >
                  {result
                    ? `Confidence: ${result.riskAssessment.confidence}% • ${result.riskAssessment.scoreBreakdownSummary}`
                    : "Deterministic security evaluation synthesized across observed signals."}
                </div>
              </div>
            </>
          ) : (
            <div className="pt-1.5 flex items-center justify-between text-xs">
              <span className={`font-mono font-bold ${theme.scoreColor}`}>{score}/100</span>
              <span className="text-[10px] text-white/50 truncate max-w-[170px]">{headline}</span>
            </div>
          )}
        </div>

        {/* 2. Executive Threat Assessment */}
        <div
          onClick={() => setPopupType("ASSESSMENT")}
          title="Click to view full threat intelligence popup"
          className={`apple-glass rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between group hover:border-emerald-500/40 hover:bg-[#062615]/90 transition-all duration-300 cursor-pointer ${
            isAssessmentBoxHidden ? "shrink-0 py-2.5" : "flex-1 min-h-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/50 group-hover:text-emerald-300 transition-colors">
              Threat Assessment
            </h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAssessmentBoxHidden(!isAssessmentBoxHidden);
                }}
                className="flex items-center space-x-1 text-[10px] text-white/40 hover:text-white transition-colors apple-button-press"
                title={isAssessmentBoxHidden ? "Unhide Threat Assessment box" : "Hide Threat Assessment box"}
              >
                {isAssessmentBoxHidden ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                <span>{isAssessmentBoxHidden ? "Show" : "Hide"}</span>
              </button>
              <Maximize2 className="w-3 h-3 text-white/30 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>

          {!isAssessmentBoxHidden ? (
            <>
              <div
                className="text-xs text-white/85 leading-relaxed bg-black/35 group-hover:bg-black/60 p-2.5 rounded-xl border border-white/[0.05] group-hover:border-emerald-500/20 line-clamp-3 group-hover:line-clamp-none my-auto overflow-y-auto max-h-32 transition-all duration-300"
                title={plainVerdict}
              >
                {plainVerdict}
              </div>

              <div className="flex items-center justify-between text-[10px] text-emerald-400/80 pt-0.5 group-hover:text-emerald-300">
                <span>Click to expand full verdict</span>
                <span>↗</span>
              </div>

              <div className="flex flex-wrap gap-1 overflow-hidden max-h-6 group-hover:max-h-24 group-hover:overflow-y-auto transition-all duration-300">
                {deceptions.length > 0 ? (
                  deceptions.map((dec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-[#ff453a]/15 border border-[#ff453a]/25 text-[#ff453a] text-[10px] font-medium truncate group-hover:whitespace-normal max-w-full"
                      title={dec}
                    >
                      {dec}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-white/30 italic">No overt deceptions identified</span>
                )}
              </div>
            </>
          ) : (
            <div className="pt-1.5 text-[11px] text-white/60 truncate" title={plainVerdict}>
              {plainVerdict}
            </div>
          )}
        </div>

        {/* 3. Recommended Actions */}
        <div
          onClick={() => setPopupType("ACTIONS")}
          title="Click to view complete action checklist popup"
          className={`apple-glass rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex flex-col justify-between group hover:border-emerald-500/40 hover:bg-[#062615]/90 transition-all duration-300 cursor-pointer ${
            isActionsBoxHidden ? "shrink-0 py-2.5" : "flex-1 min-h-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/50 group-hover:text-emerald-300 transition-colors">
              Recommended Actions
            </h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActionsBoxHidden(!isActionsBoxHidden);
                }}
                className="flex items-center space-x-1 text-[10px] text-white/40 hover:text-white transition-colors apple-button-press"
                title={isActionsBoxHidden ? "Unhide Recommended Actions box" : "Hide Recommended Actions box"}
              >
                {isActionsBoxHidden ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                <span>{isActionsBoxHidden ? "Show" : "Hide"}</span>
              </button>
              <Maximize2 className="w-3 h-3 text-white/30 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>

          {!isActionsBoxHidden ? (
            <>
              <div className="space-y-1.5 my-auto max-h-24 group-hover:max-h-36 group-hover:overflow-y-auto transition-all duration-300">
                {doList.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-xs text-white/80" title={item}>
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[9px]">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    <span className="leading-snug truncate group-hover:whitespace-normal group-hover:break-words transition-all">{item}</span>
                  </div>
                ))}
                {doNotList.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-1.5 text-xs text-white/80" title={item}>
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-[9px]">
                      <X className="w-2.5 h-2.5" />
                    </span>
                    <span className="leading-snug truncate group-hover:whitespace-normal group-hover:break-words transition-all">{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                {onOpenPostVictim ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPostVictim();
                    }}
                    className="w-full py-2 px-4 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 hover:text-white text-[11px] font-semibold transition-all apple-button-press flex items-center justify-center space-x-1.5 shadow-[0_2px_10px_rgba(244,63,94,0.18)] cursor-pointer group/btn"
                  >
                    <LifeBuoy className="w-3.5 h-3.5 text-rose-400 group-hover/btn:rotate-45 transition-transform" />
                    <span>I Already Interacted</span>
                    {result?.recommendations?.urgentNotice && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    )}
                  </button>
                ) : (
                  <div className="text-[10px] text-white/40 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="truncate">Active threat mitigation</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="pt-1.5 flex items-center justify-between text-xs">
              <span className="text-[11px] text-white/60">{doList.length + doNotList.length} action items</span>
              <span className="text-[10px] font-mono text-emerald-400">GUIDANCE READY</span>
            </div>
          )}
        </div>
      </aside>

      {/* Screen Popup Modal for Sidebar Box Inspection */}
      {popupType && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPopupType(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apple-glass w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-emerald-500/30"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-black/50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  {popupType === "SCORE" ? (
                    <Shield className="w-5 h-5 text-emerald-400" />
                  ) : popupType === "ASSESSMENT" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Check className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {popupType === "SCORE"
                      ? "Threat Risk Synthesis & Scoring Breakdown"
                      : popupType === "ASSESSMENT"
                      ? "Executive Threat Assessment"
                      : "Recommended Security Actions & Defensive Plan"}
                  </h3>
                  <p className="text-xs text-white/50">
                    {popupType === "SCORE"
                      ? "Deterministic telemetry fusion and risk score calculation"
                      : popupType === "ASSESSMENT"
                      ? "Complete plain-language threat deduction with full visibility"
                      : "Prioritized immediate containment and defensive actions"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPopupType(null)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.15] text-white/70 hover:text-white flex items-center justify-center transition-all apple-button-press cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-left">
              {/* SCORE POPUP */}
              {popupType === "SCORE" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/50 block">Risk Score</span>
                      <div className={`text-4xl font-bold font-mono tracking-tight mt-1 ${theme.scoreColor}`}>
                        {score}/100
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2 inline-block ${theme.badgeClass}`}
                      >
                        {theme.badgeText}
                      </span>
                      {theme.isUnknownZero && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-300 font-medium">
                          ⚠️ <strong>0/100 does NOT mean safe.</strong> Unindexed domains with zero passive DNS history lack conclusive trust anchors.
                        </div>
                      )}
                    </div>

                    <div className="text-right max-w-xs space-y-1">
                      <span className="text-xs text-white/40 block">Confidence Level</span>
                      <span className={`text-lg font-mono font-semibold ${theme.scoreColor}`}>
                        {result?.riskAssessment.confidence || 95}%
                      </span>
                      <p className="text-xs text-white/60 leading-relaxed">
                        Deterministic security evaluation synthesized across observed signals, heuristic markers, and feeds.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#062015]/80 border border-emerald-500/25 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Verdict Headline</h4>
                    <p className="text-sm text-white font-medium">{headline}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Evaluation Breakdown Summary</h4>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {result?.riskAssessment.scoreBreakdownSummary ||
                        "Deterministic security evaluation synthesized across observed signals, domain indicators, and verified security rules."}
                    </p>
                  </div>
                </div>
              )}

              {/* ASSESSMENT POPUP (All text 100% visible) */}
              {popupType === "ASSESSMENT" && (
                <div className="space-y-4">
                  {/* Complete Plain Language Verdict - NO TEXT CUT OFF */}
                  <div className="p-5 rounded-2xl bg-[#062015]/90 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Shield className="w-4 h-4" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider">Complete Plain-Language Verdict</h4>
                    </div>
                    <p className="text-sm sm:text-base text-white/95 leading-relaxed font-normal whitespace-pre-wrap select-text">
                      {plainVerdict}
                    </p>
                  </div>

                  {/* Identified Deceptions */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                      Identified Deception Mechanisms ({deceptions.length})
                    </h4>
                    <div className="space-y-2">
                      {deceptions.map((dec, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                          <span className="leading-relaxed font-medium">{dec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brand Impersonation Telemetry if available */}
                  {result?.brandVerification && (
                    <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                        Brand Identity Registry Verification
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-white/40 block">Claimed Identity:</span>
                          <span className="text-white font-medium">
                            {result.brandVerification.claimedBrand || "None detected"}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/40 block">Legitimate Registry Match:</span>
                          <span className="text-emerald-400 font-mono">
                            {result.brandVerification.status === "MATCH" ? "Official Domain" : "Unverified / Mismatch"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS POPUP */}
              {popupType === "ACTIONS" && (
                <div className="space-y-4">
                  {result?.recommendations.urgentNotice && (
                    <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block mb-0.5">Urgent Security Notice</span>
                        <p className="leading-relaxed">{result.recommendations.urgentNotice}</p>
                      </div>
                    </div>
                  )}

                  {/* DO LIST */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Check className="w-4 h-4" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider">Recommended Defensive Actions (DO)</h4>
                    </div>
                    <div className="space-y-2">
                      {(result?.recommendations.doList || doList).map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2.5 text-xs text-white/85">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                            <Check className="w-3 h-3" />
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DO NOT LIST */}
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2.5">
                    <div className="flex items-center space-x-2 text-rose-400">
                      <X className="w-4 h-4" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider">Strictly Prohibited (DO NOT)</h4>
                    </div>
                    <div className="space-y-2">
                      {(result?.recommendations.doNotList || doNotList).map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2.5 text-xs text-white/85">
                          <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                            <X className="w-3 h-3" />
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {onOpenPostVictim && (
                    <button
                      type="button"
                      onClick={() => {
                        setPopupType(null);
                        onOpenPostVictim();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/35 text-rose-200 text-xs font-semibold transition-all apple-button-press flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                    >
                      <LifeBuoy className="w-4 h-4 text-rose-400" />
                      <span>Victim Incident Response — Execute Containment Protocol</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-white/[0.08] bg-black/50 flex justify-end">
              <button
                type="button"
                onClick={() => setPopupType(null)}
                className="px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition-all apple-button-press cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
