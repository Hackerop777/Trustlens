"use client";

import React from "react";
import { AttackChainStep } from "@/lib/types";
import { ArrowRight, AlertOctagon } from "lucide-react";

interface AttackChainViewProps {
  steps: AttackChainStep[];
}

export function AttackChainView({ steps }: AttackChainViewProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-4">
      <div className="flex items-center space-x-2">
        <AlertOctagon className="w-4 h-4 text-sky-400" />
        <h3 className="text-base font-semibold text-white tracking-[-0.02em]">
          Attack Chain Kill-Sequence
        </h3>
        <span className="text-xs text-white/40">
          (AI Reasoned Threat Trajectory)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
        {steps.map((step, idx) => (
          <div
            key={step.step}
            className="apple-glass-subtle rounded-2xl p-4 flex flex-col justify-between relative group hover:border-white/20 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/[0.15] text-white text-xs font-mono font-semibold flex items-center justify-center">
                  {step.step}
                </span>
                <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">
                  Stage {step.step}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mb-1.5 leading-snug">
                {step.stage}
              </h4>
              <p className="text-xs text-white/60 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>

            {idx < steps.length - 1 && (
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                <div className="w-5 h-5 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/60">
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
