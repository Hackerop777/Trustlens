import { z } from "zod";

// ==========================================
// 1. INPUT CONTRACTS
// ==========================================

export const InputTypeSchema = z.enum(["URL", "MESSAGE", "IMAGE", "QR"]);
export type InputType = z.infer<typeof InputTypeSchema>;

export const InvestigationInputSchema = z.object({
  type: InputTypeSchema,
  content: z.string().min(1, "Input content cannot be empty"),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type InvestigationInput = z.infer<typeof InvestigationInputSchema>;

// ==========================================
// 2. URL ANALYSIS CONTRACTS
// ==========================================

export const URLAnalysisSchema = z.object({
  rawUrl: z.string(),
  normalizedUrl: z.string(),
  protocol: z.string(),
  hostname: z.string(),
  registeredDomain: z.string(),
  subdomain: z.string(),
  path: z.string(),
  queryParamsCount: z.number(),
  entropy: z.number(),
  isIpAddress: z.boolean(),
  isPunycode: z.boolean(),
  isShortener: z.boolean(),
  suspiciousKeywords: z.array(z.string()),
  subdomainDepth: z.number(),
  flags: z.array(z.string()),
});
export type URLAnalysis = z.infer<typeof URLAnalysisSchema>;

// ==========================================
// 3. PAGE FETCH & CONTENT ANALYSIS CONTRACTS
// ==========================================

export const RedirectHopSchema = z.object({
  url: z.string(),
  status: z.number(),
  statusText: z.string().optional(),
});
export type RedirectHop = z.infer<typeof RedirectHopSchema>;

export const SecurityFormSchema = z.object({
  id: z.string().optional(),
  action: z.string(),
  method: z.string(),
  isCrossDomain: z.boolean(),
  hasPasswordInput: z.boolean(),
  hasOtpInput: z.boolean(),
  hasPaymentInput: z.boolean(),
  fieldNames: z.array(z.string()),
});
export type SecurityForm = z.infer<typeof SecurityFormSchema>;

export const PageAnalysisSchema = z.object({
  finalUrl: z.string(),
  httpStatus: z.number(),
  contentType: z.string(),
  redirectChain: z.array(RedirectHopSchema),
  title: z.string(),
  metaDescription: z.string(),
  ogSiteName: z.string().optional(),
  claimedBrandCandidates: z.array(z.string()),
  forms: z.array(SecurityFormSchema),
  hasCredentialForm: z.boolean(),
  hasOtpForm: z.boolean(),
  hasPaymentForm: z.boolean(),
  hasCrossDomainForm: z.boolean(),
  urgencyIndicators: z.array(z.string()),
  socialEngineeringKeywords: z.array(z.string()),
  iframeCount: z.number(),
  scriptCount: z.number(),
  sanitizedTextSnippet: z.string(),
});
export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

// ==========================================
// 4. BRAND VERIFICATION CONTRACTS
// ==========================================

export const BrandVerificationStatusSchema = z.enum(["MATCH", "MISMATCH", "UNKNOWN"]);
export type BrandVerificationStatus = z.infer<typeof BrandVerificationStatusSchema>;

export const BrandVerificationSchema = z.object({
  claimedBrand: z.string(),
  observedDomain: z.string(),
  expectedDomains: z.array(z.string()),
  status: BrandVerificationStatusSchema,
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
  verificationSource: z.string(),
});
export type BrandVerification = z.infer<typeof BrandVerificationSchema>;

// ==========================================
// 5. THREAT INTELLIGENCE CONTRACTS
// ==========================================

export const ThreatIntelResultSchema = z.object({
  provider: z.string(),
  isFlagged: z.boolean(),
  threatType: z.string().optional(),
  reputationScore: z.number().optional(),
  maliciousCount: z.number().optional(),
  totalEngines: z.number().optional(),
  details: z.string().optional(),
});
export type ThreatIntelResult = z.infer<typeof ThreatIntelResultSchema>;

// ==========================================
// 6. STRUCTURED EVIDENCE CONTRACTS
// ==========================================

export const EvidenceCategorySchema = z.enum([
  "BRAND_IDENTITY",
  "DOMAIN_IDENTITY",
  "URL_STRUCTURE",
  "PAGE_CONTENT",
  "CREDENTIAL_HARVESTING",
  "SOCIAL_ENGINEERING",
  "NETWORK_REDIRECT",
  "THREAT_INTELLIGENCE",
]);
export type EvidenceCategory = z.infer<typeof EvidenceCategorySchema>;

export const EvidenceSeveritySchema = z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type EvidenceSeverity = z.infer<typeof EvidenceSeveritySchema>;

export const EvidenceItemSchema = z.object({
  id: z.string(),
  category: EvidenceCategorySchema,
  severity: EvidenceSeveritySchema,
  title: z.string(),
  description: z.string(),
  technicalDetails: z.record(z.string(), z.any()).optional(),
  source: z.string(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ==========================================
// 7. AI REASONING & ATTACK CHAIN CONTRACTS
// ==========================================

export const AttackChainStepSchema = z.object({
  step: z.number(),
  stage: z.string(),
  description: z.string(),
  evidenceIds: z.array(z.string()),
});
export type AttackChainStep = z.infer<typeof AttackChainStepSchema>;

export const AIAssessmentSchema = z.object({
  summary: z.string(),
  plainLanguageVerdict: z.string(),
  attackChain: z.array(AttackChainStepSchema),
  identifiedDeceptions: z.array(z.string()),
  modelConfidence: z.number().min(0).max(100),
  rawReasoning: z.string().optional(),
  isAiFallback: z.boolean().default(false),
});
export type AIAssessment = z.infer<typeof AIAssessmentSchema>;

// ==========================================
// 8. RISK FUSION ENGINE CONTRACTS
// ==========================================

export const RiskClassificationSchema = z.enum(["LOW", "SUSPICIOUS", "HIGH", "CRITICAL", "UNKNOWN"]);
export type RiskClassification = z.infer<typeof RiskClassificationSchema>;

export const RiskContributionSchema = z.object({
  signal: z.string(),
  category: z.string(),
  points: z.number(),
  rationale: z.string(),
});
export type RiskContribution = z.infer<typeof RiskContributionSchema>;

export const RiskAssessmentSchema = z.object({
  score: z.number().min(0).max(100),
  classification: RiskClassificationSchema,
  confidence: z.number().min(0).max(100),
  contributors: z.array(RiskContributionSchema),
  verdictHeadline: z.string(),
  scoreBreakdownSummary: z.string(),
});
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// ==========================================
// 9. RECOMMENDATIONS & POST-VICTIM PLAYBOOK
// ==========================================

export const RecommendedActionsSchema = z.object({
  doList: z.array(z.string()),
  doNotList: z.array(z.string()),
  urgentNotice: z.string().optional(),
});
export type RecommendedActions = z.infer<typeof RecommendedActionsSchema>;

export const PostVictimStepSchema = z.object({
  stepNumber: z.number(),
  title: z.string(),
  instruction: z.string(),
  officialResource: z.string().optional(),
  urgency: z.enum(["IMMEDIATE", "HIGH", "MEDIUM"]),
});
export type PostVictimStep = z.infer<typeof PostVictimStepSchema>;

export const PostVictimGuidanceSchema = z.object({
  actionType: z.string(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM"]),
  summary: z.string(),
  steps: z.array(PostVictimStepSchema),
  disclaimer: z.string(),
});
export type PostVictimGuidance = z.infer<typeof PostVictimGuidanceSchema>;

// ==========================================
// 10. COMPREHENSIVE INVESTIGATION RESULT
// ==========================================

export const InvestigationResultSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  inputType: InputTypeSchema,
  target: z.string(),
  urlAnalysis: URLAnalysisSchema.optional(),
  pageAnalysis: PageAnalysisSchema.optional(),
  brandVerification: BrandVerificationSchema.optional(),
  threatIntel: z.array(ThreatIntelResultSchema).optional(),
  evidence: z.array(EvidenceItemSchema),
  aiAssessment: AIAssessmentSchema,
  riskAssessment: RiskAssessmentSchema,
  recommendations: RecommendedActionsSchema,
  limitations: z.array(z.string()),
});
export type InvestigationResult = z.infer<typeof InvestigationResultSchema>;

// ==========================================
// 11. CONVERSATION CONTRACTS
// ==========================================

export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string().optional(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const ChatRequestSchema = z.object({
  investigationId: z.string(),
  message: z.string(),
  history: z.array(ConversationMessageSchema).optional(),
  investigationContext: InvestigationResultSchema.optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
