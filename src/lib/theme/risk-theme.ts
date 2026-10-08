import { InvestigationResult } from "../types";

export type RiskThemeKey = "SAFE" | "UNKNOWN" | "SUSPICIOUS" | "HIGH" | "CRITICAL";

export interface RiskTheme {
  themeKey: RiskThemeKey;
  label: string;
  badgeText: string;
  scoreColor: string;
  badgeClass: string;
  progressBarClass: string;
  glowColor: string;
  borderColor: string;
  accentHex: string;
  centerRadialColor: string;
  haloGradient: string;
  isUnknownZero: boolean;
}

/**
 * Derives the active visual theme and color palette based on investigation results.
 * Critically ensures that 0/100 (Unindexed / UNKNOWN) is rendered with caution amber/yellow,
 * NOT benign green.
 */
export function getRiskTheme(result: InvestigationResult | null): RiskTheme {
  // Initial idle state before investigation
  if (!result) {
    return {
      themeKey: "SAFE",
      label: "Autonomous Defense Idle / Ready",
      badgeText: "SYSTEM READY",
      scoreColor: "text-[#22c55e]",
      badgeClass: "bg-[#0a2e1d]/90 text-[#34d399] border border-emerald-600/40 shadow-[0_0_12px_rgba(22,163,74,0.25)]",
      progressBarClass: "bg-[#16a34a] shadow-[0_0_12px_rgba(22,163,74,0.7)]",
      glowColor: "rgba(22, 163, 74, 0.22)",
      borderColor: "border-emerald-600/35",
      accentHex: "#16a34a",
      centerRadialColor: "rgba(13, 59, 32, 0.40)",
      haloGradient: "from-emerald-950/40 via-green-950/25 to-transparent",
      isUnknownZero: false,
    };
  }

  const score = result.riskAssessment.score;
  const classification = result.riskAssessment.classification;

  // 1. UNKNOWN 0/100: Highlight that 0/100 does NOT mean safe!
  if (classification === "UNKNOWN" || (score === 0 && classification !== "LOW")) {
    return {
      themeKey: "UNKNOWN",
      label: "0/100 UNKNOWN — Unindexed Domain (Not Confirmed Safe)",
      badgeText: "UNKNOWN (0/100 != SAFE)",
      scoreColor: "text-[#ffd60a]",
      badgeClass: "bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 shadow-[0_0_14px_rgba(255,214,10,0.35)]",
      progressBarClass: "bg-[#ffd60a] shadow-[0_0_12px_rgba(255,214,10,0.8)]",
      glowColor: "rgba(255, 214, 10, 0.25)",
      borderColor: "border-amber-400/40",
      accentHex: "#ffd60a",
      centerRadialColor: "rgba(217, 119, 6, 0.38)",
      haloGradient: "from-amber-500/25 via-yellow-700/20 to-transparent",
      isUnknownZero: true,
    };
  }

  // 2. CRITICAL (75 - 100): Menacing Cyber Crimson / Ruby Red
  if (score >= 75 || classification === "CRITICAL") {
    return {
      themeKey: "CRITICAL",
      label: "CRITICAL THREAT — High Fraud / Phishing Probability",
      badgeText: "CRITICAL RISK",
      scoreColor: "text-[#ff453a]",
      badgeClass: "bg-[#ff453a]/25 text-[#ff453a] border border-[#ff453a]/50 shadow-[0_0_16px_rgba(255,69,58,0.45)]",
      progressBarClass: "bg-[#ff453a] shadow-[0_0_16px_rgba(255,69,58,0.9)]",
      glowColor: "rgba(255, 69, 58, 0.32)",
      borderColor: "border-rose-500/50",
      accentHex: "#ff453a",
      centerRadialColor: "rgba(220, 38, 38, 0.45)",
      haloGradient: "from-rose-500/30 via-red-800/25 to-transparent",
      isUnknownZero: false,
    };
  }

  // 3. HIGH (50 - 74): Fiery Deep Orange
  if (score >= 50 || classification === "HIGH") {
    return {
      themeKey: "HIGH",
      label: "HIGH THREAT — Malicious Indicators Confirmed",
      badgeText: "HIGH THREAT",
      scoreColor: "text-[#ff9f0a]",
      badgeClass: "bg-[#ff9f0a]/20 text-[#ff9f0a] border border-[#ff9f0a]/45 shadow-[0_0_14px_rgba(255,159,10,0.35)]",
      progressBarClass: "bg-[#ff9f0a] shadow-[0_0_14px_rgba(255,159,10,0.85)]",
      glowColor: "rgba(255, 159, 10, 0.28)",
      borderColor: "border-orange-500/45",
      accentHex: "#ff9f0a",
      centerRadialColor: "rgba(234, 88, 12, 0.40)",
      haloGradient: "from-orange-500/25 via-amber-800/20 to-transparent",
      isUnknownZero: false,
    };
  }

  // 4. SUSPICIOUS (25 - 49): Warm Gold / Amber Warning
  if (score >= 25 || classification === "SUSPICIOUS") {
    return {
      themeKey: "SUSPICIOUS",
      label: "SUSPICIOUS — Elevated Anomaly Signals",
      badgeText: "SUSPICIOUS",
      scoreColor: "text-[#ffd60a]",
      badgeClass: "bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/40 shadow-[0_0_12px_rgba(255,214,10,0.3)]",
      progressBarClass: "bg-[#ffd60a] shadow-[0_0_12px_rgba(255,214,10,0.75)]",
      glowColor: "rgba(255, 214, 10, 0.22)",
      borderColor: "border-yellow-500/40",
      accentHex: "#ffd60a",
      centerRadialColor: "rgba(202, 138, 4, 0.32)",
      haloGradient: "from-yellow-500/25 via-amber-700/15 to-transparent",
      isUnknownZero: false,
    };
  }

  // 5. LOW RISK (1 - 24, Confirmed Authentic Domain): Verified Emerald
  return {
    themeKey: "SAFE",
    label: "VERIFIED SAFE / LOW RISK",
    badgeText: "AUTHENTIC • SAFE",
    scoreColor: "text-[#22c55e]",
    badgeClass: "bg-[#0a2e1d]/90 text-[#34d399] border border-emerald-600/40 shadow-[0_0_12px_rgba(22,163,74,0.25)]",
    progressBarClass: "bg-[#16a34a] shadow-[0_0_12px_rgba(22,163,74,0.7)]",
    glowColor: "rgba(22, 163, 74, 0.22)",
    borderColor: "border-emerald-600/35",
    accentHex: "#16a34a",
    centerRadialColor: "rgba(13, 59, 32, 0.40)",
    haloGradient: "from-emerald-950/40 via-green-950/25 to-transparent",
    isUnknownZero: false,
  };
}
