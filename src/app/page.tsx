"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { InvestigationInput } from "@/components/InvestigationInput";
import { ThreatReport } from "@/components/ThreatReport";
import { ExecutiveSidebar } from "@/components/ExecutiveSidebar";
import { PostVictimModal } from "@/components/PostVictimModal";
import { BackgroundShield } from "@/components/BackgroundShield";
import { InvestigationResult } from "@/lib/types";
import { AlertCircle, Shield, Eye, EyeOff } from "lucide-react";

export default function Home() {
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPostVictimOpen, setIsPostVictimOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  // Deep-linking: Load investigation by ID if accessed via extension or shared link
  React.useEffect(() => {
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
          window.scrollTo({
            top: 440,
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

  const handleInvestigate = async (target: string, type: "URL" | "MESSAGE" | "QR" | "IMAGE" = "URL") => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: target, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Investigation request failed");
      }

      const data: InvestigationResult = await response.json();
      setInvestigationResult(data);

      // Smooth scroll to report
      setTimeout(() => {
        window.scrollTo({
          top: 440,
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
    <div className="h-screen w-screen overflow-hidden text-white flex flex-col selection:bg-white/20 selection:text-white relative">
      {/* 20% Transparency Animated Cyber Shield in Background (dynamically centered) */}
      <BackgroundShield isSidebarHidden={isSidebarHidden} />

      <Navbar />

      <main className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 py-3 flex flex-col overflow-hidden">
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
              className="absolute top-2 left-4 sm:top-3 sm:left-6 z-30 apple-glass px-4 py-1.5 rounded-full border border-emerald-500/35 text-emerald-400 hover:text-emerald-300 hover:bg-[#072418]/90 transition-all flex items-center space-x-2 text-xs font-medium shadow-[0_4px_16px_rgba(0,0,0,0.8)] apple-button-press group cursor-pointer"
              title="Unhide Threat Intelligence Boxes"
              style={{ borderRadius: "80px" }}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Show Intelligence Panels (3)</span>
            </button>
          )}

          {/* Right Main Column: Hero Headline, URL Bar, Options & Dynamic Investigation Results */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1 space-y-5 w-full">
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

      {/* Emergency Incident Containment Protocol Modal */}
      <PostVictimModal
        isOpen={isPostVictimOpen}
        onClose={() => setIsPostVictimOpen(false)}
        claimedBrand={investigationResult?.brandVerification?.claimedBrand || undefined}
      />

      {/* Apple-style Minimal Docked Footer */}
      <footer className="shrink-0 border-t border-white/[0.06] py-2 px-4 sm:px-8 text-[11px] text-white/40">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-white/40" />
            <span className="font-medium text-white/60">TrustLens Architecture</span>
            <span>—</span>
            <span>Zero-Trust Scam Intelligence</span>
          </div>

          <div className="flex items-center space-x-3 text-white/40">
            <span>DETECT → VERIFY → REASON → EXPLAIN → PROTECT</span>
            <span>|</span>
            <span className="font-mono text-white/60">THINK AI 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
