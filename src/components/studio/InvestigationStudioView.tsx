"use client";

import React, { useState, useEffect } from "react";
import { InvestigationResult, CaseMemory } from "@/lib/types";
import { GraphMindCanvas } from "./GraphMindCanvas";
import { getOrCreateCaseMemory } from "@/lib/investigation/case-memory";
import {
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Database,
  Search,
  ExternalLink,
} from "lucide-react";

interface InvestigationStudioViewProps {
  investigation: InvestigationResult;
  onOpenPostVictim?: () => void;
}

export function InvestigationStudioView({
  investigation,
  onOpenPostVictim,
}: InvestigationStudioViewProps) {
  const [caseMemory, setCaseMemory] = useState<CaseMemory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch Case Memory
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/investigate/studio?id=${encodeURIComponent(investigation.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not initialize Studio case memory");
        return res.json();
      })
      .then((data: CaseMemory) => {
        if (isMounted) {
          setCaseMemory(data);
          setError(null);
        }
      })
      .catch((err) => {
        console.warn("Studio fetch fallback to local builder:", err);
        if (isMounted) {
          // Client-side deterministic fallback
          const localMemory = getOrCreateCaseMemory(investigation);
          setCaseMemory(localMemory);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [investigation]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] rounded-3xl bg-[#070B12] border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs font-mono tracking-wider">
          Compiling GraphMind Directed Acyclic Graph &amp; Case Memory...
        </span>
      </div>
    );
  }

  if (error || !caseMemory) {
    return (
      <div className="w-full p-8 rounded-3xl bg-red-950/20 border border-red-500/30 text-red-300 text-xs text-center">
        Failed to initialize Investigation Studio: {error}
      </div>
    );
  }

  // Count epistemic categories
  const factCount = caseMemory.nodes.filter((n) => n.epistemicType === "OBSERVED_FACT").length;
  const verifiedCount = caseMemory.nodes.filter((n) => n.epistemicType === "EXTERNALLY_VERIFIED").length;
  const inferenceCount = caseMemory.nodes.filter((n) => n.epistemicType === "AI_INFERENCE").length;
  const inquiryCount = caseMemory.nodes.filter((n) => n.epistemicType === "USER_INQUIRY").length;

  return (
    <div className="w-full space-y-4">
      {/* Studio Header & Epistemic Legend Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090E17]/90 border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>GraphMind Investigation Canvas</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                ACTIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive 2D spatial graph with ancestor-only context isolation &amp; short-term case memory.
            </p>
          </div>
        </div>

        {/* Epistemic Counts */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            {factCount} Observed Facts
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-300">
            {verifiedCount} Verified
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300">
            {inferenceCount} AI Inferences
          </span>
          {inquiryCount > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300">
              {inquiryCount} Inquiries
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="w-full h-[680px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
        <GraphMindCanvas
          caseMemory={caseMemory}
          onUpdateCaseMemory={(updated) => setCaseMemory(updated)}
        />
      </div>
    </div>
  );
}
