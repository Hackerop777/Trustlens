"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { InvestigationResult, CaseMemory } from "@/lib/types";
import { GraphMindCanvas } from "@/components/studio/GraphMindCanvas";
import { Navbar } from "@/components/Navbar";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Shield,
  Layers,
  Compass,
} from "lucide-react";

function StudioContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [caseMemory, setCaseMemory] = useState<CaseMemory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const targetId = id || "copilot_default";

    // 1. Fetch case memory directly
    fetch(`/api/investigate/studio?id=${encodeURIComponent(targetId)}`)
      .then(async (res) => {
        if (!res.ok) {
          // If studio endpoint fails, try fetching base investigation
          const invRes = await fetch(`/api/investigate?id=${encodeURIComponent(id)}`);
          if (!invRes.ok) throw new Error("Investigation not found");
          const invData = await invRes.json();
          setInvestigation(invData);

          // Retry studio initialization
          const retryRes = await fetch(`/api/investigate/studio?id=${encodeURIComponent(id)}`);
          if (!retryRes.ok) throw new Error("Could not initialize Studio case");
          return retryRes.json();
        }
        return res.json();
      })
      .then((data: CaseMemory) => {
        setCaseMemory(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Studio loading error:", err);
        setError(err?.message || "Failed to load investigation studio.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs font-mono tracking-wider">
          Loading GraphMind Investigation Studio...
        </span>
      </div>
    );
  }

  if (error || !caseMemory) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-red-300 space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-sm font-semibold">Studio Initialization Notice</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Full-Screen Canvas */}
      <div className="flex-1 min-h-0 relative">
        <GraphMindCanvas
          caseMemory={caseMemory}
          onUpdateCaseMemory={(updated) => setCaseMemory(updated)}
        />
      </div>
    </div>
  );
}

export default function StudioPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070B12] text-white flex flex-col font-sans">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-mono">
            Loading Studio environment...
          </div>
        }
      >
        <StudioContent />
      </Suspense>
    </div>
  );
}
