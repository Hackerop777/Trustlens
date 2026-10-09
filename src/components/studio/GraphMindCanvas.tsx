"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  InvestigationGraphNode,
  InvestigationGraphEdge,
  CaseMemory,
} from "@/lib/types";
import {
  Shield,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Send,
  Loader2,
  Move,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ChevronRight,
  Info,
  CornerDownRight,
} from "lucide-react";

interface GraphMindCanvasProps {
  caseMemory: CaseMemory;
  onUpdateCaseMemory?: (updated: CaseMemory) => void;
  className?: string;
}

export function GraphMindCanvas({
  caseMemory,
  onUpdateCaseMemory,
  className = "",
}: GraphMindCanvasProps) {
  // Canvas viewport transform state (pan & zoom)
  const [pan, setPan] = useState({ x: 100, y: 140 });
  const [zoom, setZoom] = useState(0.85);

  // Background panning state
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Node Dragging Physics state ("Catch and move the nodes")
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hasMovedNodeRef = useRef(false);

  // Local mutable copy of nodes for instant 60fps dragging
  const [localNodes, setLocalNodes] = useState<InvestigationGraphNode[]>(caseMemory.nodes);

  // Keep localNodes in sync with caseMemory when caseMemory.nodes length or items change
  useEffect(() => {
    setLocalNodes(caseMemory.nodes);
  }, [caseMemory.nodes]);

  // Selected node (target for branching follow-up questions)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    caseMemory.nodes[0]?.id || null
  );

  // Prompt dock state
  const [inquiryText, setInquiryText] = useState("");
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear canvas modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearingCanvas, setIsClearingCanvas] = useState(false);

  const handleClearCanvas = async () => {
    setIsClearingCanvas(true);
    try {
      const res = await fetch("/api/investigate/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseMemory.caseId,
          actionType: "CLEAR_CANVAS",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.nodes && data.nodes.length > 0) {
          setLocalNodes(data.nodes);
          setSelectedNodeId(data.nodes[0].id);
          setPan({ x: 100, y: 140 });
          setZoom(0.85);

          if (onUpdateCaseMemory) {
            onUpdateCaseMemory({
              ...caseMemory,
              nodes: data.nodes,
              edges: data.edges || [],
            });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to clear canvas:", err);
    } finally {
      setIsClearingCanvas(false);
      setShowClearModal(false);
    }
  };

  const stageRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Current focused node
  const selectedNode = useMemo(() => {
    return localNodes.find((n) => n.id === selectedNodeId) || localNodes[0];
  }, [localNodes, selectedNodeId]);

  // Compute Active Ancestor Chain IDs (GraphMind strictly isolated parent path)
  const activeAncestorIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>();
    let currId: string | null = selectedNodeId;
    const map = new Map<string, InvestigationGraphNode>();
    for (const n of localNodes) map.set(n.id, n);

    while (currId && map.has(currId)) {
      ids.add(currId);
      currId = map.get(currId)!.parentId;
    }
    return ids;
  }, [selectedNodeId, localNodes]);

  // Formatted breadcrumb path for UI header
  const ancestorBreadcrumbs = useMemo(() => {
    if (!selectedNodeId) return [];
    const list: InvestigationGraphNode[] = [];
    let currId: string | null = selectedNodeId;
    const map = new Map<string, InvestigationGraphNode>();
    for (const n of localNodes) map.set(n.id, n);

    while (currId && map.has(currId)) {
      const node = map.get(currId)!;
      list.unshift(node);
      currId = node.parentId;
    }
    return list;
  }, [selectedNodeId, localNodes]);

  // Estimated token count of the strictly isolated ancestor chain (< 450 tokens)
  const estimatedAncestorTokens = useMemo(() => {
    const text = ancestorBreadcrumbs.map((n) => n.summary || n.title).join(" ");
    return Math.max(120, Math.round(text.split(/\s+/).length * 1.3));
  }, [ancestorBreadcrumbs]);

  // Bounding box for minimap radar
  const boundingBox = useMemo(() => {
    if (localNodes.length === 0) return { minX: 0, maxX: 1200, minY: 0, maxY: 800, width: 1200, height: 800 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of localNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y < minY) minY = n.y;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    const padding = 240;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: Math.max(1000, maxX - minX + padding * 2),
      height: Math.max(700, maxY - minY + padding * 2),
    };
  }, [localNodes]);

  // Draw Minimap Radar
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(7, 11, 18, 0.95)";
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / boundingBox.width;
    const scaleY = h / boundingBox.height;

    // Draw nodes on minimap
    for (const n of localNodes) {
      const nx = (n.x - boundingBox.minX) * scaleX;
      const ny = (n.y - boundingBox.minY) * scaleY;
      const nw = Math.max(4, n.width * scaleX);
      const nh = Math.max(3, n.height * scaleY);

      if (n.id === selectedNodeId) {
        ctx.fillStyle = "#34D399"; // Active node
      } else if (activeAncestorIds.has(n.id)) {
        ctx.fillStyle = "#10B981"; // Ancestor path
      } else if (n.role === "user") {
        ctx.fillStyle = "#F59E0B";
      } else {
        ctx.fillStyle = "#38BDF8";
      }

      ctx.fillRect(nx, ny, nw, nh);
    }

    // Draw Viewport Camera Box
    if (stageRef.current) {
      const vpW = stageRef.current.clientWidth;
      const vpH = stageRef.current.clientHeight;

      const camX = (-pan.x - boundingBox.minX) * scaleX;
      const camY = (-pan.y - boundingBox.minY) * scaleY;
      const camW = (vpW / zoom) * scaleX;
      const camH = (vpH / zoom) * scaleY;

      ctx.strokeStyle = "rgba(52, 211, 153, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(camX, camY, camW, camH);
    }
  }, [pan, zoom, boundingBox, localNodes, selectedNodeId, activeAncestorIds]);

  // -------------------------------------------------------------
  // Node Catch & Move Physics (Mouse Events)
  // -------------------------------------------------------------
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // If clicking a button or link inside card, don't initiate drag
    if ((e.target as HTMLElement).closest("button, a, input, textarea")) {
      return;
    }

    e.stopPropagation();
    setDraggingNodeId(nodeId);
    hasMovedNodeRef.current = false;

    const node = localNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Convert mouse client coordinates to canvas world coordinates
    const mouseWorldX = (e.clientX - pan.x) / zoom;
    const mouseWorldY = (e.clientY - pan.y) / zoom;

    dragOffsetRef.current = {
      x: mouseWorldX - node.x,
      y: mouseWorldY - node.y,
    };

    setSelectedNodeId(nodeId);
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    // Canvas background panning
    if ((e.target as HTMLElement).closest(".graphmind-card, .dock-container, .toolbar-container")) {
      return;
    }
    setIsPanningCanvas(true);
    startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Moving a Node Card
    if (draggingNodeId) {
      hasMovedNodeRef.current = true;
      const mouseWorldX = (e.clientX - pan.x) / zoom;
      const mouseWorldY = (e.clientY - pan.y) / zoom;

      const newX = Math.round(mouseWorldX - dragOffsetRef.current.x);
      const newY = Math.round(mouseWorldY - dragOffsetRef.current.y);

      setLocalNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
      );
      return;
    }

    // 2. Panning the Canvas Viewport
    if (isPanningCanvas) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      // If position moved, persist in Case Memory
      if (hasMovedNodeRef.current) {
        const movedNode = localNodes.find((n) => n.id === draggingNodeId);
        if (movedNode) {
          fetch("/api/investigate/studio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caseId: caseMemory.caseId,
              actionType: "UPDATE_POSITION",
              nodeId: movedNode.id,
              x: movedNode.x,
              y: movedNode.y,
            }),
          }).catch(console.warn);

          if (onUpdateCaseMemory) {
            onUpdateCaseMemory({
              ...caseMemory,
              nodes: localNodes,
            });
          }
        }
      }
      setDraggingNodeId(null);
    }

    setIsPanningCanvas(false);
  };

  // Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(0.3, zoom * zoomFactor), 2.2);

      const rect = stageRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        setPan({
          x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
          y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
        });
      }
      setZoom(newZoom);
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  const handleFitView = () => {
    if (!stageRef.current) return;
    const stageW = stageRef.current.clientWidth;
    const stageH = stageRef.current.clientHeight;

    const scaleX = (stageW - 120) / boundingBox.width;
    const scaleY = (stageH - 120) / boundingBox.height;
    const newZoom = Math.min(Math.max(0.4, Math.min(scaleX, scaleY)), 1.1);

    setZoom(newZoom);
    setPan({
      x: 80 - boundingBox.minX * newZoom,
      y: 80 - boundingBox.minY * newZoom,
    });
  };

  const handleCenterNode = (node: InvestigationGraphNode) => {
    if (!stageRef.current) return;
    const stageW = stageRef.current.clientWidth;
    const stageH = stageRef.current.clientHeight;

    setPan({
      x: stageW / 2 - (node.x + node.width / 2) * zoom,
      y: stageH / 2 - (node.y + node.height / 2) * zoom,
    });
  };

  // -------------------------------------------------------------
  // Delete Node & Subtree
  // -------------------------------------------------------------
  const handleDeleteNode = async (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (localNodes.length <= 1) return; // keep at least 1 root card

    // Prune locally
    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      for (const n of localNodes) {
        if (n.parentId === id) collect(n.id);
      }
    };
    collect(nodeId);

    const updatedNodes = localNodes.filter((n) => !toDelete.has(n.id));
    const updatedEdges = caseMemory.edges.filter(
      (edge) => !toDelete.has(edge.fromId) && !toDelete.has(edge.toId)
    );

    setLocalNodes(updatedNodes);
    if (selectedNodeId && toDelete.has(selectedNodeId)) {
      setSelectedNodeId(updatedNodes[0]?.id || null);
    }

    if (onUpdateCaseMemory) {
      onUpdateCaseMemory({
        ...caseMemory,
        nodes: updatedNodes,
        edges: updatedEdges,
      });
    }

    fetch("/api/investigate/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: caseMemory.caseId,
        actionType: "DELETE_NODE",
        nodeId,
      }),
    }).catch(console.warn);
  };

  // -------------------------------------------------------------
  // Conversational Investigation Turn (Gemini Copilot)
  // -------------------------------------------------------------
  const handleInquirySubmit = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const query = (customQuestion || inquiryText).trim();
    if (!query || isCopilotThinking) return;

    setIsCopilotThinking(true);
    setErrorMessage(null);

    const targetParentId = selectedNodeId || localNodes[0]?.id;

    try {
      const res = await fetch("/api/investigate/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseMemory.caseId,
          targetNodeId: targetParentId,
          message: query,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get reply from TrustLens Copilot");
      }

      const data = await res.json();

      if (data.nodes && data.edges) {
        setLocalNodes(data.nodes);
        if (onUpdateCaseMemory) {
          onUpdateCaseMemory({
            ...caseMemory,
            nodes: data.nodes,
            edges: data.edges,
          });
        }

        // Center on the new assistant response card
        if (data.assistantNode) {
          setSelectedNodeId(data.assistantNode.id);
          setTimeout(() => {
            handleCenterNode(data.assistantNode);
          }, 150);
        }
      }

      setInquiryText("");
    } catch (err: any) {
      console.error("Copilot Chat error:", err);
      setErrorMessage(err?.message || "Failed to reach TrustLens Copilot. Please try again.");
    } finally {
      setIsCopilotThinking(false);
    }
  };

  // -------------------------------------------------------------
  // Render Dynamic Cubic Bezier Splines
  // -------------------------------------------------------------
  const renderedEdges = useMemo(() => {
    const nodesMap = new Map<string, InvestigationGraphNode>();
    for (const n of localNodes) nodesMap.set(n.id, n);

    return caseMemory.edges.map((edge) => {
      const fromNode = nodesMap.get(edge.fromId);
      const toNode = nodesMap.get(edge.toId);
      if (!fromNode || !toNode) return null;

      // Start: Center-right of parent card
      const p0 = { x: fromNode.x + fromNode.width, y: fromNode.y + fromNode.height / 2 };
      // End: Center-left of child card
      const p3 = { x: toNode.x, y: toNode.y + toNode.height / 2 };

      const deltaX = p3.x - p0.x;
      const ctrlOffset = Math.max(60, Math.abs(deltaX) * 0.45);

      const p1 = { x: p0.x + ctrlOffset, y: p0.y };
      const p2 = { x: p3.x - ctrlOffset, y: p3.y };

      const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

      const isAncestor = activeAncestorIds.has(edge.fromId) && activeAncestorIds.has(edge.toId);

      return (
        <g key={edge.id} className="bezier-group">
          <path
            d={pathD}
            fill="none"
            stroke={isAncestor ? "#34D399" : "rgba(148, 163, 184, 0.25)"}
            strokeWidth={isAncestor ? 3.5 : 2}
            strokeLinecap="round"
            className={isAncestor ? "active-bezier" : "standard-bezier"}
            filter={isAncestor ? "drop-shadow(0 0 6px rgba(52, 211, 153, 0.7))" : undefined}
          />
          {isAncestor && (
            <circle r="4" fill="#34D399">
              <animateMotion path={pathD} dur="2.2s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      );
    });
  }, [localNodes, caseMemory.edges, activeAncestorIds]);

  return (
    <div
      className={`relative w-full h-full min-h-[640px] overflow-hidden bg-[#070B12] select-none text-slate-100 ${className}`}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      ref={stageRef}
      style={{ cursor: isPanningCanvas ? "grabbing" : "default" }}
    >
      {/* 1. Subtle Animated Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* 2. Scalable World Plane */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          willChange: "transform",
        }}
      >
        {/* SVG Bezier Connectors Layer */}
        <svg
          className="absolute overflow-visible pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {renderedEdges}
        </svg>

        {/* DOM Node Cards Layer */}
        <div className="absolute inset-0 pointer-events-auto">
          {localNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const isAncestor = activeAncestorIds.has(node.id);
            const isDragging = draggingNodeId === node.id;
            const isUser = node.role === "user";

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`graphmind-card absolute rounded-2xl p-5 border transition-shadow duration-150 backdrop-blur-xl ${
                  isDragging
                    ? "cursor-grabbing shadow-[0_16px_40px_rgba(0,0,0,0.8)] z-50 scale-[1.03] border-emerald-400 bg-[#0F1E29]"
                    : "cursor-grab"
                } ${
                  isSelected
                    ? "border-emerald-400 bg-[#0E1A26]/95 shadow-[0_0_32px_rgba(52,211,153,0.35)] z-40"
                    : isAncestor
                    ? "border-emerald-500/50 bg-[#0A1420]/90 shadow-[0_0_16px_rgba(52,211,153,0.15)] z-30"
                    : "border-slate-800/80 bg-[#0A101A]/85 hover:border-slate-700 hover:bg-[#0E1522]/90 z-20 opacity-80 hover:opacity-100"
                }`}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  width: `${node.width}px`,
                  minHeight: `${node.height}px`,
                }}
              >
                {/* Drag Handle & Top Metadata Row */}
                <div className="flex items-center justify-between mb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold flex items-center gap-1 ${
                        isUser
                          ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {isUser ? "👤 YOU" : "✨ COPILOT"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Move className="w-3 h-3 text-slate-500" />
                      <span>Drag to move</span>
                    </span>
                  </div>

                  {/* Actions: Delete Card */}
                  {localNodes.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNode(e, node.id)}
                      className="p-1 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition"
                      title="Delete card and its subtree"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card Title */}
                <h4 className="text-sm font-bold text-white tracking-tight mb-2 flex items-center justify-between">
                  <span>{node.title}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                  )}
                </h4>

                {/* Card Main Body Content */}
                <div className="text-xs text-slate-200/90 leading-relaxed space-y-2 mb-4 break-words">
                  {node.summary.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>

                {/* Suggested Action Chips (if Copilot node) */}
                {node.suggestedActions && node.suggestedActions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mb-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      Quick Follow-Up Ideas:
                    </span>
                    <div className="flex flex-col gap-1">
                      {node.suggestedActions.slice(0, 2).map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNodeId(node.id);
                            handleInquirySubmit(undefined, action);
                          }}
                          className="text-left text-[11px] text-emerald-300 hover:text-white bg-slate-900/60 hover:bg-emerald-950/60 p-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/30 transition flex items-center justify-between group"
                        >
                          <span className="truncate">{action}</span>
                          <CornerDownRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer: Branch Next Question Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(node.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      // Focus bottom dock input
                      const input = document.getElementById("canvas-prompt-input") as HTMLInputElement;
                      if (input) input.focus();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-300 hover:text-white font-medium flex items-center gap-1.5 transition text-[11px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ask from here</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Top Canvas Floating Toolbar: Breadcrumbs & Context Isolation Radar */}
      <div className="toolbar-container absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Active Ancestor Breadcrumb Path */}
        <div className="flex items-center gap-2 max-w-xl overflow-x-auto p-1.5 rounded-2xl bg-[#090F1A]/90 border border-slate-800 backdrop-blur-xl pointer-events-auto shadow-xl scrollbar-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copilot Context Path:</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 overflow-x-auto py-0.5">
            {ancestorBreadcrumbs.map((anc, idx) => (
              <React.Fragment key={anc.id}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(anc.id);
                    handleCenterNode(anc);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] truncate max-w-[130px] transition ${
                    anc.id === selectedNodeId
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                      : "hover:bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                  title={anc.title}
                >
                  {anc.title}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Right: Token Counter & Zoom Tools */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#090F1A]/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500">Ancestor Memory:</span>
            <span className="text-emerald-300 font-semibold">{estimatedAncestorTokens} Tokens</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-[#090F1A]/90 border border-slate-800 backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z * 1.15, 2.2))}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-400 px-1 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z * 0.85, 0.3))}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition"
              title="Fit View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-2.5 py-1 rounded-full hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
              title="Clear all cards from canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Canvas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Interactive Minimap Radar (Bottom-Right) */}
      <div className="minimap-container absolute bottom-4 right-4 z-40 rounded-xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#070B12]/95 backdrop-blur-md hidden md:block">
        <canvas
          ref={minimapCanvasRef}
          width={180}
          height={120}
          className="cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const targetX = boundingBox.minX + (clickX / 180) * boundingBox.width;
            const targetY = boundingBox.minY + (clickY / 120) * boundingBox.height;

            if (stageRef.current) {
              setPan({
                x: stageRef.current.clientWidth / 2 - targetX * zoom,
                y: stageRef.current.clientHeight / 2 - targetY * zoom,
              });
            }
          }}
        />
        <div className="px-2.5 py-1 bg-black/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Minimap</span>
          <span className="text-emerald-400">Click to Teleport</span>
        </div>
      </div>

      {/* 5. Floating Copilot Prompt Dock (Bottom Center) */}
      <div className="dock-container absolute bottom-4 left-4 md:left-1/2 md:-translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto">
        <form
          onSubmit={(e) => handleInquirySubmit(e)}
          className="relative bg-[#09101C]/95 border border-slate-700/80 hover:border-emerald-500/40 focus-within:border-emerald-400 rounded-2xl p-2.5 shadow-2xl backdrop-blur-2xl transition-all"
        >
          {/* Active Replying-To Indicator */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2 text-[11px] border-b border-slate-800/80 mb-2">
            <span className="text-slate-400 flex items-center gap-1.5 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Branching from:</span>
              <strong className="text-white font-mono truncate">{selectedNode.title}</strong>
            </span>
            <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
              Context Isolated
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="canvas-prompt-input"
              type="text"
              value={inquiryText}
              onChange={(e) => setInquiryText(e.target.value)}
              placeholder="Ask TrustLens Copilot about this card, explore doubts, or test a link..."
              disabled={isCopilotThinking}
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-500 px-3 py-1.5 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isCopilotThinking || !inquiryText.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40 shrink-0 cursor-pointer"
            >
              {isCopilotThinking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {errorMessage && (
            <div className="mt-2 text-[11px] text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
              {errorMessage}
            </div>
          )}
        </form>
      </div>

      {/* 6. Clear Canvas Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#0B132B] border border-slate-700/80 p-5 shadow-2xl text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/30 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Clear Entire Canvas?</h3>
                <p className="text-xs text-slate-400">Reset whiteboard to a fresh Copilot session</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              This will remove all branched questions and investigation cards on your canvas and restart with a clean slate. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearingCanvas}
                className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCanvas}
                disabled={isClearingCanvas}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium transition shadow-lg shadow-red-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                {isClearingCanvas ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Canvas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
