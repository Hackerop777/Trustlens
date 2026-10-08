"use client";

import React from "react";
import { RiskThemeKey } from "@/lib/theme/risk-theme";

interface BackgroundShieldProps {
  isSidebarHidden?: boolean;
  themeKey?: RiskThemeKey;
}

export function BackgroundShield({
  isSidebarHidden = false,
  themeKey = "SAFE",
}: BackgroundShieldProps) {
  // Theme-specific color parameters for SVG gradients & glows
  const themeColors = {
    CRITICAL: {
      rimLight: "#fca5a5",
      rimMid: "#ef4444",
      rimGlow: "#f87171",
      rimDark: "#991b1b",
      rimBase: "#450a0a",
      fillTop: "#7f1d1d",
      fillMid: "#450a0a",
      fillBottom: "#1f0406",
      halo: "from-rose-500/30 via-red-800/20 to-transparent",
      accent: "#f87171",
      accentBright: "#fca5a5",
      radar: "#ef4444",
      filterGlow: "drop-shadow-[0_0_25px_rgba(239,68,68,0.6)] drop-shadow-[0_0_65px_rgba(153,27,27,0.4)]",
    },
    HIGH: {
      rimLight: "#fed7aa",
      rimMid: "#f97316",
      rimGlow: "#fb923c",
      rimDark: "#9a3412",
      rimBase: "#431407",
      fillTop: "#7c2d12",
      fillMid: "#431407",
      fillBottom: "#1c0602",
      halo: "from-orange-500/25 via-amber-800/20 to-transparent",
      accent: "#fb923c",
      accentBright: "#fed7aa",
      radar: "#f97316",
      filterGlow: "drop-shadow-[0_0_25px_rgba(249,115,22,0.6)] drop-shadow-[0_0_65px_rgba(154,52,18,0.4)]",
    },
    UNKNOWN: {
      rimLight: "#fef08a",
      rimMid: "#eab308",
      rimGlow: "#fde047",
      rimDark: "#854d0e",
      rimBase: "#422006",
      fillTop: "#713f12",
      fillMid: "#3f2005",
      fillBottom: "#1a0d02",
      halo: "from-amber-500/25 via-yellow-800/20 to-transparent",
      accent: "#fde047",
      accentBright: "#fef08a",
      radar: "#eab308",
      filterGlow: "drop-shadow-[0_0_25px_rgba(234,179,8,0.6)] drop-shadow-[0_0_65px_rgba(113,63,18,0.4)]",
    },
    SUSPICIOUS: {
      rimLight: "#fef08a",
      rimMid: "#eab308",
      rimGlow: "#fde047",
      rimDark: "#854d0e",
      rimBase: "#422006",
      fillTop: "#713f12",
      fillMid: "#3f2005",
      fillBottom: "#1a0d02",
      halo: "from-yellow-500/25 via-amber-700/15 to-transparent",
      accent: "#fde047",
      accentBright: "#fef08a",
      radar: "#eab308",
      filterGlow: "drop-shadow-[0_0_25px_rgba(234,179,8,0.55)] drop-shadow-[0_0_60px_rgba(113,63,18,0.35)]",
    },
    SAFE: {
      rimLight: "#34d399",
      rimMid: "#15803d",
      rimGlow: "#16a34a",
      rimDark: "#14532d",
      rimBase: "#052e16",
      fillTop: "#0d3b20",
      fillMid: "#062814",
      fillBottom: "#021309",
      halo: "from-emerald-950/40 via-green-950/25 to-transparent",
      accent: "#22c55e",
      accentBright: "#4ade80",
      radar: "#16a34a",
      filterGlow: "drop-shadow-[0_0_25px_rgba(22,163,74,0.45)] drop-shadow-[0_0_60px_rgba(5,46,22,0.4)]",
    },
  }[themeKey];

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none transition-all duration-1000 ease-in-out ${
        isSidebarHidden ? "left-0" : "left-0 lg:left-[320px] xl:left-[340px]"
      }`}
    >
      {/* 20% Transparency Container, sized to fit comfortably within viewport */}
      <div className="relative w-[280px] h-[336px] sm:w-[360px] sm:h-[432px] md:w-[420px] md:h-[504px] lg:w-[460px] lg:h-[552px] max-h-[72vh] max-w-[85vw] opacity-25 flex items-center justify-center animate-shield-float transition-all duration-1000">
        {/* Soft Ambient Halo behind the shield with dynamic theme color */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${themeColors.halo} rounded-full blur-3xl transition-all duration-1000`}
        />

        {/* Cyber Shield Vector with Shining Gradients */}
        <svg
          viewBox="0 0 200 240"
          className={`w-full h-full transition-all duration-1000 ${themeColors.filterGlow}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Shining Dynamic Rim Gradient */}
            <linearGradient id="dynamicShineRim" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={themeColors.rimLight} stopOpacity="0.95" />
              <stop offset="25%" stopColor={themeColors.rimMid} stopOpacity="0.85" />
              <stop offset="50%" stopColor={themeColors.rimGlow} stopOpacity="1" />
              <stop offset="75%" stopColor={themeColors.rimDark} stopOpacity="0.75" />
              <stop offset="100%" stopColor={themeColors.rimBase} stopOpacity="0.5" />
            </linearGradient>

            {/* Deep Glossy Shield Plate Fill */}
            <linearGradient id="dynamicShieldFill" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={themeColors.fillTop} stopOpacity="0.50" />
              <stop offset="40%" stopColor={themeColors.fillMid} stopOpacity="0.30" />
              <stop offset="80%" stopColor={themeColors.rimBase} stopOpacity="0.20" />
              <stop offset="100%" stopColor={themeColors.fillBottom} stopOpacity="0.10" />
            </linearGradient>

            {/* Facet Bevel Highlight */}
            <linearGradient id="dynamicFacetShine" x1="50" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={themeColors.rimLight} stopOpacity="0.40" />
              <stop offset="45%" stopColor={themeColors.rimMid} stopOpacity="0.18" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            {/* Metallic Sheen Clip Path */}
            <clipPath id="shieldClipDynamic">
              <path d="M 100 12 L 175 44 C 175 140, 138 200, 100 228 C 62 200, 25 140, 25 44 Z" />
            </clipPath>
          </defs>

          {/* Outer Shield Hull (Plate Fill) */}
          <path
            d="M 100 12 L 175 44 C 175 140, 138 200, 100 228 C 62 200, 25 140, 25 44 Z"
            fill="url(#dynamicShieldFill)"
            stroke="url(#dynamicShineRim)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Left Facet Specular Bevel */}
          <path
            d="M 100 12 L 25 44 C 25 140, 62 200, 100 228 Z"
            fill="url(#dynamicFacetShine)"
          />

          {/* Inner Geometric Contour */}
          <path
            d="M 100 25 L 163 52 C 163 133, 131 186, 100 211 C 69 186, 37 133, 37 52 Z"
            stroke={themeColors.accent}
            strokeWidth="1.2"
            strokeDasharray="5 3"
            strokeOpacity="0.75"
          />

          {/* Central Vertical Spine (Shining) */}
          <line
            x1="100"
            y1="25"
            x2="100"
            y2="211"
            stroke={themeColors.accentBright}
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />

          {/* Diagonal Security Mesh Intersections */}
          <line x1="50" y1="88" x2="150" y2="88" stroke={themeColors.rimMid} strokeWidth="0.8" strokeOpacity="0.45" />
          <line x1="60" y1="132" x2="140" y2="132" stroke={themeColors.rimMid} strokeWidth="0.8" strokeOpacity="0.40" />
          <line x1="75" y1="172" x2="125" y2="172" stroke={themeColors.rimMid} strokeWidth="0.8" strokeOpacity="0.35" />

          {/* Shining Glare Sweep Band across the shield */}
          <g clipPath="url(#shieldClipDynamic)">
            <rect
              x="-60"
              y="0"
              width="60"
              height="260"
              fill="url(#dynamicFacetShine)"
              opacity="0.85"
              className="animate-shield-sweep"
            />
          </g>

          {/* Core Padlock Emblem in Shining Dynamic Tone */}
          <g transform="translate(100, 114) scale(0.9)">
            {/* Shackle */}
            <path
              d="M -12 -5 C -12 -18, 12 -18, 12 -5 L 12 3 L -12 3 Z"
              stroke={themeColors.accentBright}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Lock Body */}
            <rect
              x="-18"
              y="3"
              width="36"
              height="28"
              rx="6"
              fill={themeColors.fillTop}
              fillOpacity="0.9"
              stroke={themeColors.accent}
              strokeWidth="2"
            />
            {/* Keyhole */}
            <circle cx="0" cy="14" r="3.2" fill={themeColors.accentBright} />
            <path d="M -1.5 15 L 1.5 15 L 2.2 23 L -2.2 23 Z" fill={themeColors.accentBright} />
          </g>

          {/* Rotating Radar Scanner with Dynamic Tone */}
          <circle
            cx="100"
            cy="114"
            r="46"
            stroke={themeColors.radar}
            strokeWidth="0.9"
            strokeDasharray="6 8"
            strokeOpacity="0.55"
            className="animate-shield-radar"
          />
        </svg>
      </div>
    </div>
  );
}
