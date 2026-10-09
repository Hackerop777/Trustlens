import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getInvestigation } from "@/lib/investigation/store";
import {
  getOrCreateCaseMemory,
  getCaseMemory,
  getAncestorChain,
  addInquiryToCaseMemory,
  checkCompletedCaseMemory,
  updateNodePosition,
  deleteNodeAndDescendants,
  createDefaultCopilotCase,
  clearCaseCanvas,
} from "@/lib/investigation/case-memory";
import { NodeEpistemicType } from "@/lib/types";

// Clean text helper to strictly eliminate asterisk formatting
function sanitizeResponseText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*\*\s+/gm, "- ")
    .replace(/\*/g, "")
    .trim();
}

/**
 * GET: Retrieve active Investigation Studio case memory & full GraphMind DAG
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let caseMemory = id ? getCaseMemory(id) : null;

    if (!caseMemory && id) {
      const investigation = getInvestigation(id);
      if (investigation) {
        caseMemory = getOrCreateCaseMemory(investigation);
      }
    }

    // If still no case memory (e.g. visiting /studio directly without previous scan), create default copilot session
    if (!caseMemory) {
      caseMemory = createDefaultCopilotCase(id || "copilot_default");
    }

    return NextResponse.json({
      caseId: caseMemory.caseId,
      target: caseMemory.target,
      startedAt: caseMemory.startedAt,
      lastActiveAt: caseMemory.lastActiveAt,
      completedChecks: caseMemory.completedChecks,
      findings: caseMemory.findings,
      inquiryHistory: caseMemory.inquiryHistory,
      nodes: caseMemory.nodes,
      edges: caseMemory.edges,
    });
  } catch (err: any) {
    console.error("[Investigation Studio GET Error]:", err);
    return NextResponse.json(
      { error: "Failed to retrieve case studio memory", details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Conversational investigation turn with GraphMind Ancestor-Only Traversal & Short-Term Case Memory
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      caseId = "copilot_default",
      targetNodeId,
      message,
      actionType = "CHAT_BRANCH",
      nodeId,
      x,
      y,
    } = body;

    // Handle Card Position Persistence
    if (actionType === "UPDATE_POSITION" && nodeId && typeof x === "number" && typeof y === "number") {
      const ok = updateNodePosition(caseId, nodeId, x, y);
      return NextResponse.json({ success: ok });
    }

    // Handle Card Deletion
    if (actionType === "DELETE_NODE" && nodeId) {
      const ok = deleteNodeAndDescendants(caseId, nodeId);
      const memory = getCaseMemory(caseId);
      return NextResponse.json({ success: ok, nodes: memory?.nodes || [], edges: memory?.edges || [] });
    }

    // Handle Clearing the Whole Canvas
    if (actionType === "CLEAR_CANVAS") {
      const newMemory = clearCaseCanvas(caseId);
      return NextResponse.json({
        success: true,
        nodes: newMemory.nodes,
        edges: newMemory.edges,
      });
    }

    if (!message) {
      return NextResponse.json(
        { error: "A message or question is required." },
        { status: 400 }
      );
    }

    // 1. Retrieve or rehydrate Case Memory
    let memory = getCaseMemory(caseId);
    if (!memory) {
      const stored = getInvestigation(caseId);
      if (stored) {
        memory = getOrCreateCaseMemory(stored);
      } else {
        memory = createDefaultCopilotCase(caseId);
      }
    }

    const cleanQuestion = message.trim();
    const activeNodeId = targetNodeId || memory.nodes[0]?.id || `node_root_${caseId}`;

    // 2. SHORT-TERM CASE MEMORY CHECK: Avoid Redundant Tool Calls
    const matchedCheck = checkCompletedCaseMemory(caseId, cleanQuestion);
    if (
      matchedCheck &&
      (cleanQuestion.toLowerCase().includes("did we check") ||
        cleanQuestion.toLowerCase().includes("status of") ||
        cleanQuestion.toLowerCase().includes("already checked"))
    ) {
      const instantReply = `From Case Memory: "${matchedCheck.name}" was completed by ${matchedCheck.source}.\n\nResult: ${matchedCheck.outcome}.\n\nThis check is cached in short-term case memory to keep responses instant.`;

      const { userNode, assistantNode, edge } = addInquiryToCaseMemory(
        caseId,
        activeNodeId,
        cleanQuestion,
        instantReply,
        "EXTERNALLY_VERIFIED",
        ["Review raw check details", "Propose next unverified check"]
      );

      return NextResponse.json({
        reply: instantReply,
        fromCache: true,
        userNode,
        assistantNode,
        edge,
        nodes: memory.nodes,
        edges: memory.edges,
      });
    }

    // 3. GRAPHMIND ANCESTOR-ONLY CONTEXT EXTRACTION
    // Strictly traverse parent chain up to Root. Sibling branches are completely excluded!
    const ancestorNodes = getAncestorChain(caseId, activeNodeId);
    const targetNode = ancestorNodes[ancestorNodes.length - 1] || memory.nodes[0];

    // Format ancestor history into conversational turns
    const ancestorConversationFormatted = ancestorNodes
      .map((n, idx) => {
        const speaker = n.role === "user" ? "User" : "TrustLens Copilot";
        return `[Step ${idx + 1} - ${speaker} (${n.title})]:\n${n.summary}`;
      })
      .join("\n\n");

    const apiKey = process.env.GEMINI_API_KEY;

    let assistantReply = "";
    let suggestedActions: string[] = [
      "What should I do if this happened to me?",
      "How can I verify this with my bank safely?",
      "Are there other red flags to look out for?",
    ];

    if (!apiKey) {
      assistantReply =
        `TrustLens Copilot Guidance:\n\n` +
        `Regarding your question on "${targetNode.label || targetNode.title}":\n\n` +
        `Safety Principle: Never enter passwords, card numbers, or share OTPs on links sent via SMS, email, or messaging apps. Always open the official app directly or type the bank's official website address manually in your browser.\n\n` +
        `If you suspect foul play, freeze your card or NetBanking access immediately using your official bank helpline.`;
    } else {
      const ai = new GoogleGenAI({ apiKey });

      const copilotSystemPrompt = `
You are TrustLens Copilot, an empathetic, expert cybersecurity & scam advisor powered by Gemini.
The user is having a non-linear conversation with you on an infinite 2D GraphMind canvas.
They can branch thoughts, ask questions, or explore security doubts.

[CRITICAL GRAPH CONTEXT ISOLATION RULE]
You only see the ANCESTOR CHAIN leading directly to this card.
Sibling branches are isolated in other threads. Answer specifically in the context of this ancestor path.

[ANCESTOR CHAIN CONTEXT]
${ancestorConversationFormatted}

[CURRENT CARD BEING BRANCHED]
Title: ${targetNode.title}
Content: ${targetNode.summary}

[INSTRUCTIONS FOR NORMAL HUMANS]
1. Explain things clearly, warmly, and without technical jargon unless you explain it simply.
2. Give concrete, practical advice that any normal person (teenager, working adult, or senior citizen) can immediately understand and follow.
3. Be reassuring, calm, and actionable.
4. ABSOLUTELY NEVER output asterisk characters ('*') anywhere in your answer. No **bold**, no *italic*, no * bullets.
5. Use simple numbered lines (1. 2. 3.) or clean hyphens (- ) for lists.
6. Keep answers concise (under 200 words) so they look great on canvas cards.
`;

      const promptText = `${copilotSystemPrompt}\n\nUser Question:\n${cleanQuestion}`;

      const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
      for (const model of candidateModels) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
              maxOutputTokens: 480,
            },
          });
          assistantReply = res.text || "";
          if (assistantReply.trim()) break;
        } catch (err: any) {
          console.warn(`[Copilot Studio API] ${model} failed:`, err?.message || err);
        }
      }

      if (!assistantReply.trim()) {
        assistantReply = `Regarding "${cleanQuestion}": Stay vigilant. Never share OTP or password credentials on unverified websites. Navigate directly to official bank applications for any critical account actions.`;
      }
    }

    assistantReply = sanitizeResponseText(assistantReply);

    // 4. INSERT INTO GRAPHMIND CASE MEMORY (New DAG Nodes + Bezier Edge)
    const { userNode, assistantNode, edge } = addInquiryToCaseMemory(
      caseId,
      activeNodeId,
      cleanQuestion,
      assistantReply,
      "AI_INFERENCE",
      suggestedActions
    );

    return NextResponse.json({
      reply: assistantReply,
      fromCache: false,
      userNode,
      assistantNode,
      edge,
      ancestorPathCount: ancestorNodes.length,
      nodes: memory.nodes,
      edges: memory.edges,
      suggestedNextActions: suggestedActions,
    });
  } catch (err: any) {
    console.error("[Copilot Studio POST Error]:", err);
    return NextResponse.json(
      { error: "Failed to process Copilot inquiry", details: err?.message },
      { status: 500 }
    );
  }
}
