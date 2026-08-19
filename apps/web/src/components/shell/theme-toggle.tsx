"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "wonflow-color-theme";
const THEME_CHANGE_EVENT = "wonflow-theme-changed";

function applyTheme(dark: boolean): void {
  if (typeof document === "undefined") return;
  if (dark) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readTheme(): "dark" | "light" {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "dark" ? "dark" : "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// The server has no way to know the visitor's stored theme; the inline script in
// the root layout paints the right one before hydration, and this snapshot keeps
// the hydrated markup matching what the server sent.
const serverTheme = (): "light" => "light";

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const dark = useSyncExternalStore(subscribe, readTheme, serverTheme) === "dark";

  const setTheme = useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setTheme(readTheme() !== "dark");
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [setTheme]);

  return (
    <button
      aria-label={dark ? "Use light mode" : "Use dark mode"}
      aria-pressed={dark}
      className={floating
        ? "fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"}
      onClick={() => setTheme(!dark)}
      title={`${dark ? "Light" : "Dark"} mode (Ctrl/Command + Shift + D)`}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  );
}
