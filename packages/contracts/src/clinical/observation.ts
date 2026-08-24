import type { ObservationSource } from "./consultation";
export type { ObservationSource };

export type ObservationStatus = "PRELIMINARY" | "FINAL" | "AMENDED" | "CANCELLED" | "ENTERED_IN_ERROR";


export interface CreateObservationInput {
  patientId: string;
  encounterId?: string;
  code: string;
  display: string;
  valueNumber?: number;
  valueText?: string;
  unit?: string;
  observedAt?: string;
  deviceRecordedAt?: string;
  carePlanTaskId?: string;
  source?: ObservationSource;
}

export interface ClinicalObservationSummary {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId?: string | null;
  recordedByMembershipId?: string | null;
  recordedByIdentityId?: string | null;
  carePlanTaskId?: string | null;
  source: ObservationSource;
  code: string;
  display: string;
  valueNumber?: number | null;
  valueText?: string | null;
  unit?: string | null;
  status: ObservationStatus;
  observedAt: string;
  deviceRecordedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VitalCodeDefinition {
  code: string;
  display: string;
  unit: string;
  sensibleMin: number;
  sensibleMax: number;
  plausibleMin: number;
  plausibleMax: number;
  step: number;
}

export const SUPPORTED_VITALS: Record<string, VitalCodeDefinition> = {
  temperature: {
    code: "temperature",
    display: "Body Temperature",
    unit: "°C",
    sensibleMin: 35.0,
    sensibleMax: 40.0,
    plausibleMin: 30.0,
    plausibleMax: 45.0,
    step: 0.1,
  },
  blood_pressure_systolic: {
    code: "blood_pressure_systolic",
    display: "Systolic Blood Pressure",
    unit: "mmHg",
    sensibleMin: 70,
    sensibleMax: 200,
    plausibleMin: 50,
    plausibleMax: 280,
    step: 1,
  },
  blood_pressure_diastolic: {
    code: "blood_pressure_diastolic",
    display: "Diastolic Blood Pressure",
    unit: "mmHg",
    sensibleMin: 40,
    sensibleMax: 130,
    plausibleMin: 30,
    plausibleMax: 180,
    step: 1,
  },
  pulse: {
    code: "pulse",
    display: "Pulse / Heart Rate",
    unit: "bpm",
    sensibleMin: 40,
    sensibleMax: 160,
    plausibleMin: 30,
    plausibleMax: 250,
    step: 1,
  },
  respiratory_rate: {
    code: "respiratory_rate",
    display: "Respiratory Rate",
    unit: "breaths/min",
    sensibleMin: 8,
    sensibleMax: 35,
    plausibleMin: 6,
    plausibleMax: 60,
    step: 1,
  },
  oxygen_saturation: {
    code: "oxygen_saturation",
    display: "Oxygen Saturation (SpO2)",
    unit: "%",
    sensibleMin: 85,
    sensibleMax: 100,
    plausibleMin: 50,
    plausibleMax: 100,
    step: 1,
  },
  weight: {
    code: "weight",
    display: "Body Weight",
    unit: "kg",
    sensibleMin: 20.0,
    sensibleMax: 250.0,
    plausibleMin: 1.0,
    plausibleMax: 400.0,
    step: 0.1,
  },
  blood_glucose: {
    code: "blood_glucose",
    display: "Blood Glucose",
    unit: "mg/dL",
    sensibleMin: 40,
    sensibleMax: 400,
    plausibleMin: 20,
    plausibleMax: 600,
    step: 1,
  },
  pain_score: {
    code: "pain_score",
    display: "Pain Score",
    unit: "scale 0-10",
    sensibleMin: 0,
    sensibleMax: 10,
    plausibleMin: 0,
    plausibleMax: 10,
    step: 1,
  },
};

export interface ObservationTrendPoint {
  id: string;
  observedAt: string;
  valueNumber: number;
  valueText?: string | null;
  unit: string;
  source: ObservationSource;
  status: ObservationStatus;
}

export interface ObservationTrendSeries {
  code: string;
  display: string;
  unit: string;
  definition?: VitalCodeDefinition;
  points: ObservationTrendPoint[];
  latestPoint?: ObservationTrendPoint | null;
}
