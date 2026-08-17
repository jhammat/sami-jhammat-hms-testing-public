"use client";

import React, { useState, useEffect } from "react";
import { CROSS_PORTAL_FLOWS, CrossPortalFlow, CrossPortalFlowStep } from "./showcase-data";
import {
  Workflow,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Maximize2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

interface CrossPortalFlowsProps {
  onOpenScreenshotModal?: (title: string, src: string, details?: string) => void;
}

export function CrossPortalFlows({ onOpenScreenshotModal }: CrossPortalFlowsProps) {
  const [selectedFlowId, setSelectedFlowId] = useState<string>("outpatient-e2e");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const activeFlow: CrossPortalFlow =
    CROSS_PORTAL_FLOWS.find((f) => f.id === selectedFlowId) ?? CROSS_PORTAL_FLOWS[0]!;

  const activeStep: CrossPortalFlowStep = activeFlow.steps[activeStepIndex] ?? activeFlow.steps[0]!;

  // Auto-play stepper
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev >= activeFlow.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3200);
    }
    return () => clearInterval(timer);
  }, [isPlaying, activeFlow.steps.length]);

  const handleFlowSelect = (id: string) => {
    setSelectedFlowId(id);
    setActiveStepIndex(0);
    setIsPlaying(false);
  };

  return (
    <section className="relative overflow-hidden bg-[#040612] py-12 text-white border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              <span>Multi-Portal Ecosystem Simulation</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
              Major Cross-Portal Flows:{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Connected Hospital Intelligence
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-400">
              Observe real-time data packets traversing across administrative, clinical, diagnostic, pharmaceutical, and financial boundaries with zero data silos.
            </p>
          </div>

          {/* Flow Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {CROSS_PORTAL_FLOWS.map((flow) => {
              const isCurrent = flow.id === selectedFlowId;
              return (
                <button
                  key={flow.id}
                  onClick={() => handleFlowSelect(flow.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {flow.title.split(":")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Playback Controls & Progress Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:brightness-110"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? "Pause Flow" : "Play Interactive Flow"}</span>
            </button>

            <button
              onClick={() => {
                setActiveStepIndex(0);
                setIsPlaying(false);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-400">
            Current Position: Step {activeStepIndex + 1} of {activeFlow.steps.length} (
            {Math.round(((activeStepIndex + 1) / activeFlow.steps.length) * 100)}% Complete)
          </div>
        </div>

        {/* Horizontal Visual Pipeline */}
        <div className="mt-8 overflow-x-auto pb-4">
          <div className="flex min-w-[760px] items-center justify-between gap-3">
            {activeFlow.steps.map((step, idx) => {
              const isSelected = idx === activeStepIndex;
              const isPassed = idx < activeStepIndex;
              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => {
                      setActiveStepIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`group relative flex-1 cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-indigo-400 bg-indigo-950/50 shadow-xl shadow-indigo-950/60 ring-2 ring-indigo-400/40"
                        : isPassed
                        ? "border-emerald-500/40 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-400">Node 0{idx + 1}</span>
                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : isSelected ? (
                        <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="mt-2 text-xs font-black text-white group-hover:text-cyan-300">
                      {step.portalName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 truncate">{step.actor}</div>
                  </div>

                  {idx < activeFlow.steps.length - 1 && (
                    <div className="flex shrink-0 items-center justify-center text-slate-400">
                      <ArrowRight className={`h-4 w-4 ${isPassed ? "text-emerald-400" : "text-slate-500"}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Step Detail & Live Data Packet Inspector */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Data Packet & Workflow Narrative */}
          <div className="space-y-6 lg:col-span-6">
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-300">
                  Node {activeStepIndex + 1}: {activeStep.portalName}
                </span>
                <span className="font-mono text-xs text-slate-400">{activeStep.route}</span>
              </div>
              <h3 className="mt-3 text-xl font-black text-white">{activeStep.action}</h3>
              <div className="mt-2 text-xs text-slate-400">Executing Actor: <span className="font-bold text-slate-200">{activeStep.actor}</span></div>
            </div>

            {/* Live Data Packet Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-5 shadow-lg shadow-cyan-950/30">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400">
                <Sparkles className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Transmitted State Packet</span>
              </div>
              <div className="mt-3 rounded-xl border border-slate-800 bg-black/70 p-3 font-mono text-xs font-bold text-cyan-200">
                {activeStep.dataPacket}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Persisted in PostgreSQL, synced via WebSocket/REST, and bound to the active organization tenant isolation policy.
              </p>
            </div>
          </div>

          {/* Right Column: High-Res Screenshot for Current Flow Node */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#060a16] p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-xs font-bold text-slate-300">
                <span>{activeStep.portalName} Visual Snapshot</span>
                <button
                  onClick={() =>
                    onOpenScreenshotModal?.(activeStep.portalName, activeStep.screenshot, activeStep.action)
                  }
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Zoom Full View</span>
                </button>
              </div>

              <div
                onClick={() =>
                  onOpenScreenshotModal?.(activeStep.portalName, activeStep.screenshot, activeStep.action)
                }
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-black/60"
              >
                <img
                  src={activeStep.screenshot}
                  alt={activeStep.portalName}
                  className="h-[360px] w-full object-cover object-top transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-xl">
                    Click to Open Full View
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{activeStep.route}</span>
                <span>Active Portal: {activeStep.portalName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
