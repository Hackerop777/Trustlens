"use client";

import React, { useState, useRef } from "react";
import { Globe, QrCode, Image as ImageIcon, MessageSquare, ArrowRight, Loader2, Sparkles, Upload, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { scanQRFromFile } from "@/lib/qr/scanner";
import { performOCR, OCRScanResult } from "@/lib/ocr/service";

interface InvestigationInputProps {
  onInvestigate: (target: string, type?: "URL" | "MESSAGE" | "QR" | "IMAGE") => Promise<void>;
  isLoading: boolean;
}

export function InvestigationInput({ onInvestigate, isLoading }: InvestigationInputProps) {
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
    <div className="space-y-8">
      {/* Hero Headline */}
      <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 pt-2 sm:pt-4 pb-2 px-2">
        <h1 className="text-2xl xs:text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-white leading-tight">
          Don&apos;t just detect the scam.<br />
          <span className="text-white">
            Understand the threat.
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-white/50 leading-relaxed font-normal max-w-xl mx-auto px-2">
          Analyzing digital interactions with deterministic security intelligence to protect your domain.
        </p>
      </div>

      {/* Main Search & Option Blocks Container */}
      <div className="max-w-3xl mx-auto space-y-4 px-1 sm:px-0">
        {/* Tab 1: URL Input Bar (Floating pill from image) */}
        {activeTab === "URL" && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
                placeholder="https://hdfc-verify-portal.xyz/login"
                className="w-full bg-[#1b2226]/85 border border-white/[0.12] rounded-full pl-4 sm:pl-6 pr-28 sm:pr-36 py-3.5 sm:py-4 text-xs sm:text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/40 focus:bg-[#1f292d] transition-all font-mono shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.1),0_16px_36px_-10px_rgba(0,0,0,0.5)]"
              />

              <button
                type="submit"
                disabled={isLoading || !urlInput.trim()}
                className="absolute right-1.5 sm:right-2 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-tight hover:bg-white/90 disabled:opacity-30 transition-all apple-button-press flex items-center space-x-1.5 shadow-[0_2px_12px_rgba(255,255,255,0.2)] shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden xs:inline">Analyzing</span>
                  </>
                ) : (
                  <>
                    <span className="hidden xs:inline">Investigate</span>
                    <span className="xs:hidden">Check</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Segmented Option Blocks (Pill blocks with smooth mobile scroll) */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-1.5 px-1 no-scrollbar">
          <button
            onClick={() => setActiveTab("URL")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium transition-all apple-button-press shrink-0 whitespace-nowrap ${
              activeTab === "URL"
                ? "bg-[#2f423d] text-emerald-300 border border-emerald-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                : "bg-[#182024]/70 text-white/60 hover:text-white hover:bg-[#1f2a2f] border border-white/[0.08]"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Target URL</span>
          </button>

          <button
            onClick={() => setActiveTab("QR")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium transition-all apple-button-press shrink-0 whitespace-nowrap ${
              activeTab === "QR"
                ? "bg-[#2f423d] text-emerald-300 border border-emerald-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                : "bg-[#182024]/70 text-white/60 hover:text-white hover:bg-[#1f2a2f] border border-white/[0.08]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            <span>QR Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab("OCR")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium transition-all apple-button-press shrink-0 whitespace-nowrap ${
              activeTab === "OCR"
                ? "bg-[#2f423d] text-emerald-300 border border-emerald-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                : "bg-[#182024]/70 text-white/60 hover:text-white hover:bg-[#1f2a2f] border border-white/[0.08]"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Image OCR</span>
          </button>

          <button
            onClick={() => setActiveTab("MESSAGE")}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-medium transition-all apple-button-press shrink-0 whitespace-nowrap ${
              activeTab === "MESSAGE"
                ? "bg-[#2f423d] text-emerald-300 border border-emerald-400/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                : "bg-[#182024]/70 text-white/60 hover:text-white hover:bg-[#1f2a2f] border border-white/[0.08]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Message Text</span>
          </button>
        </div>

        {/* Quick Benchmark Links Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1 text-xs text-white/50 px-2">
          <span className="text-[11px] text-white/40">Quick Analysis:</span>
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
              className="text-[11px] sm:text-xs text-white/70 hover:text-white underline underline-offset-4 decoration-white/20 hover:decoration-white transition-all apple-button-press flex items-center space-x-1.5"
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 2: QR Scanner */}
        {activeTab === "QR" && (
          <div className="space-y-4 text-center py-2 sm:py-4">
            <input
              type="file"
              ref={qrFileInputRef}
              accept="image/*"
              onChange={handleQRFile}
              className="hidden"
            />
            <div
              onClick={() => qrFileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl p-5 sm:p-8 cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] space-y-3"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] mx-auto flex items-center justify-center text-white/80">
                {qrScanning ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-sky-400" /> : <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Upload or Drop QR Code Image</h4>
                <p className="text-[11px] sm:text-xs text-white/50 mt-1 max-w-sm mx-auto">
                  Decodes embedded URLs from QR images and inspects the destination automatically.
                </p>
              </div>
              <button
                type="button"
                disabled={qrScanning}
                className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs text-white font-medium transition-all apple-button-press"
              >
                {qrScanning ? "Decoding QR Code..." : "Select QR Image"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Screenshot OCR */}
        {activeTab === "OCR" && (
          <div className="space-y-4 py-2">
            <input
              type="file"
              ref={ocrFileInputRef}
              accept="image/*"
              onChange={handleOCRFile}
              className="hidden"
            />
            <div
              onClick={() => ocrFileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl p-5 sm:p-8 cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] text-center space-y-3"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] mx-auto flex items-center justify-center text-white/80">
                {ocrScanning ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-sky-400" /> : <Upload className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Upload Screenshot for OCR Extraction</h4>
                <p className="text-[11px] sm:text-xs text-white/50 mt-1 max-w-sm mx-auto">
                  Extracts text, phone numbers, UPI IDs, and embedded links from suspicious SMS or bank alert screenshots.
                </p>
              </div>
              <button
                type="button"
                disabled={ocrScanning}
                className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs text-white font-medium transition-all apple-button-press"
              >
                {ocrScanning ? "Extracting Text (OCR)..." : "Choose Screenshot"}
              </button>
            </div>

            {/* OCR Extracted Preview */}
            {ocrResult && ocrResult.success && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-left">
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/50 uppercase tracking-wider block">
                  Extracted Text Preview:
                </span>
                <p className="text-xs text-white/80 font-mono line-clamp-3 bg-black/40 p-2 rounded-lg break-words">
                  {ocrResult.rawText}
                </p>
                {ocrResult.detectedUrls.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-1">
                    <span className="text-xs text-emerald-400 font-medium shrink-0">Detected Target URL:</span>
                    <span className="text-xs text-white font-mono break-all">{ocrResult.detectedUrls[0]}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Pasted Message */}
        {activeTab === "MESSAGE" && (
          <form onSubmit={handleMessageSubmit} className="space-y-4">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder="Paste suspicious SMS or WhatsApp message (e.g. 'Dear Customer, your HDFC netbanking will be blocked today. Update KYC here: https://hdfc-verify-portal.xyz/login')"
              className="w-full bg-white/[0.03] border border-white/[0.09] rounded-2xl p-3.5 sm:p-4 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-all shadow-inner resize-none font-mono"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !messageInput.trim()}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-white text-black font-semibold text-xs tracking-tight hover:bg-white/90 disabled:opacity-30 transition-all apple-button-press flex items-center justify-center space-x-1.5 shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Live Step Progression Indicator */}
        {isLoading && (
          <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-3">
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between text-xs font-mono text-sky-400 gap-1">
              <span className="flex items-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="truncate">Telemetry Pipeline: Stage {currentStepIndex + 1}/{pipelineStages.length}</span>
              </span>
              <span className="self-end xs:self-auto font-bold">{Math.round(((currentStepIndex + 1) / pipelineStages.length) * 100)}%</span>
            </div>

            <div className="space-y-1.5">
              {pipelineStages.map((stage, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isDone = idx < currentStepIndex;

                return (
                  <div
                    key={idx}
                    className={`flex items-start sm:items-center space-x-2.5 text-xs transition-opacity duration-300 ${
                      isCurrent
                        ? "text-white font-medium"
                        : isDone
                        ? "text-white/50"
                        : "text-white/20"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                    ) : isCurrent ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <span className="leading-snug">{stage}</span>
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
