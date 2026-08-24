import type { ObservationSource } from "./consultation";

export type SymptomSeverityLevel = "MILD" | "MODERATE" | "SEVERE" | "VERY_SEVERE";


export interface SymptomDefinition {
  code: string;
  name: string;
  category: "Gastrointestinal" | "General" | "Wound & Infection" | "Cardiorespiratory";
  description: string;
  icon: string;
  defaultScale: "NUMERIC_0_10" | "LEVEL_4";
}

export const DEFAULT_HPB_SYMPTOMS: SymptomDefinition[] = [
  {
    code: "pain",
    name: "Pain",
    category: "General",
    description: "Surgical site or abdominal discomfort (0 = no pain, 10 = worst pain)",
    icon: "Activity",
    defaultScale: "NUMERIC_0_10",
  },
  {
    code: "nausea",
    name: "Nausea",
    category: "Gastrointestinal",
    description: "Feeling sick or queasy in the stomach",
    icon: "SmilePlus",
    defaultScale: "LEVEL_4",
  },
  {
    code: "vomiting",
    name: "Vomiting",
    category: "Gastrointestinal",
    description: "Inability to keep oral fluids or meals down",
    icon: "AlertOctagon",
    defaultScale: "LEVEL_4",
  },
  {
    code: "fever",
    name: "Fever / Chills",
    category: "General",
    description: "Elevated temperature, shivering, or feeling unusually hot/cold",
    icon: "Thermometer",
    defaultScale: "LEVEL_4",
  },
  {
    code: "appetite_loss",
    name: "Loss of Appetite / Early Fullness",
    category: "Gastrointestinal",
    description: "Reduced hunger or fullness after just a few bites",
    icon: "UtensilsCrossed",
    defaultScale: "LEVEL_4",
  },
  {
    code: "steatorrhoea",
    name: "Oily / Floating Stools (Steatorrhoea)",
    category: "Gastrointestinal",
    description: "Pale, greasy, foul-smelling, or difficult-to-flush bowel movements (PERT / Creon check)",
    icon: "AlertTriangle",
    defaultScale: "LEVEL_4",
  },
  {
    code: "jaundice",
    name: "Yellowing of Skin/Eyes (Jaundice)",
    category: "General",
    description: "Yellowish tinge to eyes/skin or dark tea-colored urine (Biliary check)",
    icon: "Eye",
    defaultScale: "LEVEL_4",
  },
  {
    code: "abdominal_distension",
    name: "Abdominal Distension / Bloating",
    category: "Gastrointestinal",
    description: "Tight, stretched, or visibly swollen abdomen",
    icon: "CircleDot",
    defaultScale: "LEVEL_4",
  },
  {
    code: "wound_discharge",
    name: "Wound Redness or Discharge",
    category: "Wound & Infection",
    description: "Fluid leaking from incision, spreading redness, or warmth",
    icon: "ShieldAlert",
    defaultScale: "LEVEL_4",
  },
  {
    code: "breathlessness",
    name: "Shortness of Breath",
    category: "Cardiorespiratory",
    description: "Difficulty catching breath when resting or walking",
    icon: "Wind",
    defaultScale: "LEVEL_4",
  },
];

export interface SymptomLogItem {
  id: string;
  patientId: string;
  recordedAt: string;
  deviceRecordedAt?: string | null;
  symptomCode: string;
  symptomName: string;
  severityScore: number;
  severityLabel: SymptomSeverityLevel;
  freeText?: string | null;
  photoDocumentId?: string | null;
  photoData?: string | null;
  recordedByIdentityId?: string | null;
  source: ObservationSource;
  carePlanTaskId?: string | null;
  createdAt: string;
}

export interface RecordSymptomLogInput {
  patientId?: string;
  symptomCode: string;
  symptomName?: string;
  severityScore: number;
  severityLabel?: SymptomSeverityLevel;
  freeText?: string;
  photoData?: string;
  deviceRecordedAt?: string;
  carePlanTaskId?: string;
}

export interface CombinedRecoveryTimelineItem {
  id: string;
  timestamp: string;
  itemType: "SYMPTOM" | "VITAL" | "DRAIN" | "MEDICATION";
  title: string;
  subtitle?: string;
  valueDisplay?: string;
  severityLevel?: "NORMAL" | "WARNING" | "CRITICAL" | "INFO";
  source: ObservationSource;
  details?: Record<string, unknown>;
  photoData?: string | null;
}
