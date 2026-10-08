"use client";

import React, { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { InvestigationInput } from "@/components/InvestigationInput";
import { ThreatReport } from "@/components/ThreatReport";
import { ExecutiveSidebar } from "@/components/ExecutiveSidebar";
import { PostVictimModal } from "@/components/PostVictimModal";
import { BackgroundShield } from "@/components/BackgroundShield";
import { InvestigationResult } from "@/lib/types";
import { getRiskTheme } from "@/lib/theme/risk-theme";
import { AlertCircle, Eye, AlertTriangle } from "lucide-react";

export default function Home() {
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPostVictimOpen, setIsPostVictimOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const theme = getRiskTheme(investigationResult);

  // Deep-linking: Load investigation by ID if accessed via extension or shared link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;

    setIsLoading(true);
    fetch(`/api/investigate?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Investigation not found");
        return res.json();
      })
      .then((data: InvestigationResult) => {
        setInvestigationResult(data);
        setTimeout(() => {
          mainScrollRef.current?.scrollTo({
            top: 430,
            behavior: "smooth",
          });
        }, 200);
      })
      .catch((err) => {
        console.warn("Could not load deep-linked investigation:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleInvestigate = async (
    target: string,
    type: "URL" | "MESSAGE" | "QR" | "IMAGE" = "URL",
    imageData?: string
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: target, type, imageData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Investigation request failed");
      }

      const data: InvestigationResult = await response.json();
      setInvestigationResult(data);

      // Smooth buttery scroll directly to intelligence report
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          top: 430,
          behavior: "smooth",
        });
      }, 200);
    } catch (err: any) {
      console.error("Investigation error:", err);
      setErrorMessage(err?.message || "Failed to complete investigation. Please verify the target syntax.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-theme={theme.themeKey.toLowerCase()}
      className="h-screen w-screen overflow-hidden text-white flex flex-col selection:bg-white/20 selection:text-white relative transition-colors duration-1000"
    >
      {/* Dynamic Center Radial Overtake Wave (Washes from center over screen when threat score shifts) */}
      <div
        key={theme.themeKey}
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      >
        <div
          className="absolute inset-0 animate-radial-overtake transition-all duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${theme.centerRadialColor} 0%, transparent 72%)`,
          }}
        />
      </div>

      {/* Dynamic Theme-Aware Animated Cyber Shield in Background */}
      <BackgroundShield isSidebarHidden={isSidebarHidden} themeKey={theme.themeKey} />

      <Navbar />

      <main className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col overflow-hidden relative z-10">
        {/* Top-Level Layout: Left Sidebar + Main Content Workspace */}
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-stretch w-full h-full min-h-0 relative">
          {/* Left Vertical Column: Threat Score, Assessment & Actions */}
          {!isSidebarHidden ? (
            <div className="w-full lg:w-[320px] xl:w-[340px] shrink-0 h-full min-h-0 flex flex-col transition-all duration-300">
              <ExecutiveSidebar
                result={investigationResult}
                onOpenPostVictim={() => setIsPostVictimOpen(true)}
                onHide={() => setIsSidebarHidden(true)}
              />
            </div>
          ) : (
            /* Floating Unhide Button - positioned in top-left so workspace centers with 100% precision */
            <button
              type="button"
              onClick={() => setIsSidebarHidden(false)}
              className="absolute top-2 left-4 sm:top-3 sm:left-6 z-30 apple-glass px-4 py-1.5 rounded-full border border-emerald-600/35 text-emerald-400 hover:text-emerald-300 hover:bg-[#062615]/90 transition-all flex items-center space-x-2 text-xs font-medium shadow-[0_4px_16px_rgba(0,0,0,0.8)] apple-button-press group cursor-pointer"
              title="Unhide Threat Intelligence Boxes"
              style={{ borderRadius: "80px" }}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Show Intelligence Panels (3)</span>
            </button>
          )}

          {/* Right Main Column: Hero Headline, Search Bar, Options & Dynamic Investigation Results */}
          <div
            ref={mainScrollRef}
            className="flex-1 min-w-0 h-full overflow-y-auto pr-1 space-y-5 w-full scroll-smooth"
          >
            {/* Input & Hero Section */}
            <InvestigationInput
              onInvestigate={handleInvestigate}
              isLoading={isLoading}
              isExpanded={isSidebarHidden}
            />

            {/* Error Alert */}
            {errorMessage && (
              <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-[#ff453a]/10 border border-[#ff453a]/25 text-white text-xs flex items-center space-x-3 shadow-lg">
                <AlertCircle className="w-5 h-5 text-[#ff453a] shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5 text-[#ff453a]">Notice</span>
                  <p className="text-white/80">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Prominent Callout Banner when Score is 0/100 UNKNOWN */}
            {investigationResult && theme.isUnknownZero && (
              <div className="max-w-4xl mx-auto p-4 sm:p-4.5 rounded-2xl bg-amber-500/10 border border-amber-400/35 text-white text-xs flex items-start sm:items-center space-x-3.5 shadow-[0_4px_24px_rgba(245,158,11,0.18)] animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-amber-300 text-sm tracking-tight">
                      Security Alert: 0/100 does NOT mean this domain is safe
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      UNKNOWN POSTURE
                    </span>
                  </div>
                  <p className="text-white/80 mt-1 leading-relaxed text-xs">
                    This domain has zero historical passive DNS records and no verified institutional identity. In TrustLens, unindexed domains are classified as <strong>UNKNOWN</strong> with a baseline score of 0/100 to prevent false confidence. Exercise caution before entering credentials.
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Results Modules */}
            {investigationResult && (
              <section className="pt-2 space-y-6">
                <ThreatReport
                  result={investigationResult}
                  onOpenPostVictim={() => setIsPostVictimOpen(true)}
                />
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Post-Victim Containment & Remediation Drawer */}
      <PostVictimModal
        isOpen={isPostVictimOpen}
        onClose={() => setIsPostVictimOpen(false)}
        claimedBrand={investigationResult?.brandVerification?.claimedBrand}
      />
    </div>
  );
}
