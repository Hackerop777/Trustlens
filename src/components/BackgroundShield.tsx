"use client";

import React from "react";

interface BackgroundShieldProps {
  isSidebarHidden?: boolean;
}

export function BackgroundShield({ isSidebarHidden = false }: BackgroundShieldProps) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none transition-all duration-500 ease-in-out ${
        isSidebarHidden ? "left-0" : "left-0 lg:left-[320px] xl:left-[340px]"
      }`}
    >
      {/* 20% Transparency Container, sized to fit comfortably within viewport */}
      <div className="relative w-[280px] h-[336px] sm:w-[360px] sm:h-[432px] md:w-[420px] md:h-[504px] lg:w-[460px] lg:h-[552px] max-h-[72vh] max-w-[85vw] opacity-20 flex items-center justify-center animate-shield-float">
        {/* Soft Ambient Forest Green Halo behind the shield */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/20 via-emerald-700/15 to-transparent rounded-full blur-3xl" />

        {/* Cyber Shield Vector with Shining Forest Green Gradients */}
        <svg
          viewBox="0 0 200 240"
          className="w-full h-full drop-shadow-[0_0_25px_rgba(34,197,94,0.5)] drop-shadow-[0_0_60px_rgba(21,128,61,0.3)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Shining Forest Green Rim Gradient */}
            <linearGradient id="forestShineRim" x1="0" y1="0" x2="200" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#86efac" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#22c55e" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="75%" stopColor="#15803d" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#052e16" stopOpacity="0.5" />
            </linearGradient>

            {/* Deep Glossy Forest Green Shield Plate Fill */}
            <linearGradient id="forestShieldFill" x1="100" y1="10" x2="100" y2="230" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#14532d" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#166534" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#052e16" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#01180d" stopOpacity="0.08" />
            </linearGradient>

            {/* Facet Bevel Highlight */}
            <linearGradient id="forestFacetShine" x1="50" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.35" />
              <stop offset="45%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>

            {/* Metallic Sheen Clip Path */}
            <clipPath id="shieldClip">
              <path d="M 100 12 L 175 44 C 175 140, 138 200, 100 228 C 62 200, 25 140, 25 44 Z" />
            </clipPath>
          </defs>

          {/* Outer Shield Hull (Plate Fill) */}
          <path
            d="M 100 12 L 175 44 C 175 140, 138 200, 100 228 C 62 200, 25 140, 25 44 Z"
            fill="url(#forestShieldFill)"
            stroke="url(#forestShineRim)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Left Facet Specular Bevel */}
          <path
            d="M 100 12 L 25 44 C 25 140, 62 200, 100 228 Z"
            fill="url(#forestFacetShine)"
          />

          {/* Inner Geometric Forest Green Contour */}
          <path
            d="M 100 25 L 163 52 C 163 133, 131 186, 100 211 C 69 186, 37 133, 37 52 Z"
            stroke="#4ade80"
            strokeWidth="1.2"
            strokeDasharray="5 3"
            strokeOpacity="0.65"
          />

          {/* Central Vertical Spine (Shining) */}
          <line
            x1="100"
            y1="25"
            x2="100"
            y2="211"
            stroke="#86efac"
            strokeWidth="1"
            strokeOpacity="0.6"
          />

          {/* Diagonal Security Mesh Intersections */}
          <line x1="50" y1="88" x2="150" y2="88" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.4" />
          <line x1="60" y1="132" x2="140" y2="132" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.35" />
          <line x1="75" y1="172" x2="125" y2="172" stroke="#22c55e" strokeWidth="0.75" strokeOpacity="0.3" />

          {/* Shining Glare Sweep Band across the shield */}
          <g clipPath="url(#shieldClip)">
            <rect
              x="-60"
              y="0"
              width="60"
              height="260"
              fill="url(#forestFacetShine)"
              opacity="0.8"
              className="animate-shield-sweep"
            />
          </g>

          {/* Core Padlock Emblem in Shining Forest Green */}
          <g transform="translate(100, 114) scale(0.9)">
            {/* Shackle */}
            <path
              d="M -12 -5 C -12 -18, 12 -18, 12 -5 L 12 3 L -12 3 Z"
              stroke="#86efac"
              strokeWidth="2.4"
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
              fill="#064e3b"
              fillOpacity="0.8"
              stroke="#4ade80"
              strokeWidth="2"
            />
            {/* Keyhole */}
            <circle cx="0" cy="14" r="3.2" fill="#86efac" />
            <path d="M -1.5 15 L 1.5 15 L 2.2 23 L -2.2 23 Z" fill="#86efac" />
          </g>

          {/* Rotating Forest Green Radar Scanner */}
          <circle
            cx="100"
            cy="114"
            r="46"
            stroke="#4ade80"
            strokeWidth="0.8"
            strokeDasharray="6 8"
            strokeOpacity="0.45"
            className="animate-shield-radar"
          />
        </svg>
      </div>
    </div>
  );
}
