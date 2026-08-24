import type { ObservationSource } from "./consultation";
import type { ObservationStatus } from "./observation";

export type DrainColour =
  | "CLEAR"
  | "PALE_YELLOW"
  | "RED"
  | "DARK_BROWN"
  | "GREEN"
  | "MILKY"
  | "OTHER";

export type DrainCharacter =
  | "SEROUS"
  | "SEROSANGUINOUS"
  | "PURULENT"
  | "BILIOUS"
  | "CHYLOUS";

export type DrainAmylaseSource = "PATIENT_REPORTED" | "LAB_CONFIRMED";

export interface DrainColourSwatch {
  code: DrainColour;
  display: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export const DRAIN_COLOUR_SWATCHES: Record<DrainColour, DrainColourSwatch> = {
  CLEAR: {
    code: "CLEAR",
    display: "Clear",
    hex: "#F8FAFC",
    bgClass: "bg-slate-100",
    borderClass: "border-slate-300",
    description: "Water-clear, non-viscous fluid",
  },
  PALE_YELLOW: {
    code: "PALE_YELLOW",
    display: "Straw / Pale Yellow",
    hex: "#FEF08A",
    bgClass: "bg-yellow-100",
    borderClass: "border-yellow-300",
    description: "Normal serous peritoneal fluid",
  },
  RED: {
    code: "RED",
    display: "Bright Red / Bloody",
    hex: "#EF4444",
    bgClass: "bg-red-500",
    borderClass: "border-red-600",
    description: "Active sanguineous or hemorrhagic output",
  },
  DARK_BROWN: {
    code: "DARK_BROWN",
    display: "Dark Brown / Old Blood",
    hex: "#78350F",
    bgClass: "bg-amber-900",
    borderClass: "border-amber-950",
    description: "Old blood or altered intestinal output",
  },
  GREEN: {
    code: "GREEN",
    display: "Green / Bilious",
    hex: "#22C55E",
    bgClass: "bg-emerald-500",
    borderClass: "border-emerald-600",
    description: "Bile-stained output indicating possible biliary leak",
  },
  MILKY: {
    code: "MILKY",
    display: "Milky / Opaque White",
    hex: "#E2E8F0",
    bgClass: "bg-slate-200",
    borderClass: "border-slate-400",
    description: "Chylous or purulent lymphatic fluid",
  },
  OTHER: {
    code: "OTHER",
    display: "Other / Mixed",
    hex: "#94A3B8",
    bgClass: "bg-slate-400",
    borderClass: "border-slate-500",
    description: "Atypical or mixed character output",
  },
};

export interface PatientDrainSummary {
  id: string;
  tenantId: string;
  patientId: string;
  label: string;
  site: string;
  insertedAt: string;
  removedAt?: string | null;
  insertedByMembershipId?: string | null;
  insertedByClinicianName?: string | null;
  isActive: boolean;
  notes?: string | null;
  totalLogsCount?: number;
  last24hVolumeMl?: number;
  lastRecordedColour?: DrainColour | null;
  createdAt: string;
  updatedAt: string;
}

export interface DrainLogSummary {
  id: string;
  tenantId: string;
  patientId: string;
  drainId: string;
  recordedAt: string;
  deviceRecordedAt?: string | null;
  volumeMl: number;
  colour: DrainColour;
  colourNote?: string | null;
  character?: DrainCharacter | null;
  amylaseValue?: number | null;
  amylaseUnit?: string | null;
  amylaseSource?: DrainAmylaseSource | null;
  photoObjectKey?: string | null;
  notes?: string | null;
  source: ObservationSource;
  status: ObservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InsertDrainInput {
  patientId: string;
  label: string;
  site: string;
  insertedAt?: string;
  notes?: string;
}

export interface RemoveDrainInput {
  removedAt?: string;
  notes?: string;
}

export interface RecordDrainLogInput {
  drainId: string;
  recordedAt?: string;
  deviceRecordedAt?: string;
  volumeMl: number;
  colour: DrainColour;
  colourNote?: string;
  character?: DrainCharacter;
  amylaseValue?: number;
  amylaseUnit?: string;
  amylaseSource?: DrainAmylaseSource;
  photoObjectKey?: string;
  notes?: string;
}

export interface DrainDailyTrendPoint {
  date: string;
  totalVolumeMl: number;
  latestColour: DrainColour;
  latestCharacter?: DrainCharacter | null;
  maxAmylaseValue?: number | null;
  logCount: number;
}

export interface DrainTrendSeries {
  drain: PatientDrainSummary;
  dailyPoints: DrainDailyTrendPoint[];
  totalCumulativeVolumeMl: number;
  hasFistulaAlert: boolean;
  hasHighVolumeAlert: boolean;
  hasBileLeakAlert: boolean;
}
