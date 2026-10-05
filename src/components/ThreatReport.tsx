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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white/50 pb-2 gap-2 border-b border-white/[0.06]">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-mono text-sky-400">
            <Fingerprint className="w-3.5 h-3.5" />
            <span>ID: {id}</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="flex items-center space-x-1.5 text-white/40">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(createdAt).toLocaleString()}</span>
          </span>
        </div>

        <div className="font-mono text-white/80 truncate max-w-md bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08] text-[11px]">
          Target: {target}
        </div>
      </div>

      {/* 2. Primary Risk Meter & Verdict */}
      <RiskMeter assessment={riskAssessment} />

      {/* 3. Plain Language Explanation */}
      <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white">
            <Info className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-semibold tracking-[-0.02em]">
              Executive Threat Assessment
            </h3>
          </div>
          {aiAssessment.isAiFallback ? (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]">
              Deterministic Engine
            </span>
          ) : (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-medium">
              Gemini 3.8 Flash Reasoned
            </span>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-sm leading-relaxed text-white/90">
          {aiAssessment.plainLanguageVerdict}
        </div>

        {/* Identified Deceptions */}
        {aiAssessment.identifiedDeceptions && aiAssessment.identifiedDeceptions.length > 0 && (
          <div className="pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40 block mb-2">
              Identified Deception Tactics:
            </span>
            <div className="flex flex-wrap gap-2">
              {aiAssessment.identifiedDeceptions.map((dec, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-[#ff453a]/10 border border-[#ff453a]/20 text-[#ff453a] text-xs font-medium"
                >
                  {dec}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Attack Chain Progression */}
      <AttackChainView steps={aiAssessment.attackChain} />

      {/* 5. Recommended Actions (DO / DO NOT) */}
      <ActionChecklist
        recommendations={recommendations}
        onOpenPostVictim={() => setIsPostVictimOpen(true)}
      />

      {/* 6. Observable Evidence Cards */}
      <EvidenceList evidence={evidence} />

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
