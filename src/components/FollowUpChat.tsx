"use client";

import React, { useState } from "react";
import { InvestigationResult, ConversationMessage } from "@/lib/types";
import { MessageSquare, ArrowUp, Bot, User, Sparkles, Loader2 } from "lucide-react";

interface FollowUpChatProps {
  investigation: InvestigationResult;
}

export function FollowUpChat({ investigation }: FollowUpChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      role: "assistant",
      content: `Hello. I have analyzed the observable security signals for **${
        investigation.urlAnalysis?.hostname || investigation.target
      }**. What questions do you have about this investigation or your next steps?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    "Why is this marked high risk?",
    "Does this actually belong to the claimed brand?",
    "What could an attacker steal?",
    "What should I do if I entered my password?",
  ];

  const handleSend = async (messageText?: string) => {
    const query = messageText || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ConversationMessage = { role: "user", content: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investigationId: investigation.id,
          message: query.trim(),
          history: messages,
          investigationContext: investigation,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "Unable to formulate a response." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not connect to the reasoning server. However, based on the completed report, this domain presents severe risk indicators and you should avoid any credential entry.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="apple-glass rounded-3xl p-6 sm:p-7 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <h3 className="text-base font-semibold text-white tracking-[-0.02em]">
            Investigative Intelligence Assistant
          </h3>
        </div>
        <span className="text-[11px] font-mono text-white/40 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-sky-400" />
          <span>Grounded in Observable Facts</span>
        </span>
      </div>

      {/* Quick Questions */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-[11px] px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white transition-all apple-button-press"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Window */}
      <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-black/40 rounded-2xl border border-white/[0.06]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2.5 ${
              msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-white text-black"
                  : "bg-white/[0.08] text-white/80 border border-white/[0.1]"
              }`}
            >
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/[0.15] border border-white/[0.2] text-white shadow-sm"
                  : "bg-white/[0.04] border border-white/[0.06] text-white/80"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-white/50 pl-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>Consulting investigation evidence...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative flex items-center shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask TrustLens about this investigation..."
          className="w-full bg-[#051a10]/95 border border-emerald-500/30 rounded-[80px] pl-6 pr-14 py-3.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/60 transition-all shadow-inner font-mono"
          style={{ borderRadius: "80px" }}
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="absolute right-2 p-2 bg-black text-emerald-400 hover:text-emerald-300 hover:bg-[#04120a] border border-emerald-500/40 disabled:opacity-30 rounded-[80px] transition-all apple-button-press shadow-sm"
          style={{ borderRadius: "80px" }}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
