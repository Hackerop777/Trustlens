"use client";

import React from "react";
import { Shield, Sparkles, Activity } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#06090e]/60 border-b border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.15] flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)]">
            <Shield className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-lg tracking-[-0.03em] text-white">
              TrustLens
            </span>
            <span className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
              Scam Intelligence
            </span>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-medium">Active Telemetry</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50">
            <Sparkles className="w-3 h-3 text-sky-400/80" />
            <span>Gemini 3.8</span>
          </div>
        </div>
      </div>
    </header>
  );
}
