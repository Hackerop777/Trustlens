/**
 * Shared Type Definitions for TRUSTLENS Chrome Extension (Manifest V3)
 */

export type RiskClassification = "CRITICAL" | "HIGH" | "SUSPICIOUS" | "LOW" | "UNKNOWN";

export interface ExtensionPageSignals {
  hasPasswordField: boolean;
  hasOtpField: boolean;
  hasPaymentField: boolean;
  hasCrossDomainForm: boolean;
  externalFormAction?: string;
  urgencyDetected: boolean;
  urgencySnippets: string[];
  inputCount: number;
  formCount: number;
}

export interface ExtensionScanPayload {
  url: string;
  hostname: string;
  page: {
    title: string;
    metaDescription?: string;
    claimedBrands: string[];
    snippet?: string;
  };
  signals: ExtensionPageSignals;
}

export interface ExtensionAnalysisResponse {
  investigationId: string;
  riskScore: number;
  classification: RiskClassification;
  summary: string;
  topSignals: string[];
  attackChain: string[];
  recommendedActions: string[];
  reportUrl: string;
  brandClaim?: {
    claimedBrand?: string;
    status?: "MATCH" | "MISMATCH" | "UNKNOWN";
    isMatch?: boolean;
  };
}

export type ExtensionMessage =
  | { type: "PAGE_SCANNED"; payload: ExtensionScanPayload }
  | { type: "GET_CURRENT_TAB_STATUS" }
  | { type: "TRIGGER_RESCAN" };

export interface CachedScanResult {
  url: string;
  hostname: string;
  timestamp: number;
  analysis: ExtensionAnalysisResponse;
}
