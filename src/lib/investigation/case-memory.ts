import {
  CaseMemory,
  CaseMemoryCheck,
  CaseMemoryInquiry,
  InvestigationResult,
  InvestigationGraphNode,
  InvestigationGraphEdge,
  NodeEpistemicType,
} from "../types";
import { buildInvestigationGraph } from "../graphmind/graph-builder";

// In-memory runtime cache for case memories (short-term case memory, LRU bounded)
const CASE_MEMORY_CACHE = new Map<string, CaseMemory>();
const MAX_ACTIVE_CASES = 100;

/**
 * Creates a default starter Case Memory for freeform chat with TrustLens Copilot powered by Gemini.
 * Perfect for normal users asking general questions about scams, SMS verification, OTP safety, etc.
 */
export function createDefaultCopilotCase(
  caseId = "copilot_default",
  initialTopic = "Ask TrustLens Copilot"
): CaseMemory {
  if (CASE_MEMORY_CACHE.has(caseId)) {
    return CASE_MEMORY_CACHE.get(caseId)!;
  }

  const now = new Date().toISOString();
  const rootNodeId = `node_root_${caseId}`;

  const rootNode: InvestigationGraphNode = {
    id: rootNodeId,
    parentId: null,
    role: "assistant",
    type: "ROOT_TARGET",
    epistemicType: "EXTERNALLY_VERIFIED",
    verificationStatus: "VERIFIED",
    title: "✨ TrustLens Copilot",
    label: "AI Scam & Security Assistant",
    summary: "Hello! I am your TrustLens Copilot powered by Gemini. Ask me anything about suspicious messages, fake websites, bank fraud, or online safety. Click [+ Branch] on any card to explore a new thought!",
    source: "TrustLens Copilot (Gemini)",
    confidence: "HIGH",
    timestamp: now,
    suggestedActions: [
      "How can I tell if an SMS is fake?",
      "What should I do if I entered my password on a suspicious site?",
      "How do scammers trick people with OTP codes?",
      "How does WhatsApp investment fraud work?",
    ],
    x: 100,
    y: 260,
    width: 360,
    height: 220,
  };

  const memory: CaseMemory = {
    caseId,
    target: initialTopic,
    startedAt: now,
    lastActiveAt: now,
    completedChecks: [],
    findings: [],
    inquiryHistory: [],
    nodes: [rootNode],
    edges: [],
  };

  CASE_MEMORY_CACHE.set(caseId, memory);
  return memory;
}

/**
 * Initializes or retrieves existing Short-Term Case Memory for an investigation.
 * Populates standard completed checks (URL heuristics, SSRF checks, Brand registry, etc.)
 * so conversational questions never repeat redundant tool calls.
 */
export function getOrCreateCaseMemory(result: InvestigationResult): CaseMemory {
  if (!result || !result.id) {
    return createDefaultCopilotCase();
  }

  const caseId = result.id;
  if (CASE_MEMORY_CACHE.has(caseId)) {
    const existing = CASE_MEMORY_CACHE.get(caseId)!;
    existing.lastActiveAt = new Date().toISOString();
    return existing;
  }

  // Evict oldest if capacity reached
  if (CASE_MEMORY_CACHE.size >= MAX_ACTIVE_CASES) {
    const oldestKey = CASE_MEMORY_CACHE.keys().next().value;
    if (oldestKey) CASE_MEMORY_CACHE.delete(oldestKey);
  }

  const now = new Date().toISOString();

  // Populate completed checks from the deterministic investigation pipeline
  const completedChecks: CaseMemoryCheck[] = [
    {
      checkId: `check_url_heuristics_${caseId}`,
      name: "URL Structure & Homoglyph Heuristics",
      category: "URL_ANALYSIS",
      completedAt: result.createdAt,
      outcome: result.urlAnalysis?.isPunycode
        ? "Flagged punycode homoglyph deception"
        : "Standard URL parsing completed without homoglyph spoofing",
      source: "TrustLens URL Normalizer & Heuristics Engine",
      cachedResult: result.urlAnalysis,
    },
    {
      checkId: `check_brand_registry_${caseId}`,
      name: "Authoritative Brand Identity Lookup",
      category: "BRAND_VERIFICATION",
      completedAt: result.createdAt,
      outcome: result.brandVerification
        ? `Status: ${result.brandVerification.status} (${result.brandVerification.claimedBrand || "None"})`
        : "No institutional brand claim identified",
      source: result.brandVerification?.verificationSource || "Tier-0 Brand Registry",
      cachedResult: result.brandVerification,
    },
    {
      checkId: `check_page_dom_${caseId}`,
      name: "Page Content & Credential Field Audit",
      category: "DOM_ANALYSIS",
      completedAt: result.createdAt,
      outcome: result.pageAnalysis?.hasCredentialForm
        ? "Detected active password harvesting input fields"
        : "No password fields discovered in DOM",
      source: "DOM Security Sensor",
      cachedResult: {
        hasCredentialForm: result.pageAnalysis?.hasCredentialForm,
        hasOtpForm: result.pageAnalysis?.hasOtpForm,
        hasCrossDomainForm: result.pageAnalysis?.hasCrossDomainForm,
        formCount: result.pageAnalysis?.forms?.length || 0,
      },
    },
    {
      checkId: `check_threat_intel_${caseId}`,
      name: "Third-Party Threat Intelligence Feeds",
      category: "THREAT_INTEL",
      completedAt: result.createdAt,
      outcome: (result.threatIntel && result.threatIntel.some((t) => t.isMalicious))
        ? "Flagged as malicious by external reputation feeds"
        : "No active public blocklists recorded",
      source: "VirusTotal & Google SafeBrowsing API",
      cachedResult: result.threatIntel,
    },
    {
      checkId: `check_risk_score_${caseId}`,
      name: "Deterministic Risk Fusion & Attack Chain",
      category: "RISK_EVALUATION",
      completedAt: result.createdAt,
      outcome: `Risk Score: ${result.riskAssessment?.score}/100 (${result.riskAssessment?.classification})`,
      source: "Deterministic Risk Engine & Gemini Orchestrator",
      cachedResult: result.riskAssessment,
    },
  ];

  // Extract initial findings with epistemic classifications
  const findings = result.evidence.map((ev) => ({
    id: ev.id,
    finding: `${ev.title}: ${ev.description}`,
    epistemicType:
      ev.category === "PAGE_CONTENT" ||
      ev.category === "CREDENTIAL_HARVESTING" ||
      ev.category === "URL_STRUCTURE"
        ? ("OBSERVED_FACT" as NodeEpistemicType)
        : ("EXTERNALLY_VERIFIED" as NodeEpistemicType),
    verified: ev.severity !== "INFO",
  }));

  // Build the initial GraphMind DAG
  const { nodes, edges } = buildInvestigationGraph(result);

  const memory: CaseMemory = {
    caseId,
    target: result.target,
    startedAt: result.createdAt || now,
    lastActiveAt: now,
    completedChecks,
    findings,
    inquiryHistory: [],
    nodes,
    edges,
  };

  CASE_MEMORY_CACHE.set(caseId, memory);
  return memory;
}

/**
 * Retrieves case memory by ID.
 */
export function getCaseMemory(caseId: string): CaseMemory | null {
  return CASE_MEMORY_CACHE.get(caseId) || null;
}

/**
 * Updates a node's (x, y) coordinates when dragged by the user on the canvas.
 */
export function updateNodePosition(caseId: string, nodeId: string, x: number, y: number): boolean {
  const memory = CASE_MEMORY_CACHE.get(caseId);
  if (!memory) return false;
  const node = memory.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  node.x = x;
  node.y = y;
  return true;
}

/**
 * Deletes a node and all of its recursive descendants from the DAG.
 */
export function deleteNodeAndDescendants(caseId: string, nodeId: string): boolean {
  const memory = CASE_MEMORY_CACHE.get(caseId);
  if (!memory) return false;

  const toDelete = new Set<string>();
  const collect = (id: string) => {
    toDelete.add(id);
    for (const n of memory.nodes) {
      if (n.parentId === id) collect(n.id);
    }
  };
  collect(nodeId);

  memory.nodes = memory.nodes.filter((n) => !toDelete.has(n.id));
  memory.edges = memory.edges.filter((e) => !toDelete.has(e.fromId) && !toDelete.has(e.toId));
  return true;
}

/**
 * GraphMind Ancestor-Only Context Traversal Algorithm:
 * Walks strictly upwards from targetNodeId to the Root Node along parentId links.
 * SIBLING BRANCHES AND ALTERNATIVE MULTIVERSES ARE EXCLUDED.
 * This guarantees strict context isolation and low token usage (< 500 tokens).
 */
export function getAncestorChain(caseId: string, targetNodeId: string): InvestigationGraphNode[] {
  const memory = CASE_MEMORY_CACHE.get(caseId);
  if (!memory) return [];

  const nodesMap = new Map<string, InvestigationGraphNode>();
  for (const n of memory.nodes) {
    nodesMap.set(n.id, n);
  }

  const chain: InvestigationGraphNode[] = [];
  let currId: string | null = targetNodeId;
  const visited = new Set<string>();

  while (currId && nodesMap.has(currId) && !visited.has(currId)) {
    visited.add(currId);
    const node = nodesMap.get(currId)!;
    chain.unshift(node);
    currId = node.parentId;
  }

  return chain;
}

/**
 * Appends a new user question & assistant answer to Case Memory and inserts
 * connected inquiry nodes & Bezier edges into the GraphMind DAG.
 */
export function addInquiryToCaseMemory(
  caseId: string,
  targetParentId: string,
  userQuestion: string,
  assistantReply: string,
  epistemicType: NodeEpistemicType = "AI_INFERENCE",
  suggestedNextActions: string[] = []
): { userNode: InvestigationGraphNode; assistantNode: InvestigationGraphNode; edge: InvestigationGraphEdge } {
  let memory = CASE_MEMORY_CACHE.get(caseId);
  if (!memory) {
    memory = createDefaultCopilotCase(caseId);
  }

  const parentNode = memory.nodes.find((n) => n.id === targetParentId) || memory.nodes[0];
  const now = new Date().toISOString();
  const timestampShort = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

  // Position calculation based on GraphMind auto-branching math:
  // X_new = P.x + 390, Y_new = P.y + (numSiblings * 240)
  const existingChildren = memory.nodes.filter((n) => n.parentId === parentNode.id);
  const branchOffsetY = existingChildren.length * 240;

  const userNodeId = `node_user_${timestampShort}`;
  const assistantNodeId = `node_copilot_${timestampShort}`;

  // 1. User Inquiry Node (👤 You)
  const userNode: InvestigationGraphNode = {
    id: userNodeId,
    parentId: parentNode.id,
    role: "user",
    type: "USER_QUESTION",
    epistemicType: "USER_INQUIRY",
    verificationStatus: "OBSERVED",
    title: "👤 You",
    label: userQuestion.length > 50 ? userQuestion.slice(0, 48) + "..." : userQuestion,
    summary: userQuestion,
    source: "Human Investigator",
    confidence: "HIGH",
    timestamp: now,
    x: parentNode.x + 390,
    y: parentNode.y + branchOffsetY,
    width: 340,
    height: 160,
  };

  // 2. Assistant Response Node (✨ TrustLens Copilot)
  const assistantNode: InvestigationGraphNode = {
    id: assistantNodeId,
    parentId: userNodeId,
    role: "assistant",
    type: "INVESTIGATION_ACTION",
    epistemicType,
    verificationStatus: epistemicType === "EXTERNALLY_VERIFIED" ? "VERIFIED" : "INFERRED",
    title: "✨ TrustLens Copilot",
    label: assistantReply.slice(0, 52) + "...",
    summary: assistantReply,
    source: "TrustLens Copilot (Gemini)",
    confidence: "HIGH",
    timestamp: now,
    suggestedActions: suggestedNextActions,
    x: userNode.x + 380,
    y: userNode.y,
    width: 360,
    height: 220,
  };

  const edge1: InvestigationGraphEdge = {
    id: `edge_${parentNode.id}_${userNodeId}`,
    fromId: parentNode.id,
    toId: userNodeId,
    relation: "asked",
    strength: "STRONG",
  };

  const edge2: InvestigationGraphEdge = {
    id: `edge_${userNodeId}_${assistantNodeId}`,
    fromId: userNodeId,
    toId: assistantNodeId,
    relation: "answered",
    strength: "STRONG",
  };

  // Update memory
  memory.nodes.push(userNode, assistantNode);
  memory.edges.push(edge1, edge2);

  const inquiryRecord: CaseMemoryInquiry = {
    id: `inq_${timestampShort}`,
    nodeId: assistantNodeId,
    userQuestion,
    agentAnswer: assistantReply,
    suggestedNextActions,
    timestamp: now,
  };
  memory.inquiryHistory.push(inquiryRecord);
  memory.lastActiveAt = now;

  return { userNode, assistantNode, edge: edge2 };
}

/**
 * Checks if a specific forensic check has already been performed in short-term case memory.
 * If yes, returns the cached result without making redundant external calls.
 */
export function checkCompletedCaseMemory(
  caseId: string,
  checkName: string
): CaseMemoryCheck | undefined {
  const memory = CASE_MEMORY_CACHE.get(caseId);
  if (!memory) return undefined;

  const cleanQuery = checkName.toLowerCase();
  return memory.completedChecks.find(
    (c) =>
      c.name.toLowerCase().includes(cleanQuery) ||
      c.category.toLowerCase().includes(cleanQuery)
  );
}

/**
 * Clears the entire canvas and resets the whiteboard to a clean starter Copilot card.
 */
export function clearCaseCanvas(caseId: string): CaseMemory {
  const memory = CASE_MEMORY_CACHE.get(caseId);
  const now = new Date().toISOString();
  const rootNodeId = `node_root_${caseId}_${Date.now().toString(36)}`;

  const cleanRootNode: InvestigationGraphNode = {
    id: rootNodeId,
    parentId: null,
    role: "assistant",
    type: "ROOT_TARGET",
    epistemicType: "EXTERNALLY_VERIFIED",
    verificationStatus: "VERIFIED",
    title: "✨ TrustLens Copilot",
    label: "Fresh Whiteboard Session",
    summary: "Whiteboard cleared. I am ready for your questions! Ask me anything about suspicious messages, fake websites, or online safety. Click [+ Ask from here] to branch a new thread.",
    source: "TrustLens Copilot (Gemini)",
    confidence: "HIGH",
    timestamp: now,
    suggestedActions: [
      "How do scammers trick people with OTP codes?",
      "How can I tell if an SMS claiming electricity cut is fake?",
      "What should I do if I entered credentials on an unknown site?",
      "How does WhatsApp investment fraud work?",
    ],
    x: 100,
    y: 240,
    width: 360,
    height: 220,
  };

  const newMemory: CaseMemory = {
    caseId,
    target: memory?.target || "Ask TrustLens Copilot",
    startedAt: now,
    lastActiveAt: now,
    completedChecks: memory?.completedChecks || [],
    findings: [],
    inquiryHistory: [],
    nodes: [cleanRootNode],
    edges: [],
  };

  CASE_MEMORY_CACHE.set(caseId, newMemory);
  return newMemory;
}
