"use client";

import React, { useState, useRef } from "react";
import { Globe, QrCode, Image as ImageIcon, MessageSquare, ArrowRight, Loader2, Sparkles, Upload, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { scanQRFromFile } from "@/lib/qr/scanner";
import { performOCR, OCRScanResult } from "@/lib/ocr/service";

interface InvestigationInputProps {
  onInvestigate: (target: string, type?: "URL" | "MESSAGE" | "QR" | "IMAGE") => Promise<void>;
  isLoading: boolean;
  isExpanded?: boolean;
}

export function InvestigationInput({ onInvestigate, isLoading, isExpanded = false }: InvestigationInputProps) {
  const [activeTab, setActiveTab] = useState<"URL" | "QR" | "OCR" | "MESSAGE">("URL");
  const [urlInput, setUrlInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [qrScanning, setQrScanning] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRScanResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  const sampleTargets = [
    {
      label: "Combosquat (.com)",
      url: "https://hdfc-netbanking.com",
      color: "bg-rose-400",
      type: "URL" as const,
    },
    {
      label: "Official HDFC Bank",
      url: "https://hdfcbank.com",
      color: "bg-emerald-400",
      type: "URL" as const,
    },
    {
      label: "Electricity Scam SMS",
      url: "Dear consumer, your electricity power will be disconnected tonight at 9.30 PM from office because your previous month bill was not updated. Please immediately contact our electric officer 9876543210. Thank you.",
      color: "bg-amber-400",
      type: "MESSAGE" as const,
    },
    {
      label: "UPI Refund Scam QR",
      url: "upi://pay?pa=refund_desk92@ybl&pn=Electricity%20Bill%20Refund&am=4500&cu=INR",
      color: "bg-rose-400",
      type: "QR" as const,
    },
  ];

  const pipelineStages = [
    "Normalizing target & checking autonomous combosquatting",
    "Running SSRF-guarded fetch & redirect hop tracking",
    "Inspecting DOM security forms & password inputs",
    "Authoritative brand-domain registry verification",
    "Checking Google Safe Browsing & VirusTotal feeds",
    "Computing deterministic risk fusion score",
    "Gemini 3.8 Flash deducing attack chain & plain guidance",
  ];

  const triggerPipeline = (target: string, type: "URL" | "MESSAGE" | "QR" | "IMAGE" = "URL") => {
    setCurrentStepIndex(0);
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < pipelineStages.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 650);

    onInvestigate(target, type).finally(() => {
      clearInterval(interval);
    });
  };

  const handleUrlSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || isLoading) return;
    triggerPipeline(urlInput.trim(), "URL");
  };

  const handleMessageSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || isLoading) return;
    triggerPipeline(messageInput.trim(), "MESSAGE");
  };

  // QR Image Handler
  const handleQRFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrScanning(true);
    try {
      const result = await scanQRFromFile(file);
      if (result.success && (result.extractedUrl || result.rawText)) {
        const payload = result.extractedUrl || result.rawText!;
        setUrlInput(payload);
        triggerPipeline(payload, "QR");
      } else {
        alert(result.error || "No readable QR code found in this image.");
      }
    } catch (err: any) {
      alert("Error scanning QR code: " + err?.message);
    } finally {
      setQrScanning(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = "";
    }
  };

  // OCR Screenshot Handler
  const handleOCRFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    try {
      const result = await performOCR(file);
      setOcrResult(result);

      if (result.success && result.detectedUrls.length > 0) {
        const firstUrl = result.detectedUrls[0];
        setUrlInput(firstUrl);
        // Automatically start investigation on the first detected URL
        triggerPipeline(firstUrl);
      }
    } catch (err: any) {
      alert("Error processing OCR: " + err?.message);
    } finally {
      setOcrScanning(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
    }
  };

  return (
    <div className={`transition-all duration-500 ease-in-out space-y-4 sm:space-y-5 ${
      isExpanded
        ? "pt-10 sm:pt-16 lg:pt-20 pb-8"
        : "pt-8 sm:pt-12 lg:pt-16 pb-6"
    }`}>
      {/* Hero Headline */}
      <div className="text-center max-w-3xl sm:max-w-4xl mx-auto space-y-2 pt-1 pb-0.5">
        <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-semibold tracking-[-0.03em] text-white leading-[1.18]">
          Don&apos;t just detect the scam.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-emerald-200">
            Understand the threat.
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-normal max-w-xl mx-auto">
          Deterministic zero-trust security intelligence, authoritative brand registries, and AI attack-chain reasoning.
        </p>
      </div>

      {/* Main Search & Option Blocks Container (Expands to 70% viewport when expanded) */}
      <div className={`mx-auto transition-all duration-500 ease-in-out ${
        isExpanded
          ? "w-[92vw] sm:w-[70vw] max-w-[70vw] space-y-4"
          : "w-full max-w-4xl space-y-3.5"
      }`}>
        {/* Tab 1: URL Input Bar */}
        {activeTab === "URL" && (
          <form onSubmit={handleUrlSubmit} className="space-y-0">
            <div className="relative flex items-center shadow-[0_10px_30px_-6px_rgba(0,0,0,0.7)]">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
                placeholder="https://hdfc-verify-portal.xyz/login"
                className={`w-full bg-[#051a10]/95 border border-emerald-500/30 rounded-[80px] pl-6 sm:pl-8 pr-36 sm:pr-40 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/70 focus:bg-[#072418] transition-all font-mono shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)] ${
                  isExpanded ? "py-4 sm:py-4.5" : "py-3.5 sm:py-4"
                }`}
                style={{ borderRadius: "80px" }}
              />

              <button
                type="submit"
                disabled={isLoading || !urlInput.trim()}
                className={`absolute right-2 px-5 sm:px-6 py-2.5 rounded-[80px] bg-black hover:bg-[#04120a] border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-semibold text-xs tracking-tight disabled:opacity-30 transition-all apple-button-press flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.8),0_0_15px_rgba(16,185,129,0.2)] cursor-pointer group ${
                  isExpanded ? "py-2.5 sm:py-3 px-6 sm:px-7" : "py-2.5 px-5 sm:px-6"
                }`}
                style={{ borderRadius: "80px" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Analyzing</span>
                  </>
                ) : (
                  <>
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: QR Scanner */}
        {activeTab === "QR" && (
          <div
            className="space-y-3 text-center py-4 px-6 apple-glass rounded-[80px] border border-emerald-500/30 shadow-[0_10px_30px_-6px_rgba(0,0,0,0.7)]"
            style={{ borderRadius: "80px" }}
          >
            <input
              type="file"
              ref={qrFileInputRef}
              accept="image/*"
              onChange={handleQRFile}
              className="hidden"
            />
            <div
              onClick={() => qrFileInputRef.current?.click()}
              className="p-6 cursor-pointer transition-all hover:bg-white/[0.02] space-y-2 rounded-[60px]"
              style={{ borderRadius: "60px" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 mx-auto flex items-center justify-center text-emerald-400">
                {qrScanning ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : <QrCode className="w-6 h-6" />}
              </div>
              <h4 className="text-sm font-semibold text-white">Upload or Drop QR Code Image</h4>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                Decodes embedded URLs from QR images and inspects destination infrastructure.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Screenshot OCR */}
        {activeTab === "OCR" && (
          <div
            className="space-y-3 py-3 px-6 apple-glass rounded-[80px] border border-emerald-500/30 shadow-[0_10px_30px_-6px_rgba(0,0,0,0.7)]"
            style={{ borderRadius: "80px" }}
          >
            <input
              type="file"
              ref={ocrFileInputRef}
              accept="image/*"
              onChange={handleOCRFile}
              className="hidden"
            />
            <div
              onClick={() => ocrFileInputRef.current?.click()}
              className="p-6 cursor-pointer transition-all hover:bg-white/[0.02] text-center space-y-2 rounded-[60px]"
              style={{ borderRadius: "60px" }}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 mx-auto flex items-center justify-center text-emerald-400">
                {ocrScanning ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : <Upload className="w-6 h-6" />}
              </div>
              <h4 className="text-sm font-semibold text-white">Upload Screenshot for OCR Extraction</h4>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                Extracts text, phone numbers, and embedded links from suspicious messages.
              </p>
            </div>

            {ocrResult && ocrResult.success && (
              <div
                className="mx-4 mb-3 p-3.5 rounded-[40px] bg-black/60 border border-emerald-500/20 text-left text-xs"
                style={{ borderRadius: "40px" }}
              >
                <span className="font-semibold text-emerald-400/80 uppercase text-[10px] block mb-1">OCR Detected Text:</span>
                <p className="font-mono text-white/80 line-clamp-2">{ocrResult.rawText}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Pasted Message */}
        {activeTab === "MESSAGE" && (
          <form onSubmit={handleMessageSubmit} className="space-y-3">
            <div className="relative shadow-[0_10px_30px_-6px_rgba(0,0,0,0.7)]">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={isLoading}
                rows={3}
                placeholder="Paste suspicious SMS or WhatsApp message (e.g. 'Dear Customer, your bank KYC will expire tonight...')"
                className="w-full bg-[#051a10]/95 border border-emerald-500/30 rounded-[50px] sm:rounded-[80px] px-8 sm:px-10 py-5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400/70 focus:bg-[#072418] transition-all font-mono shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12)] resize-none"
                style={{ borderRadius: "80px" }}
              />
            </div>
            <div className="flex justify-end pr-2">
              <button
                type="submit"
                disabled={isLoading || !messageInput.trim()}
                className="px-6 py-2.5 rounded-[80px] bg-black hover:bg-[#04120a] border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-semibold text-xs tracking-tight disabled:opacity-30 transition-all apple-button-press flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.8),0_0_15px_rgba(16,185,129,0.2)] cursor-pointer group"
                style={{ borderRadius: "80px" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Analyzing</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Mode Selector Pill Buttons (Exact Match with Reference UI & Centerised) */}
        <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5 ${
          isExpanded ? "justify-center" : "justify-start"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("URL")}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border flex items-center space-x-2 text-xs sm:text-sm font-medium transition-all apple-button-press cursor-pointer group ${
              activeTab === "URL"
                ? "bg-[#0c2a1e] border-emerald-500/40 text-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.18)]"
                : "bg-[#0f1713]/90 hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white"
            }`}
          >
            <Globe className={`w-4 h-4 shrink-0 ${activeTab === "URL" ? "text-emerald-400" : "text-white/50 group-hover:text-white/80"}`} />
            <span>Target URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("QR")}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border flex items-center space-x-2 text-xs sm:text-sm font-medium transition-all apple-button-press cursor-pointer group ${
              activeTab === "QR"
                ? "bg-[#0c2a1e] border-emerald-500/40 text-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.18)]"
                : "bg-[#0f1713]/90 hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white"
            }`}
          >
            <QrCode className={`w-4 h-4 shrink-0 ${activeTab === "QR" ? "text-emerald-400" : "text-white/50 group-hover:text-white/80"}`} />
            <span>QR Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OCR")}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border flex items-center space-x-2 text-xs sm:text-sm font-medium transition-all apple-button-press cursor-pointer group ${
              activeTab === "OCR"
                ? "bg-[#0c2a1e] border-emerald-500/40 text-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.18)]"
                : "bg-[#0f1713]/90 hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white"
            }`}
          >
            <ImageIcon className={`w-4 h-4 shrink-0 ${activeTab === "OCR" ? "text-emerald-400" : "text-white/50 group-hover:text-white/80"}`} />
            <span>Image OCR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MESSAGE")}
            className={`px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border flex items-center space-x-2 text-xs sm:text-sm font-medium transition-all apple-button-press cursor-pointer group ${
              activeTab === "MESSAGE"
                ? "bg-[#0c2a1e] border-emerald-500/40 text-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.18)]"
                : "bg-[#0f1713]/90 hover:bg-white/[0.06] border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white"
            }`}
          >
            <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === "MESSAGE" ? "text-emerald-400" : "text-white/50 group-hover:text-white/80"}`} />
            <span>Message Text</span>
          </button>
        </div>

        {/* Quick Analysis Benchmarks (Exact 1:1 match with user reference & Centerised) */}
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-xs ${
          isExpanded ? "justify-center" : "justify-start"
        }`}>
          <span className="text-white/40 font-normal">Quick Analysis:</span>
          {sampleTargets.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (s.type === "MESSAGE") {
                  setMessageInput(s.url);
                  setActiveTab("MESSAGE");
                } else if (s.type === "QR") {
                  setUrlInput(s.url);
                  setActiveTab("QR");
                } else {
                  setUrlInput(s.url);
                  setActiveTab("URL");
                }
                triggerPipeline(s.url, s.type);
              }}
              disabled={isLoading}
              title={`${s.label} — ${s.url}`}
              className="text-white/70 hover:text-emerald-300 underline underline-offset-4 decoration-white/20 hover:decoration-emerald-400 transition-all font-normal text-xs apple-button-press cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Live Step Progression Indicator */}
        {isLoading && (
          <div className="mt-4 pt-4 border-t border-emerald-500/20 space-y-3 apple-glass p-4 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span className="flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Telemetry Pipeline: Stage {currentStepIndex + 1}/{pipelineStages.length}</span>
              </span>
              <span>{Math.round(((currentStepIndex + 1) / pipelineStages.length) * 100)}%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {pipelineStages.map((stage, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isDone = idx < currentStepIndex;

                return (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 text-xs transition-opacity duration-300 ${
                      isCurrent
                        ? "text-emerald-300 font-medium"
                        : isDone
                        ? "text-white/60"
                        : "text-white/20"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" />
                    )}
                    <span className="truncate">{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

