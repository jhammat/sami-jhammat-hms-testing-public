"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";

interface WonFlowRouteTransitionContextValue {
  beginTransition: (label?: string) => void;
  endTransition: () => void;
  isTransitioning: boolean;
}

interface RouteTransitionState {
  label: string;
  visible: boolean;
}

const DEFAULT_LABEL = "Loading page…";
const SHOW_DELAY_MS = 80;
const MINIMUM_VISIBLE_MS = 220;
const SOFT_FALLBACK_MS = 1_400;
const HARD_FALLBACK_MS = 9_000;

const WonFlowRouteTransitionContext =
  createContext<WonFlowRouteTransitionContextValue | undefined>(undefined);

export interface WonFlowRouteTransitionProviderProps {
  children: ReactNode;
}

export function WonFlowRouteTransitionProvider({
  children,
}: WonFlowRouteTransitionProviderProps) {
  const pathname = usePathname();

  const [transition, setTransition] = useState<RouteTransitionState>({
    label: DEFAULT_LABEL,
    visible: false,
  });

  const activeRef = useRef(false);
  const previousPathnameRef = useRef(pathname);
  const visibleAtRef = useRef<number | undefined>(undefined);
  const showTimerRef = useRef<number | undefined>(undefined);
  const finishTimerRef = useRef<number | undefined>(undefined);
  const softFallbackTimerRef = useRef<number | undefined>(undefined);
  const hardFallbackTimerRef = useRef<number | undefined>(undefined);

  const clearTimer = useCallback((timerRef: { current: number | undefined }) => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const resetTransition = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(finishTimerRef);
    clearTimer(softFallbackTimerRef);
    clearTimer(hardFallbackTimerRef);

    activeRef.current = false;
    visibleAtRef.current = undefined;

    setTransition({
      label: DEFAULT_LABEL,
      visible: false,
    });
  }, [clearTimer]);

  const endTransition = useCallback(() => {
    if (!activeRef.current) {
      return;
    }

    clearTimer(showTimerRef);
    clearTimer(softFallbackTimerRef);
    clearTimer(hardFallbackTimerRef);

    const visibleAt = visibleAtRef.current;

    if (visibleAt === undefined) {
      resetTransition();
      return;
    }

    const elapsed = Date.now() - visibleAt;
    const remaining = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    clearTimer(finishTimerRef);

    finishTimerRef.current = window.setTimeout(
      resetTransition,
      remaining,
    );
  }, [clearTimer, resetTransition]);

  const beginTransition = useCallback(
    (label = DEFAULT_LABEL) => {
      clearTimer(finishTimerRef);
      clearTimer(showTimerRef);
      clearTimer(softFallbackTimerRef);
      clearTimer(hardFallbackTimerRef);

      activeRef.current = true;
      visibleAtRef.current = undefined;

      setTransition({
        label,
        visible: false,
      });

      showTimerRef.current = window.setTimeout(() => {
        visibleAtRef.current = Date.now();

        setTransition({
          label,
          visible: true,
        });
      }, SHOW_DELAY_MS);

      softFallbackTimerRef.current = window.setTimeout(
        endTransition,
        SOFT_FALLBACK_MS,
      );

      hardFallbackTimerRef.current = window.setTimeout(
        resetTransition,
        HARD_FALLBACK_MS,
      );
    },
    [clearTimer, endTransition, resetTransition],
  );

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    endTransition();
  }, [endTransition, pathname]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>("a[href]");

      if (
        anchor === null ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank"
      ) {
        return;
      }

      const rawHref = anchor.getAttribute("href");

      if (
        rawHref === null ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) {
        return;
      }

      // Same page, only the query moved. Nothing unmounts and nothing is
      // fetched that the reader waits on, so there is nothing to announce.
      //
      // This also has to be a `return` rather than a shorter overlay: the
      // transition is ended by the pathname effect below, and on a query-only
      // navigation the pathname never changes - so an overlay opened here
      // would hang until the 1.4s fallback swept it away. The allied
      // workspaces move between their sections exactly this way.
      if (destination.pathname === current.pathname) {
        return;
      }

      beginTransition("Loading page…");
    }

    function handlePopState() {
      beginTransition("Loading page…");
    }

    function handlePageShow() {
      endTransition();
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [beginTransition, endTransition]);

  useEffect(
    () => () => {
      clearTimer(showTimerRef);
      clearTimer(finishTimerRef);
      clearTimer(softFallbackTimerRef);
      clearTimer(hardFallbackTimerRef);
    },
    [clearTimer],
  );

  const contextValue = useMemo<WonFlowRouteTransitionContextValue>(
    () => ({
      beginTransition,
      endTransition,
      isTransitioning: transition.visible,
    }),
    [beginTransition, endTransition, transition.visible],
  );

  return (
    <WonFlowRouteTransitionContext.Provider value={contextValue}>
      {children}

      <WonFlowRouteLoader
        label={transition.label}
        visible={transition.visible}
      />
    </WonFlowRouteTransitionContext.Provider>
  );
}

export function useWonFlowRouteTransition():
  WonFlowRouteTransitionContextValue {
  const context = useContext(WonFlowRouteTransitionContext);

  if (context === undefined) {
    throw new Error(
      "useWonFlowRouteTransition must be used inside WonFlowRouteTransitionProvider.",
    );
  }

  return context;
}
