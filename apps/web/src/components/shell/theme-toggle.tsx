"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

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

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const isDark = stored !== null ? stored === "dark" : document.documentElement.classList.contains("dark");
    setDark(isDark);
    applyTheme(isDark);

    function onThemeChange() {
      const currentStored = window.localStorage.getItem(STORAGE_KEY);
      const activeDark = currentStored !== null ? currentStored === "dark" : document.documentElement.classList.contains("dark");
      setDark(activeDark);
    }

    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDark((current) => {
          const next = !current;
          window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
          applyTheme(next);
          window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
          return next;
        });
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    window.addEventListener("storage", onThemeChange);
    window.addEventListener("keydown", onShortcut);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
      window.removeEventListener("storage", onThemeChange);
      window.removeEventListener("keydown", onShortcut);
    };
  }, []);

  function toggle(): void {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={floating
          ? "fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200"
          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"}
        type="button"
      >
        <Moon aria-hidden="true" size={18} />
      </button>
    );
  }

  return (
    <button
      aria-label={dark ? "Use light mode" : "Use dark mode"}
      aria-pressed={dark}
      className={floating
        ? "fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-600 shadow-lg backdrop-blur transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"}
      onClick={toggle}
      title={`${dark ? "Light" : "Dark"} mode (Ctrl/Command + Shift + D)`}
      type="button"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  );
}
