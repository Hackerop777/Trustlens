"use client";

import React from "react";
import { InvestigationResult } from "@/lib/types";
import { EyeOff, Eye, Check, X, LifeBuoy } from "lucide-react";

interface ExecutiveSidebarProps {
  result: InvestigationResult | null;
  onOpenPostVictim?: () => void;
}

export function ExecutiveSidebar({ result, onOpenPostVictim }: ExecutiveSidebarProps) {
  const [isScoreHidden, setIsScoreHidden] = React.useState(false);

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
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4 animate-in fade-in duration-300">
      {/* 1. Threat Score Block */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="font-medium text-white/70">Threat Score</span>
          <button
            onClick={() => setIsScoreHidden(!isScoreHidden)}
            className="flex items-center space-x-1 text-[11px] text-white/40 hover:text-white transition-colors apple-button-press"
          >
            {isScoreHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{isScoreHidden ? "Show" : "Hide"}</span>
          </button>
        </div>

        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-bold font-mono tracking-tight text-white">
            {isScoreHidden ? "•••" : `${score}/100`}
          </span>
        </div>

        <div className="text-xs text-emerald-400 font-medium">
          {headline}
        </div>

        {/* Apple Glass Progress Bar */}
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              score >= 75
                ? "bg-[#ff453a] shadow-[0_0_12px_rgba(255,69,58,0.7)]"
                : score >= 40
                ? "bg-[#ff9f0a] shadow-[0_0_12px_rgba(255,159,10,0.7)]"
                : "bg-[#30d158] shadow-[0_0_12px_rgba(48,209,88,0.7)]"
            }`}
            style={{ width: `${Math.max(score, isScoreHidden ? 0 : 4)}%` }}
          />
        </div>

        <div className="text-[11px] text-white/40 pt-0.5 leading-relaxed">
          {result
            ? `Confidence: ${result.riskAssessment.confidence}% • ${result.riskAssessment.scoreBreakdownSummary}`
            : "Deterministic security evaluation synthesized across all observed security signals."}
        </div>
      </div>

      {/* 2. Executive Threat Assessment */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Executive Threat Assessment
        </h4>
        <div className="text-xs text-white/85 leading-relaxed bg-black/35 p-3.5 rounded-2xl border border-white/[0.05]">
          {plainVerdict}
        </div>
        {deceptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {deceptions.map((dec, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-full bg-[#ff453a]/15 border border-[#ff453a]/25 text-[#ff453a] text-[11px] font-medium"
              >
                {dec}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Recommended Actions */}
      <div className="apple-glass rounded-3xl p-5 sm:p-6 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          Recommended Actions
        </h4>
        <div className="space-y-2.5">
          {doList.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-white/80">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                <Check className="w-2.5 h-2.5" />
              </span>
              <span className="leading-snug">{item}</span>
            </div>
          ))}
          {doNotList.map((item, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-white/80">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                <X className="w-2.5 h-2.5" />
              </span>
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </div>

        {result?.recommendations.urgentNotice && onOpenPostVictim && (
          <button
            onClick={onOpenPostVictim}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all apple-button-press flex items-center justify-center space-x-1.5"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>I Already Interacted</span>
          </button>
        )}
      </div>
    </aside>
  );
}
