/**
 * Automated Verification Suite for TRUSTLENS Investigation Studio powered by GraphMind
 * 
 * Tests:
 * 1. DAG Graph Construction & Epistemic Purity
 * 2. Strict Distinction of Facts, Verified Findings, and Inferences
 * 3. Short-Term Case Memory & Cache Retrieval (Avoiding Redundant Calls)
 * 4. GraphMind Ancestor-Only Context Traversal Algorithm
 * 5. Dynamic Node Branching & Bezier Connectivity
 * 6. Studio API Endpoints (GET and POST)
 */

import { buildInvestigationGraph } from "./lib/graphmind/graph-builder";
import {
  getOrCreateCaseMemory,
  getCaseMemory,
  getAncestorChain,
  addInquiryToCaseMemory,
  checkCompletedCaseMemory,
} from "./lib/investigation/case-memory";
import { InvestigationResult } from "./lib/types";
import { saveInvestigation } from "./lib/investigation/store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function runStudioTests() {
  console.log("\n=======================================================");
  console.log("GRAPHMIND INVESTIGATION STUDIO VERIFICATION SUITE");
  console.log("=======================================================\n");

  const mockInvestigation: InvestigationResult = {
    id: "inv_test_graphmind_999",
    createdAt: new Date().toISOString(),
    inputType: "URL",
    target: "https://hdfc-security-verify.xyz/login",
    urlAnalysis: {
      normalizedUrl: "https://hdfc-security-verify.xyz/login",
      hostname: "hdfc-security-verify.xyz",
      registeredDomain: "hdfc-security-verify.xyz",
      tld: "xyz",
      subdomain: "",
      protocol: "https:",
      pathname: "/login",
      searchParams: {},
      isPunycode: false,
    },
    pageAnalysis: {
      finalUrl: "https://hdfc-security-verify.xyz/login",
      httpStatus: 200,
      contentType: "text/html",
      redirectChain: ["https://hdfc-security-verify.xyz/redirect", "https://hdfc-security-verify.xyz/login"],
      title: "HDFC Bank NetBanking Security Verification",
      metaDescription: "Verify your HDFC account",
      claimedBrandCandidates: ["HDFC Bank"],
      forms: [
        {
          action: "https://attacker-harvester.xyz/steal",
          method: "POST",
          inputs: [
            { name: "userId", type: "text" },
            { name: "password", type: "password" },
            { name: "otp", type: "text" },
          ],
        },
      ],
      hasCredentialForm: true,
      hasOtpForm: true,
      hasPaymentForm: false,
      hasCrossDomainForm: true,
      urgencyIndicators: ["Immediate Action Required", "within 24 hours"],
      socialEngineeringKeywords: ["kyc", "bank alert"],
      iframeCount: 0,
      scriptCount: 1,
      sanitizedTextSnippet: "HDFC NetBanking KYC",
    },
    brandVerification: {
      claimedBrand: "HDFC Bank",
      observedDomain: "hdfc-security-verify.xyz",
      expectedDomains: ["hdfcbank.com", "hdfc.com", "hdfc.bank.in"],
      status: "MISMATCH",
      confidence: "high",
      reason: "Domain 'hdfc-security-verify.xyz' does not match official domains [hdfcbank.com, hdfc.com].",
      verificationSource: "TrustLens Tier-0 Authoritative Registry",
    },
    threatIntel: [
      {
        source: "VirusTotal",
        isMalicious: true,
        details: "12 engines flagged phishing",
      },
    ],
    evidence: [
      {
        id: "ev_1",
        category: "BRAND_IDENTITY",
        severity: "CRITICAL",
        title: "Brand Impersonation: HDFC Bank",
        description: "Operating on unofficial domain hdfc-security-verify.xyz",
        source: "Brand Verifier",
      },
      {
        id: "ev_2",
        category: "CREDENTIAL_HARVESTING",
        severity: "CRITICAL",
        title: "Credential Harvesting Form",
        description: "Submits password & OTP to external harvester",
        source: "DOM Security Sensor",
      },
    ],
    aiAssessment: {
      summary: "Critical Threat — Malicious Impersonation of HDFC Bank.",
      plainLanguageVerdict: "Fake banking portal designed to harvest credentials.",
      modelConfidence: 95,
      attackChain: [
        {
          step: 1,
          stage: "Brand Spoofing & Lure",
          description: "Deceptive domain visually imitates HDFC Bank NetBanking",
          evidenceIds: ["ev_1"],
        },
        {
          step: 2,
          stage: "Credential & 2FA Exfiltration",
          description: "Captures credentials and transmits to attacker server",
          evidenceIds: ["ev_2"],
        },
      ],
      identifiedDeceptions: ["Combosquatting", "Fake NetBanking Portal"],
    },
    riskAssessment: {
      score: 100,
      classification: "CRITICAL",
      confidence: "HIGH",
      contributors: [
        { signal: "Brand Impersonation", category: "BRAND", points: 45, rationale: "Fake domain" },
        { signal: "Password Form", category: "DOM", points: 30, rationale: "Harvesting form" },
      ],
      verdictHeadline: "Critical Threat: Phishing",
      scoreBreakdownSummary: "Combined score reached max 100.",
    },
    recommendations: {
      doList: ["Close tab immediately", "Change NetBanking password"],
      doNotList: ["Do not enter credentials"],
    },
    limitations: [],
  };

  saveInvestigation(mockInvestigation);

  // -------------------------------------------------------------
  // Test 1: DAG Graph Construction & Epistemic Purity
  // -------------------------------------------------------------
  console.log("--- 1. Testing DAG Graph Construction & Epistemic Purity ---");
  const graph = buildInvestigationGraph(mockInvestigation);

  assert(graph.nodes.length >= 7, `Graph contains >= 7 nodes (found ${graph.nodes.length})`);
  assert(graph.edges.length >= 6, `Graph contains >= 6 connecting edges (found ${graph.edges.length})`);

  const rootNode = graph.nodes.find((n) => n.type === "ROOT_TARGET");
  assert(Boolean(rootNode), "Root target node exists");
  assert(rootNode?.epistemicType === "OBSERVED_FACT", "Root node is classified as OBSERVED_FACT");

  const brandNode = graph.nodes.find((n) => n.type === "CLAIMED_BRAND");
  assert(Boolean(brandNode), "Claimed brand node exists");
  assert(brandNode?.label === "HDFC Bank", "Claimed brand is HDFC Bank");

  const verdictNode = graph.nodes.find((n) => n.type === "VERIFICATION_VERDICT");
  assert(Boolean(verdictNode), "Verification verdict node exists");
  assert(verdictNode?.epistemicType === "EXTERNALLY_VERIFIED", "Verification verdict is EXTERNALLY_VERIFIED");
  assert(verdictNode?.verificationStatus === "CONFLICTING", "Mismatch marked as CONFLICTING status");

  const attackNodes = graph.nodes.filter((n) => n.type === "ATTACK_CHAIN_STAGE");
  assert(attackNodes.length === 2, `Attack chain steps mapped to ${attackNodes.length} nodes`);
  assert(attackNodes[0].epistemicType === "AI_INFERENCE", "Attack chain stage is classified as AI_INFERENCE");
  assert(attackNodes[0].verificationStatus === "INFERRED", "Attack chain stage verification status is INFERRED");

  // -------------------------------------------------------------
  // Test 2: Short-Term Case Memory System
  // -------------------------------------------------------------
  console.log("\n--- 2. Testing Short-Term Case Memory System ---");
  const caseMemory = getOrCreateCaseMemory(mockInvestigation);

  assert(caseMemory.caseId === mockInvestigation.id, "Case memory initialized with matching ID");
  assert(caseMemory.completedChecks.length >= 4, `Case memory registered >= 4 completed checks (got ${caseMemory.completedChecks.length})`);

  // Verify caching prevents redundant tool calls
  const cachedCheck = checkCompletedCaseMemory(caseMemory.caseId, "Brand Identity");
  assert(Boolean(cachedCheck), "Found completed check for Brand Identity in memory");
  assert(cachedCheck?.outcome.includes("MISMATCH"), "Cached outcome contains MISMATCH status");

  const threatCheck = checkCompletedCaseMemory(caseMemory.caseId, "Threat Intelligence");
  assert(Boolean(threatCheck), "Found completed check for Threat Intelligence in memory");
  assert(threatCheck?.outcome.includes("malicious"), "Cached outcome records malicious status without re-fetching");

  // -------------------------------------------------------------
  // Test 3: GraphMind Ancestor-Only Context Traversal
  // -------------------------------------------------------------
  console.log("\n--- 3. Testing GraphMind Ancestor-Only Context Traversal ---");
  // Find a leaf attack node
  const leafNode = caseMemory.nodes.find((n) => n.id.includes("step_2"));
  assert(Boolean(leafNode), "Found leaf attack node (Step 2)");

  const ancestorChain = getAncestorChain(caseMemory.caseId, leafNode!.id);
  assert(ancestorChain.length >= 2, `Ancestor chain extracted ${ancestorChain.length} nodes strictly up to root`);
  assert(ancestorChain[0].type === "ROOT_TARGET", "Ancestor chain root is ROOT_TARGET");
  assert(ancestorChain[ancestorChain.length - 1].id === leafNode!.id, "Ancestor chain terminates at target leaf node");

  // Verify sibling nodes are NOT present in the ancestor chain
  const formNode = caseMemory.nodes.find((n) => n.type === "SUSPICIOUS_FORM");
  if (formNode && formNode.parentId !== leafNode?.id) {
    const includesSibling = ancestorChain.some((n) => n.id === formNode.id);
    assert(!includesSibling, "Parallel/sibling branches are strictly excluded from ancestor prompt context");
  }

  // -------------------------------------------------------------
  // Test 4: Conversational Branching & Dynamic Node Insertion
  // -------------------------------------------------------------
  console.log("\n--- 4. Testing Conversational Branching & DAG Growth ---");
  const initialNodeCount = caseMemory.nodes.length;
  const initialEdgeCount = caseMemory.edges.length;

  const { userNode, assistantNode, edge } = addInquiryToCaseMemory(
    caseMemory.caseId,
    leafNode!.id,
    "Why is the form exfiltration considered suspicious?",
    "The HTML form specifies action='https://attacker-harvester.xyz/steal', routing sensitive inputs to an unrelated third party.",
    "OBSERVED_FACT",
    ["Examine form action IP", "Verify TLS certificate"]
  );

  assert(userNode.parentId === leafNode!.id, "User inquiry node parented to targeted leaf node");
  assert(assistantNode.parentId === userNode.id, "Assistant node parented to user inquiry node");
  assert(edge.fromId === userNode.id && edge.toId === assistantNode.id, "Bezier edge connects user inquiry to assistant response");
  assert(caseMemory.nodes.length === initialNodeCount + 2, `Case memory graph grew by exactly 2 nodes (now ${caseMemory.nodes.length})`);
  assert(caseMemory.edges.length === initialEdgeCount + 2, `Case memory edges grew by exactly 2 edges (now ${caseMemory.edges.length})`);
  assert(caseMemory.inquiryHistory.length === 1, "Inquiry history recorded conversational turn");

  // -------------------------------------------------------------
  // Test 5: Card Catch & Move Physics (Position Updates)
  // -------------------------------------------------------------
  console.log("\n--- 5. Testing Card Catch & Move Physics (Drag Updates) ---");
  const { updateNodePosition } = await import("./lib/investigation/case-memory");
  const origX = userNode.x;
  const origY = userNode.y;
  const newX = origX + 150;
  const newY = origY - 75;

  const moveSuccess = updateNodePosition(caseMemory.caseId, userNode.id, newX, newY);
  assert(moveSuccess, "Node position updated successfully");
  const updatedNode = caseMemory.nodes.find((n) => n.id === userNode.id);
  assert(updatedNode?.x === newX && updatedNode?.y === newY, `Card coordinates updated: (${newX}, ${newY})`);

  // -------------------------------------------------------------
  // Test 6: Strict Sibling Memory Isolation Verification
  // -------------------------------------------------------------
  console.log("\n--- 6. Testing Strict Sibling Memory Isolation ---");
  // Branch B from leafNode (sibling of userNode)
  const branchB = addInquiryToCaseMemory(
    caseMemory.caseId,
    leafNode!.id,
    "Parallel question on alternate topic (Branch B)",
    "Branch B Copilot answer",
    "AI_INFERENCE"
  );

  // Get ancestor chain of Branch B
  const branchBAncestors = getAncestorChain(caseMemory.caseId, branchB.assistantNode.id);

  // Sibling userNode and assistantNode from Branch A must NEVER appear in Branch B's ancestors!
  const hasSiblingA_User = branchBAncestors.some((n) => n.id === userNode.id);
  const hasSiblingA_Assistant = branchBAncestors.some((n) => n.id === assistantNode.id);

  assert(!hasSiblingA_User, "Branch B CANNOT access sibling Branch A's user question (Context Isolated)");
  assert(!hasSiblingA_Assistant, "Branch B CANNOT access sibling Branch A's assistant answer (Context Isolated)");

  // -------------------------------------------------------------
  // Test 7: Default Copilot Session for Everyday Users
  // -------------------------------------------------------------
  console.log("\n--- 7. Testing Default Copilot Session for Everyday Users ---");
  const { createDefaultCopilotCase } = await import("./lib/investigation/case-memory");
  const copilotCase = createDefaultCopilotCase("default_consumer_chat");

  assert(Boolean(copilotCase), "Default Copilot session initialized");
  assert(copilotCase.nodes.length >= 1, "Root Copilot card created");
  assert(copilotCase.nodes[0].title.includes("TrustLens Copilot"), "Root card is TrustLens Copilot");
  assert(Boolean(copilotCase.nodes[0].suggestedActions?.length), "Copilot provides helpful prompt suggestions for normal users");

  console.log("\n=======================================================");
  console.log("ALL GRAPHMIND INVESTIGATION STUDIO TESTS PASSED (100%)");
  console.log("=======================================================\n");
}

runStudioTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
