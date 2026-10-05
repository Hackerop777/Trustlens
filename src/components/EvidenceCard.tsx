"use client";

import React, { useState } from "react";
import { EvidenceItem } from "@/lib/types";
import {
  ChevronDown,
  ChevronUp,
  Database,
  Lock,
  Globe,
  Radio,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface EvidenceListProps {
  evidence: EvidenceItem[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30";
      case "HIGH":
        return "bg-[#ff9f0a]/15 text-[#ff9f0a] border-[#ff9f0a]/30";
      case "MEDIUM":
        return "bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30";
      case "LOW":
        return "bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30";
      default:
        return "bg-white/[0.06] text-white/60 border-white/[0.1]";
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "BRAND_IDENTITY":
        return Globe;
      case "CREDENTIAL_HARVESTING":
        return Lock;
      case "SOCIAL_ENGINEERING":
        return AlertTriangle;
      case "THREAT_INTELLIGENCE":
        return Radio;
      case "PAGE_CONTENT":
        return FileText;
      default:
        return Database;
    }
  };

  if (!evidence || evidence.length === 0) {
    return (
      <div className="apple-glass rounded-2xl p-6 text-center text-white/50 text-xs">
        No anomalous evidence items recorded for this investigation.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white tracking-[-0.02em]">
          Observable Evidence Telemetry ({evidence.length})
        </h3>
        <span className="text-xs text-white/40">
          Deterministic signals, VirusTotal & GSB flags
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {evidence.map((item) => {
          const Icon = getCategoryIcon(item.category);
          const isExpanded = expandedId === item.id;
          const hasDetails = Boolean(item.technicalDetails && Object.keys(item.technicalDetails).length > 0);

          return (
            <div
              key={item.id}
              className="apple-glass-subtle rounded-2xl p-4 flex flex-col justify-between hover:border-white/[0.15] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/70">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-mono text-white/40">{item.id}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getSeverityBadge(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-white mb-1 leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-white/40">
                <span className="truncate max-w-[200px]">Source: {item.source}</span>
                {hasDetails && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center space-x-1 text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <span>{isExpanded ? "Hide" : "Details"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {isExpanded && item.technicalDetails && (
                <div className="mt-2 p-2.5 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-[11px] text-white/70 overflow-x-auto">
                  <pre>{JSON.stringify(item.technicalDetails, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
