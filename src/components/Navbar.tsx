"use client";

import React from "react";
import { Shield, Sparkles, Activity } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#030e09]/80 border-b border-emerald-500/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-lg tracking-[-0.03em] text-white">
              TrustLens
            </span>
            <span className="text-[11px] font-medium tracking-wider text-white/40 uppercase">
              Scam Intelligence
            </span>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#162725]/80 border border-emerald-500/25 text-[11px] text-emerald-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span className="font-medium tracking-tight">Active Telemetry</span>
          </div>

          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#12202f]/80 border border-sky-500/25 text-[11px] text-sky-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
            <span className="font-medium tracking-tight">Integration Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
