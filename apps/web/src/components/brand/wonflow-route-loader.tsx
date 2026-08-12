"use client";

import Image from "next/image";

export interface WonFlowRouteLoaderProps {
  visible?: boolean;
  label?: string;
  overlay?: boolean;
  compact?: boolean;
}

export function WonFlowRouteLoader({
  visible = true,
  label = "Loading…",
  overlay = true,
  compact = false,
}: WonFlowRouteLoaderProps) {
  if (!visible) {
    return null;
  }

  const markSize =
    compact
      ? 42
      : 64;

  return (
    <div
      aria-label={label}
      aria-live="polite"
      className={
        overlay
          ? [
              "pointer-events-none fixed inset-0 z-[1000]",
              "flex items-center justify-center",
              "bg-white/74 px-4 backdrop-blur-[3px]",
            ].join(" ")
          : [
              "flex w-full items-center justify-center px-4",
              compact
                ? "min-h-28"
                : "min-h-[240px]",
            ].join(" ")
      }
      role="status"
    >
      <div
        className={[
          "flex flex-col items-center",
          compact
            ? "gap-2 rounded-xl px-4 py-3"
            : "gap-3 rounded-2xl px-5 py-4",
          "border border-blue-100/80",
          "bg-white/95",
          "shadow-[0_18px_55px_rgba(30,64,175,0.14)]",
        ].join(" ")}
      >
        <div
          aria-hidden="true"
          className="relative shrink-0"
          style={{
            height: markSize,
            width: markSize,
          }}
        >
          {/*
            The mark carries its own animation, so no CSS transform is
            applied. `unoptimized` keeps every frame — the image optimizer
            would otherwise re-encode it down to a single still frame.
          */}
          <Image
            alt=""
            className="wf-loader-animated object-contain"
            fill
            priority
            sizes={`${markSize}px`}
            src="/brand/wonflow-loader.gif"
            unoptimized
          />

          {/*
            An animated GIF cannot be paused, so a still mark is swapped in
            for anyone who has asked for reduced motion.
          */}
          <Image
            alt=""
            className="wf-loader-static object-contain"
            fill
            priority
            sizes={`${markSize}px`}
            src="/brand/wonflow-mark.png"
          />
        </div>

        <span className="max-w-64 text-center text-xs font-semibold tracking-wide text-slate-600">
          {label}
        </span>
      </div>
    </div>
  );
}
