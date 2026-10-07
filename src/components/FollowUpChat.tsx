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
    <div className="apple-glass rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-3.5 sm:space-y-4">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-sky-400 shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-white tracking-[-0.02em]">
            Investigative Intelligence Assistant
          </h3>
        </div>
        <span className="text-[10px] sm:text-[11px] font-mono text-white/40 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
          <span>Grounded in Observable Facts</span>
        </span>
      </div>

      {/* Quick Questions */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 no-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/70 hover:text-white transition-all apple-button-press shrink-0 whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Window */}
      <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-3 p-3 sm:p-4 bg-black/40 rounded-2xl border border-white/[0.06]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2 sm:space-x-2.5 ${
              msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user"
                  ? "bg-white text-black"
                  : "bg-white/[0.08] text-white/80 border border-white/[0.1]"
              }`}
            >
              {msg.role === "user" ? <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </div>
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs leading-relaxed ${
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
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
            <span>Consulting investigation evidence...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask TrustLens about this investigation..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-3.5 sm:pl-4 pr-11 sm:pr-12 py-2.5 sm:py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all shadow-inner font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="absolute right-1 sm:right-1.5 p-2 bg-white text-black hover:bg-white/90 disabled:opacity-30 rounded-xl transition-all apple-button-press shadow-sm"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
