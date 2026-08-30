"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Check, Smartphone, X } from "lucide-react";

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

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";

  const agent = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(agent)) return "ios";
  if (/Android/i.test(agent)) return "android";

  return "desktop";
}

/*
 * Urdu accompanies the two phone platforms because that is where patients
 * install WonFlow, and the recovery app is worth nothing to a patient who
 * cannot follow the steps to get it. The desktop case is staff-only.
 */
const STEPS: Record<
  Platform,
  {
    browser: string;
    steps: readonly string[];
    urdu?: { heading: string; steps: readonly string[] };
  }
> = {
  ios: {
    browser: "Safari on iPhone or iPad",
    steps: [
      "Tap the Share button at the bottom of the screen.",
      "Scroll down and choose “Add to Home Screen”.",
      "Tap “Add”. WonFlow opens full screen from then on.",
    ],
    urdu: {
      heading: "آئی فون پر انسٹال کرنے کا طریقہ",
      steps: [
        "اسکرین کے نیچے شیئر (Share) کے بٹن پر کلک کریں۔",
        "نیچے اسکرول کر کے “Add to Home Screen” منتخب کریں۔",
        "“Add” پر کلک کریں۔ ایپ آپ کی ہوم اسکرین پر آ جائے گی۔",
      ],
    },
  },
  android: {
    browser: "Chrome on Android",
    steps: [
      "Tap the three dots at the top right of Chrome.",
      "Choose “Install app”, or “Add to Home screen”.",
      "Confirm with “Install”.",
    ],
    urdu: {
      heading: "اینڈرائڈ پر انسٹال کرنے کا طریقہ",
      steps: [
        "کروم کے اوپر دائیں کونے میں تین نقطوں پر کلک کریں۔",
        "“Install app” یا “Add to Home screen” منتخب کریں۔",
        "“Install” پر کلک کر کے تصدیق کریں۔",
      ],
    },
  },
  desktop: {
    browser: "Chrome or Edge on a computer",
    steps: [
      "Look for the install icon at the right-hand end of the address bar.",
      "Or open the browser menu and choose “Install WonFlow”.",
      "Confirm with “Install”. It opens in its own window.",
    ],
  },
};

export function InstallAppToggle({ compact = false }: { compact?: boolean }) {
  const installed = useSyncExternalStore(
    subscribeToInstallState,
    detectStandalone,
    installedOnServer,
  );

  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Read when the steps are opened, not during render - the user agent does
  // not exist on the server and guessing at it desynchronises hydration.
  const [platform, setPlatform] = useState<Platform>("desktop");

  const [busy, setBusy] = useState(false);

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

  const install = useCallback(async () => {
    if (!prompt) {
      setPlatform(detectPlatform());
      setShowSteps(true);
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
  }, [prompt]);

  const guide = STEPS[platform];

  return (
    <>
      <div
        className={[
          "wfg-well relative flex items-center gap-3 rounded-2xl px-3 py-2.5",
          compact ? "justify-center" : "",
        ].join(" ")}
      >
        <span
          className={[
            "grid size-8 shrink-0 place-items-center rounded-xl",
            installed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-300",
          ].join(" ")}
        >
          {installed ? <Check size={15} /> : <Smartphone size={15} />}
        </span>

        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">
                {installed ? "Installed as an app" : "Install as an app"}
              </span>
              {/* Not truncated - the sidebar is narrow and half a sentence
                  reads worse than two short lines. */}
              <span className="block text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                {installed ? "Running standalone" : "Add to this device"}
              </span>
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={installed}
              aria-label={
                installed ? "WonFlow is installed as an app" : "Install WonFlow as an app"
              }
              disabled={installed || busy}
              onClick={() => void install()}
              className={[
                "relative h-[22px] w-[38px] shrink-0 rounded-full transition",
                "disabled:cursor-default",
                installed
                  ? "bg-emerald-500"
                  : "bg-slate-300 hover:bg-blue-400 dark:bg-slate-600 dark:hover:bg-blue-500",
                busy ? "opacity-60" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-all",
                  installed ? "left-[19px]" : "left-[3px]",
                ].join(" ")}
              />
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label={
              installed ? "WonFlow is installed as an app" : "Install WonFlow as an app"
            }
            title={installed ? "Installed as an app" : "Install as an app"}
            disabled={installed || busy}
            onClick={() => void install()}
            className="absolute inset-0 rounded-2xl"
          />
        )}
      </div>

      {showSteps ? (
        <div
          className="fixed inset-0 z-100 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wf-install-steps-title"
        >
          <div className="wfg-panel w-full max-w-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 40px brand mark; the optimiser adds nothing */}
                <img
                  src="/brand/wonflow-icon-192.png"
                  alt=""
                  className="size-10 rounded-xl border border-slate-200/70 dark:border-white/10"
                />
                <div>
                  <h2
                    id="wf-install-steps-title"
                    className="text-sm font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Add WonFlow to this device
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {guide.browser}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSteps(false)}
                aria-label="Close"
                className="wfg-control grid size-8 place-items-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <ol className="mt-4 space-y-2.5">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-500/15 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <span className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            {guide.urdu ? (
              <div
                dir="rtl"
                className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/8 px-3 py-3"
              >
                <h3 className="text-[12px] font-semibold text-teal-900 dark:text-teal-200">
                  {guide.urdu.heading}
                </h3>
                <ol className="mt-2 space-y-1.5">
                  {guide.urdu.steps.map((step) => (
                    <li
                      key={step}
                      className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <p className="mt-4 rounded-xl bg-slate-500/8 px-3 py-2 text-[10.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              It is the same WonFlow, laid out for the screen it is on. You stay
              signed in to the same account, and nothing is stored on the device
              beyond what the browser already keeps.
            </p>

            <button
              type="button"
              onClick={() => setShowSteps(false)}
              className="mt-4 h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-[12px] font-semibold text-white hover:brightness-110"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
