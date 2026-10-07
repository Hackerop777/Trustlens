"use client";

import React, { useState } from "react";
import { InvestigationResult } from "@/lib/types";
import { RiskMeter } from "./RiskMeter";
import { AttackChainView } from "./AttackChainView";
import { EvidenceList } from "./EvidenceCard";
import { ActionChecklist } from "./ActionChecklist";
import { FollowUpChat } from "./FollowUpChat";
import { PostVictimModal } from "./PostVictimModal";
import {
  Code2,
  ChevronDown,
  ChevronUp,
  Clock,
  Fingerprint,
  Info,
} from "lucide-react";

interface ThreatReportProps {
  result: InvestigationResult;
}

export function ThreatReport({ result }: ThreatReportProps) {
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [isPostVictimOpen, setIsPostVictimOpen] = useState(false);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white/50 pb-2 gap-2.5 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center space-x-1.5 font-mono text-emerald-400">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>ID: {id}</span>
          </span>
          <span className="text-white/20 hidden xs:inline">|</span>
          <span className="flex items-center space-x-1.5 text-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(createdAt).toLocaleString()}</span>
          </span>
        </div>

        <div className="font-mono text-white/80 truncate max-w-full sm:max-w-md bg-[#162224]/80 px-3.5 py-1.5 rounded-full border border-white/[0.08] text-[11px] shadow-inner w-full sm:w-auto">
          Target: {target}
        </div>
      </div>

      {/* 2. Main Investigation Modules Grid */}
      <div className="space-y-6">
        {/* Top Row: Executive Threat Assessment Synopsis & Action Checklist blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Executive Threat Assessment
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                Autonomous Verification
              </span>
            </div>
            <p className="text-xs text-white/85 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.04]">
              {aiAssessment.plainLanguageVerdict}
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-white/50">
              <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-emerald-400">
                Verified Analysis
              </span>
              {aiAssessment.identifiedDeceptions && aiAssessment.identifiedDeceptions.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-300">
                  {aiAssessment.identifiedDeceptions[0]}
                </span>
              )}
            </div>
          </div>

          <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Recommended Actions
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start space-x-2 text-emerald-300">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  ✓
                </span>
                <span>{recommendations.doList[0] || "Verify browser URL address bar displays lock icon"}</span>
              </div>
              <div className="flex items-start space-x-2 text-rose-300">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  ✕
                </span>
                <span>{recommendations.doNotList[0] || "Avoid entering 2FA tokens or passwords"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attack Chain Progression */}
        <AttackChainView steps={aiAssessment.attackChain} />

        {/* Observable Evidence Cards */}
        <EvidenceList evidence={evidence} />
      </div>

      {/* 7. Limitations & Scope Notices */}
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

      {/* 8. Conversational Follow-Up Assistant */}
      <FollowUpChat investigation={result} />

      {/* 9. Technical Evidence Inspector (JSON) */}
      <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-black/30">
        <button
          onClick={() => setShowJsonInspector(!showJsonInspector)}
          className="w-full p-4 flex items-center justify-between text-xs text-white/50 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span className="font-mono">Raw Telemetry & Evidence Payload (JSON)</span>
          </div>
          {showJsonInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showJsonInspector && (
          <div className="p-4 bg-black/80 border-t border-white/[0.06] text-[11px] font-mono text-white/70 overflow-x-auto max-h-96">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Post-Victim Modal */}
      <PostVictimModal
        isOpen={isPostVictimOpen}
        onClose={() => setIsPostVictimOpen(false)}
        claimedBrand={brandVerification?.claimedBrand}
      />
    </div>
  );
}
