"use client";

import React from "react";
import { RiskAssessment } from "@/lib/types";
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle } from "lucide-react";

interface RiskMeterProps {
  assessment: RiskAssessment;
}

export function RiskMeter({ assessment }: RiskMeterProps) {
  const { score, classification, confidence, verdictHeadline, scoreBreakdownSummary } = assessment;

  const getTheme = () => {
    switch (classification) {
      case "CRITICAL":
        return {
          badge: "bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30",
          barColor: "bg-[#ff453a]",
          barGlow: "shadow-[0_0_16px_rgba(255,69,58,0.6)]",
          icon: ShieldAlert,
          label: "Critical Threat",
        };
      case "HIGH":
        return {
          badge: "bg-[#ff9f0a]/15 text-[#ff9f0a] border-[#ff9f0a]/30",
          barColor: "bg-[#ff9f0a]",
          barGlow: "shadow-[0_0_16px_rgba(255,159,10,0.6)]",
          icon: ShieldAlert,
          label: "High Risk",
        };
      case "SUSPICIOUS":
        return {
          badge: "bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30",
          barColor: "bg-[#ffd60a]",
          barGlow: "shadow-[0_0_16px_rgba(255,214,10,0.6)]",
          icon: AlertTriangle,
          label: "Suspicious",
        };
      case "LOW":
        return {
          badge: "bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30",
          barColor: "bg-[#30d158]",
          barGlow: "shadow-[0_0_16px_rgba(48,209,88,0.6)]",
          icon: ShieldCheck,
          label: "Verified Authentic",
        };
      default:
        return {
          badge: "bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30",
          barColor: "bg-[#ffd60a]",
          barGlow: "shadow-[0_0_12px_rgba(255,214,10,0.4)]",
          icon: AlertTriangle,
          label: "Unidentified / Inconclusive",
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
        {/* Left: Score Badge & Headline */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3.5 sm:gap-6">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.04] border border-white/[0.1] flex flex-col items-center justify-center p-2 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] shrink-0">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {score}
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/40 uppercase font-medium">
              Risk Index
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border tracking-tight flex items-center space-x-1.5 ${theme.badge}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{theme.label}</span>
              </span>
              <span className="text-[11px] sm:text-xs text-white/40 font-mono">
                Evidence Confidence: {confidence}%
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-semibold text-white tracking-[-0.02em]">
              {verdictHeadline}
            </h2>
          </div>
        </div>

        {/* Right: Refined Apple Glass Progress Bar */}
        <div className="w-full md:w-60 space-y-2">
          <div className="flex justify-between text-xs text-white/50 font-mono">
            <span>Threat Score</span>
            <span>{score}/100</span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${theme.barColor} ${theme.barGlow}`}
              style={{ width: `${Math.max(score, 5)}%` }}
            />
          </div>
          <p className="text-[11px] text-white/40 leading-snug">
            Deterministic evaluation synthesized across all observed security factors.
          </p>
        </div>
      </div>

      {/* Prominent Warning Banner if Unidentified / Score 0 */}
      {classification === "UNKNOWN" && (
        <div className="p-4 rounded-2xl bg-[#ffd60a]/10 border border-[#ffd60a]/25 flex items-start space-x-3 text-white shadow-[inset_0_1px_0_0_rgba(255,214,10,0.15)]">
          <AlertTriangle className="w-4 h-4 text-[#ffd60a] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold text-[#ffd60a] block">
              Notice: 0/100 Does Not Equal Safe — Status Unidentified
            </span>
            <p className="text-white/70 leading-relaxed">
              Not enough security details are available for this target. In active phishing campaigns, newly registered domains show zero initial threat flags before security vendors index them. Do not assume zero detections means the website is legitimate.
            </p>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-xs text-white/70 gap-2">
        <span>{scoreBreakdownSummary}</span>
        <span className="text-[11px] text-white/35 italic">
          *Internal security index based on observable signals.
        </span>
      </div>
    </div>
  );
}
