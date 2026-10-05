"use client";

import React, { useState } from "react";
import { PostVictimGuidance } from "@/lib/types";
import { X, LifeBuoy, PhoneCall, Lock, CreditCard, Download, MousePointer } from "lucide-react";

interface PostVictimModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimedBrand?: string;
}

export function PostVictimModal({ isOpen, onClose, claimedBrand }: PostVictimModalProps) {
  const [selectedAction, setSelectedAction] = useState<string>("entered_password");
  const [playbook, setPlaybook] = useState<PostVictimGuidance | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const actionOptions = [
    { id: "entered_password", label: "Entered Password / PIN", icon: Lock },
    { id: "entered_otp", label: "Shared OTP / 2FA Code", icon: PhoneCall },
    { id: "made_payment", label: "Authorized Payment / Card", icon: CreditCard },
    { id: "downloaded_file", label: "Downloaded File / APK", icon: Download },
    { id: "clicked_link", label: "Only Clicked Link / Unsure", icon: MousePointer },
  ];

  const handleFetchPlaybook = async (actionType: string) => {
    setSelectedAction(actionType);
    setLoading(true);

    try {
      const resp = await fetch("/api/post-victim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, claimedBrand }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPlaybook(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-glass w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/[0.12]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#ff453a]/15 border border-[#ff453a]/30 text-[#ff453a] flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-[-0.02em]">
                Incident Containment Protocol
              </h3>
              <p className="text-xs text-white/50">
                Prioritized triage for users who interacted with a suspicious target
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white flex items-center justify-center transition-all apple-button-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Action Selector */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider block mb-2.5">
              Select What Interaction Took Place:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {actionOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedAction === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleFetchPlaybook(opt.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all apple-button-press ${
                      isSelected
                        ? "bg-white/[0.12] border-white/[0.25] text-white shadow-sm"
                        : "bg-white/[0.03] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-2 text-white/80" />
                    <span className="text-xs font-medium leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Containment Steps */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Immediate Action Steps (Execute Sequentially):
            </h4>

            {playbook ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#ff453a]/10 border border-[#ff453a]/25 text-xs text-white/80">
                  <span className="font-semibold block mb-1 text-[#ff453a]">Situation Assessment:</span>
                  {playbook.summary}
                </div>

                {playbook.steps.map((st) => (
                  <div
                    key={st.stepNumber}
                    className="apple-glass-subtle rounded-2xl p-4 flex items-start space-x-3.5"
                  >
                    <span className="w-6 h-6 rounded-full bg-white text-black font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {st.stepNumber}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-semibold text-white">{st.title}</h5>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#ff453a]/20 text-[#ff453a] border border-[#ff453a]/30">
                          {st.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{st.instruction}</p>
                      {st.officialResource && (
                        <p className="text-[11px] font-mono text-sky-400 pt-1">
                          Official Helpline / Portal: {st.officialResource}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                <p className="text-[11px] text-white/40 italic pt-2">
                  *Disclaimer: {playbook.disclaimer}
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-white/40">
                Select an interaction type above to generate your customized containment checklist.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold transition-all apple-button-press"
          >
            Close Checklist
          </button>
        </div>
      </div>
    </div>
  );
}
