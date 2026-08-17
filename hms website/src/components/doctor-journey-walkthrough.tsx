"use client";

import React, { useState } from "react";
import { DOCTOR_JOURNEY_STEPS, JourneyStep } from "./showcase-data";
import {
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  UserCheck,
  Cpu,
  CheckCircle2,
  Maximize2,
  Sparkles,
} from "lucide-react";

interface DoctorJourneyWalkthroughProps {
  onOpenScreenshotModal?: (title: string, src: string, details?: string) => void;
}

export function DoctorJourneyWalkthrough({ onOpenScreenshotModal }: DoctorJourneyWalkthroughProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep: JourneyStep = DOCTOR_JOURNEY_STEPS[currentStepIndex]!;

  return (
    <section className="relative overflow-hidden bg-[#050818] py-12 text-white border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-400" />
              <span>Clinician Workflow & EMR Operations</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
              The Doctor Journey:{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                Clinical Excellence & Closed-Loop Care
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-400">
              Walk through a doctor&apos;s daily shift: configuring clinic sittings, calling queue tokens, documenting structured SOAP notes with ICD-10 codes, ordering labs/radiology, e-prescribing, and resident supervision.
            </p>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-bold text-slate-400">
              Step {currentStepIndex + 1} of {DOCTOR_JOURNEY_STEPS.length}
            </span>
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.min(DOCTOR_JOURNEY_STEPS.length - 1, prev + 1))}
              disabled={currentStepIndex === DOCTOR_JOURNEY_STEPS.length - 1}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40 shadow-lg shadow-emerald-600/30"
            >
              <span>Next Step</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Step Progression Bar */}
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {DOCTOR_JOURNEY_STEPS.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={step.stepNumber}
                onClick={() => setCurrentStepIndex(idx)}
                className={`group relative rounded-xl border p-2.5 text-left transition-all ${
                  isCurrent
                    ? "border-emerald-400 bg-emerald-950/50 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50"
                    : isCompleted
                    ? "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                    : "border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-400">0{step.stepNumber}</span>
                  {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>
                <div className="mt-1 line-clamp-1 text-xs font-bold text-white group-hover:text-emerald-300">
                  {step.title.split(" ")[0]} {step.title.split(" ")[1]}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{step.badge}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Deep-Dive Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Context & Execution Details */}
          <div className="space-y-6 lg:col-span-6">
            {/* Step Header Card */}
            <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">
                  Step {currentStep.stepNumber}: {currentStep.badge}
                </span>
                <span className="font-mono text-xs text-slate-400">{currentStep.route}</span>
              </div>
              <h3 className="mt-3 text-2xl font-black text-white">{currentStep.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{currentStep.scenario}</p>
            </div>

            {/* Clinician Action vs System Action */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
                  <UserCheck className="h-4 w-4" />
                  <span>Clinician Action</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{currentStep.userAction}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-xs font-black text-teal-400">
                  <Cpu className="h-4 w-4" />
                  <span>EMR Engine Mutation</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{currentStep.systemAction}</p>
              </div>
            </div>

            {/* Security Isolation & Key Outputs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Clinical Governance & Security Guard</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">{currentStep.securityIsolation}</p>
              </div>

              <div className="border-t border-slate-800/80 pt-3">
                <div className="text-xs font-bold text-slate-400">Clinical State Transitions</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentStep.keyOutputs.map((out, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-200"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>{out}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-Res Instant Screenshot Viewer */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#060a16] p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 text-xs font-bold text-slate-300">
                <span>Clinician Interface Capture for Step {currentStep.stepNumber}</span>
                <button
                  onClick={() =>
                    onOpenScreenshotModal?.(currentStep.title, currentStep.screenshot, currentStep.scenario)
                  }
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Zoom Full Screen</span>
                </button>
              </div>

              <div
                onClick={() =>
                  onOpenScreenshotModal?.(currentStep.title, currentStep.screenshot, currentStep.scenario)
                }
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-black/60"
              >
                <img
                  src={currentStep.screenshot}
                  alt={currentStep.title}
                  className="h-[460px] w-full object-cover object-top transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-xl">
                    Click to Open Full High-Res View
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{currentStep.route}</span>
                <span>Role: {currentStep.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
