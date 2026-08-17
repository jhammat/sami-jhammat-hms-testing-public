"use client";

import React, { useState, useMemo } from "react";
import {
  MASTER_MINDMAP_DATA,
  PortalNode,
  PORTAL_COLORS,
} from "./showcase-data";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  Database,
  Lock,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  X,
  Stethoscope,
  HeartPulse,
  FlaskConical,
  Scan,
  Pill,
  Receipt,
  TrendingUp,
  UserPlus,
  Sliders,
  ShieldAlert,
} from "lucide-react";

interface InteractiveMindmapProps {
  onOpenScreenshotModal?: (title: string, src: string, details?: string) => void;
}

export function InteractiveMindmap({ onOpenScreenshotModal }: InteractiveMindmapProps) {
  const [selectedNode, setSelectedNode] = useState<PortalNode>(MASTER_MINDMAP_DATA[0]!);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    platform: true,
    admin: true,
    doctor: true,
    patient: true,
    reception: true,
    laboratory: true,
    radiology: true,
    pharmacy: true,
    billing: true,
    management: true,
  });

  const categories = [
    { id: "all", label: "All 10 Portals" },
    { id: "governance", label: "Governance & Admin" },
    { id: "clinical", label: "Clinical & Patient Care" },
    { id: "diagnostics", label: "Diagnostics & Pharmacy" },
    { id: "revenue", label: "Revenue & Management" },
  ];

  const getPortalIcon = (id: string) => {
    switch (id) {
      case "platform":
        return ShieldAlert;
      case "admin":
        return Sliders;
      case "reception":
        return UserPlus;
      case "doctor":
        return Stethoscope;
      case "patient":
        return HeartPulse;
      case "laboratory":
        return FlaskConical;
      case "radiology":
        return Scan;
      case "pharmacy":
        return Pill;
      case "billing":
        return Receipt;
      case "management":
        return TrendingUp;
      default:
        return Layers;
    }
  };

  const filteredPortals = useMemo(() => {
    return MASTER_MINDMAP_DATA.filter((portal) => {
      // Category filter
      if (categoryFilter === "governance" && !["platform", "admin"].includes(portal.id)) return false;
      if (categoryFilter === "clinical" && !["doctor", "patient", "reception"].includes(portal.id)) return false;
      if (categoryFilter === "diagnostics" && !["laboratory", "radiology", "pharmacy"].includes(portal.id)) return false;
      if (categoryFilter === "revenue" && !["billing", "management"].includes(portal.id)) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const matchParent =
        portal.label.toLowerCase().includes(query) ||
        portal.description.toLowerCase().includes(query) ||
        (portal.route && portal.route.toLowerCase().includes(query));
      const matchChildren = portal.children?.some(
        (child) =>
          child.label.toLowerCase().includes(query) ||
          child.description.toLowerCase().includes(query) ||
          (child.route && child.route.toLowerCase().includes(query)),
      );
      return matchParent || matchChildren;
    });
  }, [categoryFilter, searchQuery]);

  const toggleNodeExpansion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="relative min-h-[900px] w-full bg-[#030712] py-8 text-white">
      {/* Background Decorative Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Controls Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur-xl shadow-2xl">
          {/* Search Box */}
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search portals, features, routes, or Prisma models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Zoom & View Controls */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.7, prev - 0.1))}
              className="rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[42px] text-center text-xs font-bold text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(1.4, prev + 0.1))}
              className="rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Reset Zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Canvas & Inspector Layout */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Mind Map Canvas Area */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-[#060a16] p-6 lg:col-span-8 shadow-2xl">
            {/* Core Hub Badge */}
            <div className="mb-8 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 px-6 py-3 shadow-xl shadow-indigo-950/60 ring-1 ring-white/10">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/40">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-indigo-300">Central Architecture Core</div>
                  <div className="text-sm font-bold text-white">WonFlow Unified Hospital Engine</div>
                </div>
                <div className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                  Online
                </div>
              </div>
            </div>

            {/* Scalable Mind Map Node Grid */}
            <div
              className="grid gap-4 transition-transform duration-200 sm:grid-cols-2"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
            >
              {filteredPortals.map((portal) => {
                const Icon = getPortalIcon(portal.id);
                const isSelected = selectedNode.id === portal.id;
                const isExpanded = expandedNodes[portal.id] ?? true;
                const colorConfig = PORTAL_COLORS[portal.id] ?? {
                  bg: "bg-slate-900/40",
                  border: "border-slate-700/40",
                  glow: "shadow-slate-500/20",
                  text: "text-slate-400",
                  accent: "#94a3b8",
                };

                return (
                  <div
                    key={portal.id}
                    onClick={() => setSelectedNode(portal)}
                    className={`group relative cursor-pointer rounded-2xl border transition-all duration-200 ${colorConfig.bg} ${
                      isSelected
                        ? "border-indigo-400 ring-2 ring-indigo-400/40 shadow-xl shadow-indigo-900/50"
                        : `${colorConfig.border} hover:border-slate-600 hover:bg-slate-900/80`
                    } p-4 backdrop-blur-md`}
                  >
                    {/* Header with Icon, Title, and Collapse */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                          style={{ backgroundColor: portal.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                              {portal.label}
                            </h3>
                            {portal.route && (
                              <span className="rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                                {portal.route}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{portal.description}</p>
                        </div>
                      </div>

                      {portal.children && portal.children.length > 0 && (
                        <button
                          onClick={(e) => toggleNodeExpansion(portal.id, e)}
                          className="rounded-lg bg-slate-950/60 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                          title="Toggle sub-nodes"
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Expandable Sub-feature Nodes */}
                    {isExpanded && portal.children && portal.children.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
                        {portal.children.map((child) => {
                          const isChildSelected = selectedNode.id === child.id;
                          return (
                            <div
                              key={child.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(child);
                              }}
                              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                isChildSelected
                                  ? "bg-indigo-600/30 font-bold text-white ring-1 ring-indigo-500/50"
                                  : "bg-slate-950/50 text-slate-300 hover:bg-slate-800/60 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: child.color }} />
                                <span className="truncate">{child.label}</span>
                              </div>
                              {child.route && (
                                <span className="ml-2 shrink-0 font-mono text-[9px] text-slate-400">{child.route}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Detail Inspector Drawer */}
          <div className="rounded-3xl border border-slate-800/90 bg-[#060a16] p-6 lg:col-span-4 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Inspector Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                      {selectedNode.category} Node
                    </span>
                    {selectedNode.permission && (
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                        {selectedNode.permission}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-white">{selectedNode.label}</h2>
                  {selectedNode.route && (
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-cyan-400">
                      <span>Canonical:</span>
                      <span className="rounded bg-slate-950 px-2 py-0.5 text-white">{selectedNode.route}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose & Description */}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Purpose & Architectural Role</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{selectedNode.details.purpose}</p>
              </div>

              {/* Key Capabilities */}
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-400">Core Capabilities</div>
                <ul className="mt-2 space-y-1.5">
                  {selectedNode.details.keyCapabilities.map((cap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Backend Data Model & Security */}
              <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
                  <div>
                    <span className="font-bold text-slate-300">Prisma Models: </span>
                    <span className="font-mono text-[11px] text-purple-300">{selectedNode.details.backendModel}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-slate-800/60 pt-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-300">Security Guard: </span>
                    <span className="text-[11px] text-emerald-300">{selectedNode.details.securityGuard}</span>
                  </div>
                </div>
              </div>

              {/* Linked High-Res Screenshot Preview */}
              {selectedNode.screenshot && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                    <span>Captured Production Interface</span>
                    <button
                      onClick={() =>
                        onOpenScreenshotModal?.(selectedNode.label, selectedNode.screenshot!, selectedNode.description)
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      <span>Full View</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  <div
                    onClick={() =>
                      onOpenScreenshotModal?.(selectedNode.label, selectedNode.screenshot!, selectedNode.description)
                    }
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-800 bg-black/60 transition hover:border-indigo-500"
                  >
                    <img
                      src={selectedNode.screenshot}
                      alt={selectedNode.label}
                      className="h-44 w-full object-cover object-top transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded-lg bg-indigo-600/90 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                        Click to Inspect Screen
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Footer */}
            {selectedNode.route && (
              <div className="mt-6 border-t border-slate-800 pt-4">
                <a
                  href={selectedNode.route}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
                >
                  <span>Open Screen in WonFlow System</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
