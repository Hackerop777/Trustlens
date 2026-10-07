"use client";

import React from "react";
import { RecommendedActions } from "@/lib/types";
import { Check, X, AlertTriangle, LifeBuoy } from "lucide-react";

interface ActionChecklistProps {
  recommendations: RecommendedActions;
  onOpenPostVictim: () => void;
}

export function ActionChecklist({ recommendations, onOpenPostVictim }: ActionChecklistProps) {
  const { doList, doNotList, urgentNotice } = recommendations;

  return (
    <div className="space-y-4">
      {urgentNotice && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ff453a]/10 border border-[#ff453a]/25 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-white shadow-[inset_0_1px_0_0_rgba(255,69,58,0.2)]">
          <div className="flex items-start space-x-2.5 flex-1">
            <AlertTriangle className="w-5 h-5 text-[#ff453a] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-xs sm:text-sm block mb-0.5 text-[#ff453a]">Urgent Security Notice</span>
              <p className="text-xs text-white/70 leading-relaxed">{urgentNotice}</p>
            </div>
          </div>
          <button
            onClick={onOpenPostVictim}
            className="w-full sm:w-auto justify-center px-3.5 py-1.5 rounded-full bg-[#ff453a] hover:bg-[#ff453a]/90 text-white text-xs font-semibold shrink-0 transition-all apple-button-press shadow-[0_2px_10px_rgba(255,69,58,0.3)] flex items-center space-x-1.5"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>I Already Interacted</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {/* DO LIST */}
        <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center space-x-2 text-[#30d158] mb-1">
            <div className="w-5 h-5 rounded-full bg-[#30d158]/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-[#30d158]" />
            </div>
            <h4 className="font-semibold text-sm text-white tracking-tight">
              Recommended Actions (DO)
            </h4>
          </div>
          <ul className="space-y-2.5">
            {doList.map((item, idx) => (
              <li key={idx} className="flex items-start space-x-2.5 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* DO NOT LIST */}
        <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center space-x-2 text-[#ff453a] mb-1">
            <div className="w-5 h-5 rounded-full bg-[#ff453a]/20 flex items-center justify-center">
              <X className="w-3 h-3 text-[#ff453a]" />
            </div>
            <h4 className="font-semibold text-sm text-white tracking-tight">
              Strictly Avoid (DO NOT)
            </h4>
          </div>
          <ul className="space-y-2.5">
            {doNotList.map((item, idx) => (
              <li key={idx} className="flex items-start space-x-2.5 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff453a] mt-1.5 shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
