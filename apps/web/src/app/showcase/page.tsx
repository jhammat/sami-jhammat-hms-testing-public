"use client";

import React, { useState, useEffect } from "react";
import { ShowcaseHero } from "@/components/showcase/showcase-hero";
import { InteractiveMindmap } from "@/components/showcase/interactive-mindmap";
import { PatientJourneyWalkthrough } from "@/components/showcase/patient-journey-walkthrough";
import { DoctorJourneyWalkthrough } from "@/components/showcase/doctor-journey-walkthrough";
import { CrossPortalFlows } from "@/components/showcase/cross-portal-flows";
import { ScreenDemoGallery } from "@/components/showcase/screen-demo-gallery";
import {
  X,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Shield,
  CheckCircle,
  Copy,
} from "lucide-react";

interface ModalState {
  isOpen: boolean;
  title: string;
  src: string;
  details?: string;
}

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState<string>("mindmap");
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: "",
    src: "",
    details: "",
  });
  const [modalZoom, setModalZoom] = useState<number>(1);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const openScreenshotModal = (title: string, src: string, details?: string) => {
    setModal({
      isOpen: true,
      title,
      src,
      details,
    });
    setModalZoom(1);
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    setModalZoom(1);
  };

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const portalCredentials = [
    { role: "Platform Admin", email: "platform@wonflow.local", route: "/platform", color: "text-indigo-400" },
    { role: "Hospital Admin", email: "admin@wonflow.local", route: "/admin", color: "text-blue-400" },
    { role: "Reception", email: "reception@wonflow.local", route: "/operations/reception", color: "text-amber-400" },
    { role: "Doctor", email: "doctor@wonflow.local", route: "/doctor", color: "text-emerald-400" },
    { role: "Patient", email: "patient@wonflow.local", route: "/patient", color: "text-cyan-400" },
    { role: "Laboratory", email: "laboratory@wonflow.local", route: "/operations/laboratory", color: "text-purple-400" },
    { role: "Radiology", email: "radiology@wonflow.local", route: "/operations/radiology", color: "text-teal-400" },
    { role: "Pharmacy", email: "pharmacy@wonflow.local", route: "/operations/pharmacy", color: "text-rose-400" },
    { role: "Billing", email: "billing@wonflow.local", route: "/operations/billing", color: "text-orange-400" },
    { role: "Management", email: "management@wonflow.local", route: "/management", color: "text-violet-400" },
  ];

  return (
    <div className="min-h-screen bg-[#02040a] text-slate-100 selection:bg-indigo-500 selection:text-white font-sans">
      {/* Hero Header */}
      <ShowcaseHero activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Sections */}
      <main className="space-y-0">
        {activeTab === "mindmap" && (
          <div className="animate-in fade-in duration-300">
            <InteractiveMindmap onOpenScreenshotModal={openScreenshotModal} />
          </div>
        )}

        {activeTab === "patient-journey" && (
          <div className="animate-in fade-in duration-300">
            <PatientJourneyWalkthrough onOpenScreenshotModal={openScreenshotModal} />
          </div>
        )}

        {activeTab === "doctor-journey" && (
          <div className="animate-in fade-in duration-300">
            <DoctorJourneyWalkthrough onOpenScreenshotModal={openScreenshotModal} />
          </div>
        )}

        {activeTab === "cross-flows" && (
          <div className="animate-in fade-in duration-300">
            <CrossPortalFlows onOpenScreenshotModal={openScreenshotModal} />
          </div>
        )}

        {activeTab === "screen-gallery" && (
          <div className="animate-in fade-in duration-300">
            <ScreenDemoGallery onOpenScreenshotModal={openScreenshotModal} />
          </div>
        )}
      </main>

      {/* Development Credentials & Quick Access Footer */}
      <footer className="border-t border-slate-800/80 bg-[#040612] py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Live System Credentials</span>
              </div>
              <h3 className="mt-1 text-xl font-black text-white">Direct Portal Quick-Logins</h3>
              <p className="mt-1 text-xs text-slate-400">
                All seeded accounts share the master development password:{" "}
                <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                  WonFlowDemo2026!
                </span>
              </p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110"
            >
              <span>Go to System Login</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {portalCredentials.map((cred, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5 backdrop-blur-md"
              >
                <div className={`text-xs font-black ${cred.color}`}>{cred.role}</div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] text-slate-300 truncate">{cred.email}</span>
                  <button
                    onClick={() => copyToClipboard(cred.email)}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy Email"
                  >
                    {copiedEmail === cred.email ? (
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">{cred.route}</span>
                  <a
                    href={cred.route}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
            <div>WonFlow Multi-Organization Hospital Management System &copy; 2026</div>
            <div className="flex items-center gap-4">
              <span>Next.js 16</span>
              <span>•</span>
              <span>React 19</span>
              <span>•</span>
              <span>Prisma ORM</span>
              <span>•</span>
              <span>Tailwind CSS</span>
            </div>
          </div>
        </div>
      </footer>

      {/* High-Resolution Fullscreen Lightbox Modal */}
      {modal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xl p-4 sm:p-6"
          onClick={closeModal}
        >
          {/* Modal Header */}
          <div
            className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-3.5 backdrop-blur-md mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-indigo-400">High-Resolution Screen Inspection</div>
              <h2 className="text-lg font-black text-white">{modal.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalZoom((prev) => Math.max(0.6, prev - 0.15))}
                className="rounded-lg bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-[40px] text-center font-mono text-xs font-bold text-slate-300">
                {Math.round(modalZoom * 100)}%
              </span>
              <button
                onClick={() => setModalZoom((prev) => Math.min(2.5, prev + 0.15))}
                className="rounded-lg bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setModalZoom(1)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                100%
              </button>
              <button
                onClick={closeModal}
                className="ml-2 rounded-lg bg-rose-950/60 p-2 text-rose-300 hover:bg-rose-900 hover:text-white"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Image Container */}
          <div
            className="relative flex-1 overflow-auto rounded-2xl border border-slate-800 bg-[#030610] p-4 flex items-start justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modal.src}
              alt={modal.title}
              className="max-w-none transition-transform duration-150 rounded-lg shadow-2xl"
              style={{
                transform: `scale(${modalZoom})`,
                transformOrigin: "top center",
                width: "100%",
                maxWidth: "1400px",
              }}
            />
          </div>

          {/* Modal Footer Description */}
          {modal.details && (
            <div
              className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs text-slate-300"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-bold text-slate-400">Context: </span>
              <span>{modal.details}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
