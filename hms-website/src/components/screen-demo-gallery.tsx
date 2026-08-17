"use client";

import React, { useState, useMemo } from "react";
import { SCREEN_DEMO_CATALOG } from "./showcase-data";
import {
  Search,
  Layers,
  Maximize2,
  ExternalLink,
  CheckCircle,
  X,
  Lock,
} from "lucide-react";

interface ScreenDemoGalleryProps {
  onOpenScreenshotModal?: (title: string, src: string, details?: string) => void;
}

export function ScreenDemoGallery({ onOpenScreenshotModal }: ScreenDemoGalleryProps) {
  const [selectedPortal, setSelectedPortal] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const portals = [
    { id: "all", label: "All Portals (50+)" },
    { id: "platform", label: "Platform Admin" },
    { id: "admin", label: "Hospital Admin" },
    { id: "reception", label: "Reception" },
    { id: "doctor", label: "Doctor" },
    { id: "patient", label: "Patient" },
    { id: "laboratory", label: "Laboratory" },
    { id: "radiology", label: "Radiology" },
    { id: "pharmacy", label: "Pharmacy" },
    { id: "billing", label: "Billing" },
    { id: "management", label: "Management" },
  ];

  const filteredScreens = useMemo(() => {
    return SCREEN_DEMO_CATALOG.filter((item) => {
      if (selectedPortal !== "all" && item.portalCategory !== selectedPortal) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.route.toLowerCase().includes(query) ||
        item.roleRequired.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [selectedPortal, searchQuery]);

  return (
    <section className="relative min-h-[900px] w-full bg-[#030611] py-12 text-white border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-300">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>Full Screen Interactive Directory</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
              Universal Screen Demo Gallery:{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Every Portal & Route
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-400">
              Browse high-resolution captures of every single interface across all 10 workspaces. Search by capability, route, or required security role.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-400">
            Showing <span className="text-white">{filteredScreens.length}</span> of {SCREEN_DEMO_CATALOG.length} Captured Screens
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur-xl">
          {/* Search Box */}
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by screen name, route (/doctor/results), tag, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

          {/* Portal Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {portals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPortal(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPortal === p.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screen Cards Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScreens.map((screen) => {
            return (
              <div
                key={screen.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-[#060a16] transition-all duration-300 hover:border-slate-600 hover:shadow-2xl hover:shadow-purple-950/30"
              >
                <div>
                  {/* Screenshot Thumbnail with Click Overlay */}
                  <div
                    onClick={() =>
                      onOpenScreenshotModal?.(screen.title, screen.screenshot, `${screen.description}\nRoute: ${screen.route}\nRole: ${screen.roleRequired}`)
                    }
                    className="relative h-52 w-full cursor-pointer overflow-hidden bg-black/60"
                  >
                    <img
                      src={screen.screenshot}
                      alt={screen.title}
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white shadow-xl">
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Inspect Full Screen</span>
                      </span>
                    </div>

                    {/* Portal Tag Badge */}
                    <div className="absolute left-3 top-3">
                      <span className="rounded-lg bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md border border-white/10">
                        {screen.portal}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-cyan-400 truncate">{screen.route}</span>
                      <span className="shrink-0 flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        <Lock className="h-2.5 w-2.5 text-amber-400" />
                        <span>{screen.roleRequired.split(" ")[0]}</span>
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-black text-white group-hover:text-purple-300 transition-colors">
                      {screen.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {screen.description}
                    </p>

                    {/* Feature Highlights */}
                    <div className="mt-4 space-y-1">
                      {screen.features.slice(0, 3).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                          <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {screen.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="border-t border-slate-800/80 p-4 bg-slate-950/40 flex items-center justify-between">
                  <button
                    onClick={() =>
                      onOpenScreenshotModal?.(screen.title, screen.screenshot, screen.description)
                    }
                    className="text-xs font-bold text-purple-400 hover:text-purple-300"
                  >
                    View High-Res Lightbox
                  </button>
                  <a
                    href={screen.route}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <span>Launch</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
