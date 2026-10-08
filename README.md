# TRUSTLENS

<p align="center">
  <strong>AI-Powered Scam Intelligence & Explainable Cyber Protection Platform</strong><br>
  <em>Built by <b>PhishSlayer</b> for the THINK AI 4.0 Hackathon</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Gemini%20AI-3.8%20%2F%20Flash-8E75B2?logo=google-gemini" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Design-Apple%20Liquid%20Glass-white" alt="Apple Design" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 🎯 The Core Concept

**TRUSTLENS is NOT a generic "AI says phishing/safe" website.**

Raw web content is treated as **untrusted data**. Instead of passing raw, malicious HTML to an LLM where prompt injections or hallucinations can occur, TRUSTLENS follows a strict 5-stage pipeline:

```
DETECT ➔ VERIFY ➔ REASON ➔ EXPLAIN ➔ PROTECT
```

1. **DETECT**: Normalizes target URLs, decodes QR images, or processes SMS text lures. Evaluates structural heuristics (punycode, homoglyphs, deceptive subdomains, suspicious TLDs, IP hosts).
2. **VERIFY**: Deterministically fetches target DOMs behind an SSRF-safe, sandbox-guarded crawler. Checks credentials, OTP, and cross-domain exfiltration forms. Verifies claimed brands against authoritative registries and **live Google Search web grounding**.
3. **REASON**: Gemini acts as an intelligent reasoning and attack-chain synthesizer, orchestrating tools and evaluating structured evidence tokens rather than uncontrolled raw text.
4. **EXPLAIN**: Transparent, deterministic 0–100 risk score with explicit contributing factors, evidence timeline, and technical proof.
5. **PROTECT**: Actionable, contextual DO / DO NOT defensive instructions and immediate post-victim emergency remediation steps.

---

## 🛡️ Key Features

### 1. Dual-Layer Brand & Live Web Intelligence
- **Tier-0 Instant Registry**: Sub-millisecond verification for top Indian & global organizations (HDFC, SBI, ICICI, Apple, Google, Microsoft, OpenAI, Anthropic, etc.).
- **Tier-1 Live Web Search Grounding**: When an unindexed entity or startup is encountered, TRUSTLENS invokes Gemini with **Google Search Grounding (`tools: [{ googleSearch: {} }]`)** to discover authoritative registered domains from real-time web telemetry.
- **Autonomous Combosquatting Engine**: Flags deceptive combinations (e.g., `hdfc-update-login.com`, `claude-ai-portal.xyz`) even when newly registered and unindexed by threat feeds.

### 2. Multi-Engine Threat Intelligence
- **Live VirusTotal v3 Integration**: Multi-engine consensus scoring (+35 to +75 tiered points based on malicious vendor ratios).
- **Google Safe Browsing v4 Integration**: Direct telemetry for confirmed malware, social engineering, and unwanted software.
- **The 0/100 Rule**: A score of 0 on an unverified domain is strictly classified as **`UNKNOWN` / `Unidentified`** (*"0/100 does not equal safe; insufficient details available"*). Only verified authentic brand infrastructure receives a `LOW` (Safe) verdict.

### 3. QR Code & UPI Payment Fraud Inspector
- Scans and decodes QR codes locally in the browser or via server-side ZXing.
- Analyzes deep links, WhatsApp lures, and malicious `upi://pay` traps (e.g., fraudulent collect requests disguised as "cashback refunds").

### 4. SMS & Message Scam Analyzer
- Detects coercive utility disconnection scams (e.g., BESCOM, Mahavitaran power cut threats).
- Identifies banking KYC suspension alerts (e.g., SBI YONO, HDFC PAN update traps).
- Filters out lottery/prize fraud and task/work-from-home scams while whitelisting genuine bank transactional alerts.

### 5. Interactive AI Security Copilot
- Context-grounded follow-up chat with system prompt defenses preventing adversarial prompt overrides.
- Allows users to ask specific questions about the evidence, technical risks, or next steps.

### 6. Apple Liquid Glass Design System
- Minimalist, high-end Apple frosted aesthetic with calibrated typography, translucent glass panels, subtle border reflections, and zero generic AI slop.

---

## 🏗️ Architecture

```
                       USER INPUT (URL / QR / SMS)
                                    │
                                    ▼
                         Input Normalization & SSRF Guard
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      URL Structural Heuristics               Safe DOM Crawler (Cheerio)
      • Punycode / Homoglyphs                 • Schema.org JSON-LD (@type: Organization)
      • Subdomain Brand Spoofs                • Meta Headers & Copyright Notices
      • High-Risk TLDs                        • Credential / OTP / Payment Fields
               │                              • Cross-Domain Exfiltration
               └────────────────────┬────────────────────┘
                                    │
                                    ▼
                    Dual-Layer Brand Verifier
                    • Fast-path Authoritative Registry
                    • Real-time Google Search Grounding
                                    │
                                    ▼
                    Live Threat Intelligence
                    • VirusTotal Multi-Engine v3
                    • Google Safe Browsing v4
                                    │
                                    ▼
                    Deterministic Risk Fusion Engine
                    • Weighted Mathematical Scoring (0–100)
                    • Inconclusive Guard (0/100 ≠ Safe)
                                    │
                                    ▼
                    Gemini AI Attack-Chain Synthesizer
                    • Reasoning over Structured Evidence Tokens
                    • Low-token (<150 tokens) execution
                                    │
                                    ▼
                    Interactive Explainable Report & Copilot
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.17+ or v20+)
- [pnpm](https://pnpm.io/) (recommended) or `npm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Hackerop777/Trustlens.git
   cd Trustlens
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and add your keys:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   # Required for AI Reasoning and Live Search Grounding
   GEMINI_API_KEY=your_gemini_api_key

   # Optional for Live Multi-Engine Threat Feeds
   GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_key
   VIRUSTOTAL_API_KEY=your_virustotal_key

   # Optional Supabase Database (defaults to in-memory store if unset)
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

4. **Run the Development Server**:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Automated Test Suite

TRUSTLENS includes an end-to-end verification suite testing all detection heuristics, brand verifiers, risk calculation rules, SMS classifiers, 160+ brand TLD trust anchors, and multimodal vision engines:

```bash
pnpm tsx src/test-pipeline.ts
```

All 79 tests verify:
- ✅ URL Normalization & Tracking Parameter Stripping
- ✅ Subdomain Brand Spoofing & Punycode Detection
- ✅ SSRF Filter (Blocks `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`)
- ✅ Brand Mismatch & Impersonation on `.xyz`
- ✅ Credential & OTP Harvesting Form Detection
- ✅ Cross-Domain Form Exfiltration & Urgency Traps
- ✅ Deterministic Risk Fusion Engine
- ✅ The 0/100 UNKNOWN Classification Guard (`0/100 != Safe` warning banner)
- ✅ Autonomous Combosquatting on `.com` (Without VirusTotal)
- ✅ VirusTotal Tiered Engine Weightage (5+ engines = +75 pts)
- ✅ SMS Phishing & Genuine Transactional Whitelist
- ✅ OpenAI, Anthropic, and Claude Real-Time Brand Recognition
- ✅ Special Restricted Domains (`.bank.in`, `.gov.in`, `.ac.in`, etc.)
- ✅ 160+ Corporate Brand TLDs & ICANN Infrastructure Trust Anchors (`.google`, `.apple`, `.chase`, `.bmw`, etc.)
- ✅ Multimodal Screenshot & Computer Vision Security Forensics
- ✅ Dynamic Center-Radiating Theme Engine (Emerald -> Amber -> Orange -> Crimson)

---

## 🧩 TRUSTLENS Browser Extension (Manifest V3)

The official browser-protection layer of **TRUSTLENS**. It operates as a real-time, low-overhead sensor that monitors browsing contexts, detects deceptive indicators locally, and queries the TRUSTLENS intelligence backend to display actionable threat analysis.

```
CHROME TAB ➔ LOCAL PAGE SENSOR ➔ SERVICE WORKER ➔ TRUSTLENS API ➔ RISK GAUGE & BADGE
```

### Key Capabilities:
- **Zero-Credential Privacy Contract**: Never reads, intercepts, or logs sensitive input values, passwords, OTP digits, credit cards, or session cookies. Only structural presence flags and public DOM metadata are analyzed.
- **Real-Time SPA & DOM Observer**: Tracks single-page application route transitions (`pushState` / `popstate`) and throttles DOM mutations using security-fingerprinted debouncing.
- **Dual-Tier State Caching**: Synchronizes tab risk states across `chrome.storage.local` and in-memory caches, surviving Manifest V3 service worker lifecycle terminations.
- **Apple Frosted Glass Popup & In-Page Alert**: Displays an animated radial risk gauge (0–100), brand verification badge, threat indicators, attack chain breakdown, and in-page dismissible warnings for high-risk targets.
- **Deep Investigation Linking**: One-click `[ View Full Web Report ]` opens the investigation directly on the TRUSTLENS web platform via unique stored IDs (`?id=inv_...`).

### Loading the Extension in Chrome:
1. **Build the extension artifacts**:
   ```bash
   pnpm build:extension
   ```
2. **Load Unpacked in Chrome**:
   - Open Chrome and navigate to `chrome://extensions`
   - Toggle **Developer mode** in the top-right corner
   - Click **Load unpacked** (top-left) and select `trustlens/extension/dist`
   - Pin **TRUSTLENS** to your Chrome toolbar

3. **Run the Interactive Demo**:
   - Ensure the dev server is running: `pnpm dev`
   - **Simulated Phishing Attack**: Visit `http://localhost:3000/demo/synthetic-phishing.html` to trigger the 🚨 `100` Critical Badge and in-page alert banner.
   - **Simulated Authentic Portal**: Visit `http://localhost:3000/demo/synthetic-legit.html` to observe the 🟢 `10` Verified Low Risk badge.

---

## 📦 Production Build

```bash
pnpm build
```
Generates a fully optimized Next.js 16 build ready for deployment on Vercel or any standard Node.js server.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Developed with precision by **PhishSlayer** for **THINK AI 4.0**.
