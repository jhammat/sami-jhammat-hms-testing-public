"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  Layers,
  Monitor,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

const emptySubscribe = () => () => {};

/**
 * Turn WonFlow into an installed app.
 *
 * Chrome and Edge fire `beforeinstallprompt` when the manifest, the icons and
 * the service worker all check out, and hand over a prompt that can only be
 * opened from a real user gesture. That event is caught and held here so the
 * switch has something to open when it is pressed.
 *
 * Safari and Firefox never fire it, and Chrome stops firing it once the app is
 * installed. The switch is not hidden in that case - a control that appears
 * for some colleagues and not others is worse than one that explains itself -
 * so it falls back to the per-browser steps instead.
 *
 * There is nothing to switch *off*: only the operating system can uninstall an
 * installed app, and a toggle that silently failed to do what it said would be
 * a lie. Once installed it reads as done.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    installedThisSession ||
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS predates the display-mode query and puts it here instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/*
 * Whether this is an installed window is something the browser knows and the
 * server cannot, so it is read through an external store rather than copied
 * into state by an effect. A tab that was open when the install happened keeps
 * its browser chrome - `appinstalled` fires but the display mode does not
 * change - so that one is latched here, otherwise the switch would flick back
 * to "not installed" on the next render.
 */

let installedThisSession = false;

function subscribeToInstallState(onChange: () => void): () => void {
  const standalone = window.matchMedia("(display-mode: standalone)");

  function onInstalled() {
    installedThisSession = true;
    onChange();
  }

  standalone.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onInstalled);

  return () => {
    standalone.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** The server renders the browser-tab state, which is what it is until proven otherwise. */
function installedOnServer(): boolean {
  return false;
}

export type Platform = "desktop" | "ios" | "android";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";

  const agent = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(agent)) return "ios";
  if (/Android/i.test(agent)) return "android";

  return "desktop";
}

export interface StepGuide {
  readonly step: number;
  readonly title: string;
  readonly shortLabel: string;
  readonly badge: string;
  readonly description: string;
  readonly image: string;
  readonly hint: string;
  readonly urdu?: string;
}

export interface PlatformGuide {
  readonly id: Platform;
  readonly label: string;
  readonly deviceSub: string;
  readonly browser: string;
  readonly iconType: "desktop" | "ios" | "android";
  readonly steps: readonly StepGuide[];
  readonly urduHeading?: string;
  readonly urduNote?: string;
}

export const PLATFORM_GUIDES: Record<Platform, PlatformGuide> = {
  desktop: {
    id: "desktop",
    label: "Computer",
    deviceSub: "Windows / Mac / Linux",
    browser: "Chrome or Microsoft Edge on a computer",
    iconType: "desktop",
    steps: [
      {
        step: 1,
        title: "Locate the Install Icon in the Address Bar",
        shortLabel: "1. Address Bar",
        badge: "Omnibox (Fastest)",
        description:
          'Look at the right-hand end of your browser address bar. Click the computer/monitor icon with a down arrow or the plus (+) icon labeled "Install WonFlow".',
        image: "/guide/pwa/desktop-step1.png",
        hint: '💡 Pro tip: In Google Chrome and Microsoft Edge, the "Install WonFlow" icon illuminates automatically on this page.',
      },
      {
        step: 2,
        title: 'Alternative: Open Browser Menu (⋮) & Select "Install"',
        shortLabel: "2. Browser Menu",
        badge: "Menu Alternative",
        description:
          'If you don\'t see the address bar icon, click the three vertical dots (⋮) in the top-right corner of your browser. Then click "Install WonFlow" (or "Cast, save & share" > "Install page as app").',
        image: "/guide/pwa/desktop-step2.png",
        hint: '💡 Keyboard shortcut: You can also press Alt+F on Windows to instantly reveal browser install options.',
      },
      {
        step: 3,
        title: 'Confirm Installation & Launch Standalone App',
        shortLabel: "3. Confirm Install",
        badge: "Standalone App",
        description:
          'A confirmation dialog will appear asking "Install app? WonFlow". Click the blue "Install" button. WonFlow will instantly open in its own clean, distraction-free window.',
        image: "/guide/pwa/desktop-step3.png",
        hint: "🎉 Done! You can now pin WonFlow directly to your Windows Taskbar or macOS Dock for instant one-click hospital access.",
      },
    ],
  },
  ios: {
    id: "ios",
    label: "iPhone / iPad",
    deviceSub: "Apple iOS & iPadOS",
    browser: "Safari on iPhone or iPad",
    iconType: "ios",
    steps: [
      {
        step: 1,
        title: "Tap the Share Button in Safari",
        shortLabel: "1. Share Button",
        badge: "Safari Toolbar",
        description:
          "Open WonFlow in Apple Safari. Look at the toolbar at the bottom of your iPhone screen (or top-right on iPad) and tap the Share button (the square with an arrow pointing up).",
        image: "/guide/pwa/ios-step1.png",
        hint: "💡 Apple iOS requires using Safari to install Progressive Web Apps directly to your Home Screen.",
        urdu: "سفاری (Safari) براؤزر کے نیچے موجود شیئر (Share) بٹن پر ٹیپ کریں۔",
      },
      {
        step: 2,
        title: 'Scroll Down & Choose "Add to Home Screen"',
        shortLabel: "2. Add to Home Screen",
        badge: "Share Sheet",
        description:
          'In the share menu sheet that slides up, scroll down past the quick contacts and tap "Add to Home Screen" (the icon with a plus sign inside a square).',
        image: "/guide/pwa/ios-step2.png",
        hint: '💡 Can\'t see it? Scroll down further in the actions list; it is typically located directly below "Add Bookmark".',
        urdu: 'نیچے اسکرول کریں اور "Add to Home Screen" منتخب کریں۔',
      },
      {
        step: 3,
        title: 'Tap "Add" in Top-Right to Confirm',
        shortLabel: "3. Confirm Add",
        badge: "Home Screen App",
        description:
          'In the top-right corner of the confirmation screen, tap "Add". The WonFlow app icon will be added to your home screen. Tap it anytime to launch full-screen!',
        image: "/guide/pwa/ios-step3.png",
        hint: "🎉 Launches without Safari URL bars or tabs, giving you the fastest possible mobile clinical experience.",
        urdu: 'اوپر دائیں کونے میں "Add" پر ٹیپ کریں۔ ایپ آپ کی ہوم اسکرین پر آ جائے گی۔',
      },
    ],
    urduHeading: "آئی فون یا آئی پیڈ پر انسٹال کرنے کا طریقہ",
    urduNote: "سفاری براؤزر میں شیئر کے بٹن سے ایپ ہوم اسکرین پر شامل کریں اور بغیر براؤزر بارز کے چلائیں۔",
  },
  android: {
    id: "android",
    label: "Android",
    deviceSub: "Samsung / Xiaomi / Pixel",
    browser: "Chrome or Samsung Internet on Android",
    iconType: "android",
    steps: [
      {
        step: 1,
        title: "Tap the Three Dots Menu (⋮) in Chrome",
        shortLabel: "1. Three Dots (⋮)",
        badge: "Chrome Header",
        description:
          "Open WonFlow in Google Chrome on your Android device. Tap the three vertical dots (⋮) in the top-right corner of the browser bar.",
        image: "/guide/pwa/android-step1.png",
        hint: "💡 On Samsung Internet, look for the hamburger menu (☰) at the bottom-right corner.",
        urdu: "کروم کے اوپر دائیں کونے میں تین نقطوں (⋮) پر ٹیپ کریں۔",
      },
      {
        step: 2,
        title: 'Select "Install app" or "Add to Home screen"',
        shortLabel: "2. Install App",
        badge: "Chrome Menu",
        description:
          'In the dropdown menu that appears, tap "Install app" (or "Add to Home screen" on some Android versions).',
        image: "/guide/pwa/android-step2.png",
        hint: "💡 Tip: WonFlow installs directly without requiring a Google Play Store account or download delay.",
        urdu: 'مینو میں سے "Install app" یا "Add to Home screen" منتخب کریں۔',
      },
      {
        step: 3,
        title: 'Tap "Install" on the System Prompt',
        shortLabel: "3. Confirm Install",
        badge: "Native Launch",
        description:
          'When the system prompt appears asking to install WonFlow, tap "Install". The WonFlow icon will be added to your app drawer and home screen.',
        image: "/guide/pwa/android-step3.png",
        hint: "🎉 WonFlow is now installed! You can launch it directly as a standalone app with offline resilience.",
        urdu: '"Install" پر کلک کر کے تصدیق کریں۔ ایپ آپ کی ہوم اسکرین پر آ جائے گی۔',
      },
    ],
    urduHeading: "اینڈرائڈ پر انسٹال کرنے کا طریقہ",
    urduNote: "کروم براؤزر کے مینو سے بغیر پلے اسٹور کے فوری انسٹال کریں اور ہوم اسکرین سے چلائیں۔",
  },
};

export function InstallAppToggle({ compact = false }: { compact?: boolean }) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const installedFromStore = useSyncExternalStore(
    subscribeToInstallState,
    detectStandalone,
    installedOnServer,
  );

  const installed = isMounted && installedFromStore;

  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Read when the steps are opened, not during render - the user agent does
  // not exist on the server and guessing at it desynchronises hydration.
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slides" | "grid">("slides");
  const [showUrdu, setShowUrdu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  useEffect(() => {
    function capture(event: Event) {
      // Held rather than shown. Chrome's own install banner is not something a
      // clinician should meet in the middle of a ward round.
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  const openGuide = useCallback((selectedPlatform?: Platform) => {
    setPlatform(selectedPlatform ?? detectPlatform());
    setActiveStepIndex(0);
    setDownloadSuccess(null);
    setShowSteps(true);
  }, []);

  const downloadWindowsShortcut = useCallback(() => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3007";
      const content = `[InternetShortcut]\r\nURL=${origin}/\r\nIconIndex=0\r\nIconFile=${origin}/brand/wonflow-icon-192.png\r\n`;
      const blob = new Blob([content], { type: "application/internet-shortcut" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "WonFlow Hospital Platform.url";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess("Desktop shortcut downloaded! Move it to your desktop for 1-click access.");
    } catch {
      // fallback
    }
  }, []);

  const downloadWindowsLauncher = useCallback(() => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3007";
      const cmdContent = `@echo off\r\n:: WonFlow Standalone Desktop Launcher\r\necho Launching WonFlow Hospital Platform in standalone mode...\r\nstart msedge.exe --app="${origin}/" 2>nul || start chrome.exe --app="${origin}/" 2>nul || start ${origin}/\r\nexit\r\n`;
      const blob = new Blob([cmdContent], { type: "application/x-bat" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Launch-WonFlow-App.cmd";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess("Standalone desktop launcher downloaded! Double-click to launch WonFlow.");
    } catch {
      // fallback
    }
  }, []);

  const triggerAutomatedInstall = useCallback(async () => {
    if (prompt) {
      setBusy(true);
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          setDownloadSuccess("Installation accepted! WonFlow is being added to your device.");
          setPrompt(null);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    // If browser prompt is not ready, automate by downloading launcher and shortcut
    downloadWindowsLauncher();
    downloadWindowsShortcut();
  }, [prompt, downloadWindowsLauncher, downloadWindowsShortcut]);

  const install = useCallback(async () => {
    if (!prompt) {
      openGuide();
      return;
    }

    setBusy(true);

    try {
      await prompt.prompt();
      await prompt.userChoice;

      // `appinstalled` is what settles whether it worked. The event itself is
      // single-use whichever way the answer went.
      setPrompt(null);
    } finally {
      setBusy(false);
    }
  }, [prompt, openGuide]);

  const guide = PLATFORM_GUIDES[platform];
  const activeStep = guide.steps[activeStepIndex] ?? guide.steps[0]!;

  return (
    <>
      <div
        suppressHydrationWarning
        className={[
          "wfg-well relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200",
          compact ? "justify-center" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => openGuide()}
          title={
            installed
              ? "WonFlow is installed. Click to view installation guide for other devices."
              : "Click to open step-by-step installation guide with images"
          }
          className={[
            "grid size-8 shrink-0 place-items-center rounded-xl transition-transform hover:scale-105 active:scale-95",
            installed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-300 hover:bg-blue-500/25",
          ].join(" ")}
        >
          {installed ? <Check size={15} /> : <Smartphone size={15} />}
        </button>

        {!compact ? (
          <>
            <button
              type="button"
              onClick={() => openGuide()}
              title="Click to open step-by-step visual installation guide"
              className="min-w-0 flex-1 text-left group cursor-pointer"
            >
              <span className="flex items-center gap-1.5 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <span>{installed ? "Installed as an app" : "Install as an app"}</span>
                <HelpCircle
                  size={12}
                  className="text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-500 shrink-0 transition-opacity"
                />
              </span>
              <span className="block text-[10px] leading-tight text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                {installed ? "Running standalone · View guide" : "Step-by-step visual guide"}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              suppressHydrationWarning
              aria-checked={installed}
              aria-label={
                installed ? "WonFlow is installed as an app" : "Install WonFlow as an app"
              }
              disabled={installed || busy}
              onClick={() => void install()}
              className={[
                "relative h-[22px] w-[38px] shrink-0 rounded-full transition-all duration-200",
                "disabled:cursor-default",
                installed
                  ? "bg-emerald-500"
                  : "bg-slate-300 hover:bg-blue-500 dark:bg-slate-600 dark:hover:bg-blue-500 shadow-inner",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-all duration-200",
                  installed ? "left-[19px]" : "left-[3px]",
                ].join(" ")}
              />
            </button>
          </>
        ) : (
          <button
            type="button"
            suppressHydrationWarning
            aria-label={
              installed ? "WonFlow is installed as an app" : "Install WonFlow as an app"
            }
            title={installed ? "Installed as an app · View guide" : "Install as an app · View guide"}
            onClick={() => openGuide()}
            className="absolute inset-0 rounded-2xl"
          />
        )}
      </div>

      {showSteps ? (
        <div
          className="fixed inset-0 z-100 grid place-items-center bg-slate-950/65 p-3 sm:p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wf-install-steps-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSteps(false);
          }}
        >
          <div className="wfg-panel w-full max-w-2xl max-h-[92vh] flex flex-col p-5 sm:p-6 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- brand mark */}
                <img
                  src="/brand/wonflow-icon-192.png"
                  alt="WonFlow Logo"
                  className="size-11 rounded-2xl border border-slate-200/80 dark:border-white/15 shadow-sm shrink-0 object-cover"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2
                      id="wf-install-steps-title"
                      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight"
                    >
                      Add WonFlow to this device
                    </h2>
                    {installed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        <Check size={12} /> Installed on this workstation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Sparkles size={11} /> Standalone PWA
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Step-by-step visual installation guide with high-definition screenshots
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSteps(false)}
                aria-label="Close"
                className="wfg-control grid size-8 place-items-center rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
              {/* ⚡ AUTOMATED ONE-CLICK INSTALL / DOWNLOAD CARD */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-teal-600/10 border border-blue-500/25 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 text-white px-2.5 py-0.5 text-[10.5px] font-bold shadow-sm">
                      <Sparkles size={11} /> 1-Click Automated Setup
                    </span>
                    <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-white mt-1.5">
                      Automate App Download &amp; Installation
                    </h3>
                    <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Install WonFlow automatically on your computer with a single click, or download the direct desktop standalone launcher.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void triggerAutomatedInstall()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-[12px] font-bold text-white shadow-md hover:shadow-blue-500/25 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Sparkles size={14} />
                    <span>{prompt ? "Install App Automatically" : "Auto-Install & Launch"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadWindowsLauncher()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-[11.5px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                  >
                    <Download size={13} className="text-blue-500" />
                    <span>Download Desktop App (.cmd)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadWindowsShortcut()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-[11.5px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                  >
                    <ArrowDownToLine size={13} className="text-teal-500" />
                    <span>Desktop Shortcut (.url)</span>
                  </button>
                </div>

                {downloadSuccess ? (
                  <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-2.5 flex items-center gap-2 text-[11.5px] font-medium text-emerald-800 dark:text-emerald-200 animate-in fade-in">
                    <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{downloadSuccess}</span>
                  </div>
                ) : null}
              </div>

              {/* DIVIDER */}
              <div className="flex items-center gap-3 py-0.5">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Or View Step-by-Step Visual Guidance
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Platform Selector Tabs */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Your Device Platform:
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5">
                  {(["desktop", "ios", "android"] as const).map((plt) => {
                    const p = PLATFORM_GUIDES[plt];
                    const isActive = platform === plt;
                    return (
                      <button
                        key={plt}
                        type="button"
                        onClick={() => {
                          setPlatform(plt);
                          setActiveStepIndex(0);
                        }}
                        className={[
                          "flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-[12px] font-semibold transition-all duration-200",
                          isActive
                            ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-white/10"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40",
                        ].join(" ")}
                      >
                        {p.iconType === "desktop" ? (
                          <Monitor size={15} className="shrink-0" />
                        ) : (
                          <Smartphone size={15} className="shrink-0" />
                        )}
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* View Mode & Step Navigation Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                {/* Step Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {guide.steps.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        setActiveStepIndex(idx);
                        setViewMode("slides");
                      }}
                      className={[
                        "flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11.5px] font-semibold transition-all",
                        viewMode === "slides" && activeStepIndex === idx
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid size-4 place-items-center rounded-full text-[9px] font-black",
                          viewMode === "slides" && activeStepIndex === idx
                            ? "bg-white text-blue-600"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {s.step}
                      </span>
                      <span>{s.shortLabel}</span>
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  {guide.urduHeading ? (
                    <button
                      type="button"
                      onClick={() => setShowUrdu(!showUrdu)}
                      className={[
                        "rounded-lg px-2 py-0.5 text-[11px] font-semibold border transition-colors",
                        showUrdu
                          ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-slate-700",
                      ].join(" ")}
                    >
                      اردو رہنمائی
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setViewMode(viewMode === "slides" ? "grid" : "slides")
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <Layers size={12} />
                    <span>{viewMode === "slides" ? "View all steps" : "Slide view"}</span>
                  </button>
                </div>
              </div>

              {/* SLIDES VIEW */}
              {viewMode === "slides" ? (
                <div className="space-y-3.5">
                  {/* Active Step Content Card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white shadow-sm">
                          {activeStep.step}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activeStep.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                        {activeStep.badge}
                      </span>
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {activeStep.description}
                    </p>

                    {/* Step Image Illustration Display */}
                    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-950 shadow-inner group">
                      {/* eslint-disable-next-line @next/next/no-img-element -- SVG step illustration */}
                      <img
                        src={activeStep.image}
                        alt={`Step ${activeStep.step}: ${activeStep.title}`}
                        className="w-full h-auto object-contain max-h-[260px] sm:max-h-[300px] transition-transform duration-300 group-hover:scale-[1.01]"
                        loading="eager"
                      />
                      <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-white/10">
                        Step {activeStep.step} Visual Guide
                      </div>
                    </div>

                    {/* Pro-Tip Hint */}
                    <div className="rounded-xl bg-amber-500/10 dark:bg-amber-500/8 border border-amber-500/20 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900 dark:text-amber-300">
                      {activeStep.hint}
                    </div>

                    {/* Optional Urdu Step Translation */}
                    {showUrdu && activeStep.urdu ? (
                      <div
                        dir="rtl"
                        className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-2.5 text-[12px] leading-relaxed text-teal-900 dark:text-teal-200"
                      >
                        <span className="font-bold">رہنمائی قدم {activeStep.step}: </span>
                        {activeStep.urdu}
                      </div>
                    ) : null}
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      disabled={activeStepIndex === 0}
                      onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={15} />
                      <span>Previous Step</span>
                    </button>

                    {/* Dots Indicator */}
                    <div className="flex items-center gap-1.5">
                      {guide.steps.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`Go to step ${idx + 1}`}
                          onClick={() => setActiveStepIndex(idx)}
                          className={[
                            "size-2.5 rounded-full transition-all duration-200",
                            activeStepIndex === idx
                              ? "w-6 bg-blue-600 rounded-full"
                              : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400",
                          ].join(" ")}
                        />
                      ))}
                    </div>

                    {activeStepIndex < guide.steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStepIndex((prev) =>
                            Math.min(guide.steps.length - 1, prev + 1),
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
                      >
                        <span>Next Step</span>
                        <ChevronRight size={15} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSteps(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all"
                      >
                        <Check size={14} />
                        <span>Finish & Close</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ALL STEPS GRID / LIST VIEW */
                <div className="space-y-4">
                  {guide.steps.map((step) => (
                    <div
                      key={step.step}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-6 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white shadow-sm">
                            {step.step}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {step.title}
                          </h3>
                        </div>
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {step.badge}
                        </span>
                      </div>

                      <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>

                      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element -- step illustration */}
                        <img
                          src={step.image}
                          alt={`Step ${step.step}: ${step.title}`}
                          className="w-full h-auto object-contain max-h-[220px]"
                          loading="lazy"
                        />
                      </div>

                      <div className="rounded-xl bg-amber-500/10 dark:bg-amber-500/8 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-300">
                        {step.hint}
                      </div>

                      {showUrdu && step.urdu ? (
                        <div
                          dir="rtl"
                          className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-2 text-[11.5px] text-teal-900 dark:text-teal-200"
                        >
                          <span className="font-bold">رہنمائی {step.step}: </span>
                          {step.urdu}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Urdu Platform Overview (if available) */}
              {showUrdu && guide.urduHeading ? (
                <div
                  dir="rtl"
                  className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3.5 space-y-1.5"
                >
                  <h4 className="text-[12.5px] font-bold text-teal-900 dark:text-teal-100">
                    {guide.urduHeading}
                  </h4>
                  <p className="text-[11.5px] leading-relaxed text-teal-800 dark:text-teal-300">
                    {guide.urduNote}
                  </p>
                </div>
              ) : null}

              {/* Bottom Reassurance & Privacy Note */}
              <p className="rounded-xl bg-slate-500/8 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-white/5">
                🔒 <strong className="text-slate-700 dark:text-slate-300">Fast &amp; Private:</strong> It is the same WonFlow, laid out for the screen it is on. You stay signed in to your clinical account, and nothing is stored on the device beyond standard browser caching.
              </p>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 mt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                Supported browsers: Chrome, Edge, Safari, Brave, Samsung Internet
              </span>

              <button
                type="button"
                onClick={() => setShowSteps(false)}
                className="w-full sm:w-auto ml-auto h-9 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-[12px] font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
