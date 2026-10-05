"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { InvestigationInput } from "@/components/InvestigationInput";
import { ThreatReport } from "@/components/ThreatReport";
import { InvestigationResult } from "@/lib/types";
import { AlertCircle, Shield } from "lucide-react";

export default function Home() {
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    <div className="min-h-screen text-white flex flex-col selection:bg-white/20 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-12">
        {/* Input & Hero Section */}
        <InvestigationInput onInvestigate={handleInvestigate} isLoading={isLoading} />

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

        {/* Results Section */}
        {investigationResult && (
          <section className="pt-4 space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">
                Intelligence Threat Assessment
              </h2>
            </div>
            <ThreatReport result={investigationResult} />
          </section>
        )}
      </main>

      {/* Apple-style Minimal Footer */}
      <footer className="border-t border-white/[0.06] py-8 text-xs text-white/40 mt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-white/40" />
            <span className="font-medium text-white/60">TrustLens Architecture</span>
            <span>—</span>
            <span>Zero-Trust Scam Intelligence</span>
          </div>

          <div className="flex items-center space-x-4 text-white/40">
            <span>DETECT → VERIFY → REASON → EXPLAIN → PROTECT</span>
            <span>|</span>
            <span className="font-mono text-white/60">THINK AI 4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
