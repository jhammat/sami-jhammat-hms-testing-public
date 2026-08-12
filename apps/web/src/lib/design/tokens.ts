export const wonFlowVisualTokens = {
  colors: {
    canvas: "#F4F7FB",
    surface: "#FFFFFF",
    surfaceSoft: "#F8FAFC",

    textStrong: "#0F172A",
    text: "#334155",
    textMuted: "#64748B",

    line: "#DBE3EF",
    lineStrong: "#C8D4E3",

    blue: "#2563EB",
    blueDark: "#1D4ED8",
    blueSoft: "#EFF6FF",

    violet: "#6D5DFC",
    violetDark: "#5946E8",
    violetSoft: "#F4F1FF",

    cyan: "#0891B2",
    cyanSoft: "#ECFEFF",

    emerald: "#059669",
    emeraldSoft: "#ECFDF5",

    amber: "#D97706",
    amberSoft: "#FFFBEB",

    rose: "#E11D48",
    roseSoft: "#FFF1F2",

    slateSoft: "#F1F5F9",
  },

  radii: {
    small: "10px",
    medium: "14px",
    large: "18px",
    extraLarge: "24px",
  },

  shadows: {
    subtle:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)",

    elevated:
      "0 2px 4px rgba(15, 23, 42, 0.05), 0 18px 46px rgba(15, 23, 42, 0.10)",

    focus:
      "0 0 0 3px rgba(37, 99, 235, 0.14)",
  },

  spacing: {
    compact: "12px",
    standard: "16px",
    comfortable: "24px",
    section: "32px",
  },
} as const;

export const wonFlowStatusTokens = [
  {
    key: "scheduled",
    label: "Scheduled",
    foreground: "#1D4ED8",
    background: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    key: "waiting",
    label: "Waiting",
    foreground: "#A16207",
    background: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    key: "active",
    label: "In Progress",
    foreground: "#5946E8",
    background: "#F4F1FF",
    border: "#DDD6FE",
  },
  {
    key: "completed",
    label: "Completed",
    foreground: "#047857",
    background: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    key: "critical",
    label: "Critical",
    foreground: "#BE123C",
    background: "#FFF1F2",
    border: "#FECDD3",
  },
  {
    key: "neutral",
    label: "Not Available",
    foreground: "#475569",
    background: "#F1F5F9",
    border: "#CBD5E1",
  },
] as const;

export type WonFlowStatusToken =
  (typeof wonFlowStatusTokens)[number];