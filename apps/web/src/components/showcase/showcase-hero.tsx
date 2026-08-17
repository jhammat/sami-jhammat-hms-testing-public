"use client";

import React from "react";
import {
  Activity,
  Layers,
  ShieldCheck,
  Zap,
  Network,
  Compass,
  Stethoscope,
  HeartPulse,
  Workflow,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { PORTAL_METRICS } from "./showcase-data";

interface ShowcaseHeroProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ShowcaseHero({ activeTab, onTabChange }: ShowcaseHeroProps) {
  const tabs = [
    { id: "mindmap", label: "Master Mind Map", icon: Network, badge: "10 Portals" },
    { id: "patient-journey", label: "Patient Journey", icon: HeartPulse, badge: "8 Scenarios" },
    { id: "doctor-journey", label: "Doctor Clinical Journey", icon: Stethoscope, badge: "8 Scenarios" },
    { id: "cross-flows", label: "Major Cross-Portal Flows", icon: Workflow, badge: "Integrated" },
    { id: "screen-gallery", label: "All Screens Demo", icon: Layers, badge: "50+ Screens" },
  ];

  return (
    <header className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-[#060814] to-[#04060f] pb-8 pt-12 text-white">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-600/10 blur-[140px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Header Badge */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md shadow-lg shadow-indigo-950/50">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>WonFlow Architecture & Interactive Visual System</span>
            <span className="rounded-full bg-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-200">Phase 1 Release</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <span>Live Application Login</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Hero Title & Pitch */}
        <div className="mt-8 max-w-4xl">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Complete Architectural Breakdown &{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Interactive System Mind Map
            </span>
          </h1>
          <p className="mt-4 text-base font-normal leading-relaxed text-slate-300 sm:text-lg">
            Explore every dimension of the WonFlow multi-organization hospital management platform.
            Interact with the comprehensive 10-portal mind map, trace detailed end-to-end patient and clinician journeys with instant screen captures, simulate cross-departmental data flows, and inspect full-resolution demos of every screen.
          </p>
        </div>

        {/* Key System Metrics Banner */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <Layers className="h-4 w-4" />
              <span>Portals</span>
            </div>
            <div className="mt-1.5 text-2xl font-black text-white">{PORTAL_METRICS.totalPortals}</div>
            <div className="text-[11px] text-slate-400">Isolated Workspaces</div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Compass className="h-4 w-4" />
              <span>Screens</span>
            </div>
            <div className="mt-1.5 text-2xl font-black text-white">{PORTAL_METRICS.totalScreens}+</div>
            <div className="text-[11px] text-slate-400">Captured in Full Res</div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Activity className="h-4 w-4" />
              <span>Modules</span>
            </div>
            <div className="mt-1.5 text-2xl font-black text-white">{PORTAL_METRICS.coreModules}</div>
            <div className="text-[11px] text-slate-400">Clinical & Operational</div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Zap className="h-4 w-4" />
              <span>Verification</span>
            </div>
            <div className="mt-1.5 text-2xl font-black text-white">{PORTAL_METRICS.testPassRate}</div>
            <div className="text-[11px] text-slate-400">Automated E2E Suite</div>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Tenancy</span>
            </div>
            <div className="mt-1.5 text-xl font-black text-white">Multi-Org</div>
            <div className="text-[11px] text-slate-400">PostgreSQL Isolated</div>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-slate-900/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
              <Workflow className="h-4 w-4" />
              <span>Ecosystem</span>
            </div>
            <div className="mt-1.5 text-xl font-black text-white">Closed Loop</div>
            <div className="text-[11px] text-slate-400">CPOE to Settlement</div>
          </div>
        </div>

        {/* Interactive Navigation Tabs */}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20"
                    : "bg-slate-900/70 text-slate-400 hover:bg-slate-800/90 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? "bg-black/25 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
