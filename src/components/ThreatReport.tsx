"use client";

import React, { useState } from "react";
import { InvestigationResult } from "@/lib/types";
import { AttackChainView } from "./AttackChainView";
import { EvidenceList } from "./EvidenceCard";
import { FollowUpChat } from "./FollowUpChat";
import { PostVictimModal } from "./PostVictimModal";
import {
  Code2,
  ChevronDown,
  ChevronUp,
  Clock,
  Fingerprint,
  Share2,
  Check,
} from "lucide-react";

interface ThreatReportProps {
  result: InvestigationResult;
  onOpenPostVictim?: () => void;
}

export function ThreatReport({ result, onOpenPostVictim }: ThreatReportProps) {
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [isPostVictimOpen, setIsPostVictimOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "shared">("idle");

  const handleShareEvidenceJson = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const jsonString = JSON.stringify(result, null, 2);
      const safeTarget = (result.target || "investigation").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
      const fileName = `trustlens-evidence-${safeTarget}-${Date.now()}.json`;
      const blob = new Blob([jsonString], { type: "application/json" });

      // 1. Try Native Web Share API with File
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const file = new File([blob], fileName, { type: "application/json" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `TrustLens Evidence Payload - ${result.target}`,
              text: `Security telemetry and evidence payload for ${result.target} (Risk Score: ${result.riskAssessment?.score}/100)`,
              files: [file],
            });
            setShareStatus("shared");
            setTimeout(() => setShareStatus("idle"), 2500);
            return;
          }
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            return;
          }
          console.warn("Native file share fallback:", shareErr);
        }
      }

      // 2. Direct File Download (guaranteed shareable .json file on all platforms)
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      // 3. Convenience clipboard copy
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(jsonString);
        } catch {
          // ignore
        }
      }

      setShareStatus("shared");
      setTimeout(() => setShareStatus("idle"), 2500);
    } catch (err) {
      console.error("Failed to share evidence JSON:", err);
    }
  };

  const {
    id,
    createdAt,
    target,
    brandVerification,
    evidence,
    aiAssessment,
    riskAssessment,
    recommendations,
    limitations,
  } = result;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header Metadata Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white/50 pb-2 gap-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-mono text-emerald-400">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>ID: {id}</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center space-x-1.5 text-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(createdAt).toLocaleString()}</span>
          </span>
        </div>

        <div className="font-mono text-white/80 truncate max-w-md bg-[#162224]/80 px-3.5 py-1.5 rounded-full border border-white/[0.08] text-[11px] shadow-inner">
          Target: {target}
        </div>
      </div>

      {/* 2. In-Depth Investigation Intelligence */}
      <div className="space-y-6">
        {/* Attack Chain Progression */}
        <AttackChainView steps={aiAssessment.attackChain} />

        {/* Observable Evidence Cards */}
        <EvidenceList evidence={evidence} />

        {/* Conversational Follow-Up Assistant */}
        <FollowUpChat investigation={result} />
      </div>

      {/* 3. Limitations & Scope Notices */}
      {limitations && limitations.length > 0 && (
        <div className="apple-glass-subtle rounded-2xl p-4 text-xs text-white/50 space-y-1.5">
          <span className="font-semibold text-white/70 block">Analysis Boundaries & Verification Notes:</span>
          <ul className="list-disc list-inside space-y-1 text-white/50">
            {limitations.map((lim, idx) => (
              <li key={idx} className="leading-relaxed">
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Technical Evidence Inspector (JSON) with Shareable File Export */}
      <div className="border border-white/[0.08] hover:border-emerald-500/25 rounded-2xl overflow-hidden bg-black/40 transition-colors">
        <div className="w-full p-3.5 sm:p-4 flex items-center justify-between text-xs text-white/60">
          <button
            type="button"
            onClick={() => setShowJsonInspector(!showJsonInspector)}
            className="flex items-center space-x-2.5 text-left hover:text-white transition-colors cursor-pointer group"
          >
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-white/80 group-hover:text-emerald-300 transition-colors">
              Raw Telemetry & Evidence Payload
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              .JSON
            </span>
            {showJsonInspector ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
          </button>

          {/* Shareable JSON File Button (Cohesive Pill Style) */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleShareEvidenceJson}
              title="Share or download evidence payload as a shareable .json file"
              className="px-3.5 py-1.5 rounded-full bg-[#0c2a1e] hover:bg-[#0f3828] border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-all apple-button-press flex items-center space-x-1.5 shadow-[0_2px_8px_rgba(16,185,129,0.18)] cursor-pointer"
            >
              {shareStatus === "shared" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-mono">File Shared!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-mono hidden sm:inline">Share JSON File</span>
                  <span className="text-[11px] font-mono sm:hidden">Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showJsonInspector && (
          <div className="p-4 bg-black/90 border-t border-emerald-500/15 text-[11px] font-mono text-emerald-300/80 overflow-x-auto max-h-96">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Post-Victim Modal (Fallback if not handled at page level) */}
      {!onOpenPostVictim && (
        <PostVictimModal
          isOpen={isPostVictimOpen}
          onClose={() => setIsPostVictimOpen(false)}
          claimedBrand={brandVerification?.claimedBrand}
        />
      )}
    </div>
  );
}
