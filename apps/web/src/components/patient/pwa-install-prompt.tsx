"use client";

import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(display-mode: standalone)").matches;
    }
    return false;
  });

  useEffect(() => {
    const handler = (e: Event) => {

      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (isInstalled || isDismissed) return null;

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  }

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 border border-indigo-500/30 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-lg flex-shrink-0">
            📱
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Install WonFlow App on Home Screen</span>
              <span className="px-1.5 py-0.2 bg-teal-500/20 text-teal-300 text-[10px] rounded font-medium">
                Offline Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Access your daily post-op recovery tasks, drain logs, and vitals with one tap.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setIsDismissed(true)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            Not Now
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition"
          >
            Add to Home Screen
          </button>
        </div>
      </div>

      {/* Bilingual Installation Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add to Phone Home Screen
                </h3>
                <p className="text-xs text-slate-500">
                  Follow these quick steps in your mobile browser
                </p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* English Section */}
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl">
              <h4 className="font-bold text-slate-900 dark:text-white">Android Chrome:</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Tap the <strong>three dots (⋮)</strong> at the top right of Chrome.</li>
                <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                <li>Confirm by tapping <strong>&quot;Add&quot;</strong>.</li>
              </ol>
            </div>

            {/* Urdu Section */}
            <div dir="rtl" className="space-y-2 text-xs text-slate-700 dark:text-slate-300 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/50 dark:border-teal-900/40 p-3.5 rounded-xl font-sans">
              <h4 className="font-bold text-teal-950 dark:text-teal-200">اینڈرائڈ پر انسٹال کرنے کا طریقہ:</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li>کروم براؤزر کے اوپر دائیں کونے میں <strong>تین نقطوں (⋮)</strong> پر کلک کریں۔</li>
                <li><strong>&quot;Add to Home screen&quot;</strong> یا <strong>&quot;Install app&quot;</strong> منتخب کریں۔</li>
                <li><strong>&quot;Add&quot;</strong> پر کلک کر کے تصدیق کریں۔ ایپ آپ کی ہوم اسکرین پر شامل ہو جائے گی۔</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg"
              >
                Got It / سمجھ آ گئی
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
