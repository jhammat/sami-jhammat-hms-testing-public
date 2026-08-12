"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "wonflow-color-theme";

function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored === "dark";
    // Hydrate the browser-persisted theme after the client mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(initial);
    applyTheme(initial);

    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDark((current) => {
          const next = !current;
          window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
          applyTheme(next);
          return next;
        });
      }
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  function toggle(): void {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
  }

  return (
    <button
      aria-label={dark ? "Use light mode" : "Use dark mode"}
      aria-pressed={dark}
      className={floating
        ? "fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur transition hover:border-blue-300 hover:text-blue-700"
        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"}
      onClick={toggle}
      title={`${dark ? "Light" : "Dark"} mode (Ctrl/Command + Shift + D)`}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  );
}
