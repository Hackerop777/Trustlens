"use client";

import React from "react";
import { Shield, Sparkles, Activity } from "lucide-react";

import Link from "next/link";

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

        {/* Status Pills & Navigation Links */}
        <div className="flex items-center space-x-2.5">
          <Link
            href="/studio"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#0d221b]/90 hover:bg-[#133328] border border-emerald-500/40 text-[11px] text-emerald-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors"
            title="Open GraphMind Copilot Whiteboard Chat"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold tracking-tight">Copilot Studio</span>
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              GraphMind
            </span>
          </Link>

          <Link
            href="/demo-phish-fixture"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-red-950/60 hover:bg-red-900/70 border border-red-500/30 text-[11px] text-red-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors"
            title="Launch Synthetic Demo Test Page for Extension Testing"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
            <span className="font-medium tracking-tight">Demo Test Fixture</span>
          </Link>

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
