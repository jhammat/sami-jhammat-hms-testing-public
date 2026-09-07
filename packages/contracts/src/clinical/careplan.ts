import type { ObservationSource } from "./consultation";

export type CarePlanCategory =
  | "SURGERY_POSTOP"
  | "MATERNITY_POSTPARTUM"
  | "CHRONIC_CARE"
  | "PEDIATRIC"
  | "ONCOLOGY"
  | "GENERAL"
  | string;

export type CarePlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "DISCONTINUED";

export type CarePlanTaskType =
  | "MEDICATION"
  | "VITALS_LOG"
  | "DRAIN_LOG"
  | "WOUND_PHOTO"
  | "DIET_LOG"
  | "EXERCISE"
  | "QUESTIONNAIRE"
  | "APPOINTMENT"
  | "EDUCATION"
  | "MEAL"
  | "SUPPLEMENT";


export type CarePlanTaskStatus =
  | "PENDING"
  | "COMPLETED"
  | "SKIPPED"
  | "MISSED";

export type CarePlanAlertSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type CarePlanAlertStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "DISMISSED";

export interface CarePlanStageDefinition {
  stageNumber: number;
  title: string;
  daysFromStart: [number, number];
  description?: string;
}

export interface CarePlanTaskTemplate {
  templateId: string;
  stageNumber: number;
  dayOffset: number; // 1-indexed relative to plan start date
  taskType: CarePlanTaskType;
  title: string;
  instructions?: string;
  requiredSource?: ObservationSource | null;
  scheduleTimeOfDay?: string; // "08:00", "12:00", "20:00"
}

export interface CarePlanAlertRule {
  observationType: string; // e.g. "blood_pressure_systolic", "temperature", "drain_output"
  condition: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold: number;
  severity: CarePlanAlertSeverity;
  message: string;
}

export interface CarePlanProgressNote {
  timestamp: string;
  authorIdentityId: string;
  authorName?: string;
  note: string;
}

export interface CreateCarePlanTemplateInput {
  category: string;
  title: string;
  description?: string;
  durationDays: number;
  stages: CarePlanStageDefinition[];
  taskTemplates: CarePlanTaskTemplate[];
  alertRules: CarePlanAlertRule[];
}

export interface InstantiateCarePlanInput {
  templateId?: string;
  patientId: string;
  startDate?: string; // ISO date string, defaults to now
  durationDays?: number; // Custom recovery duration in days
  category?: string;
  title?: string;
  managingDoctorId?: string;
  assignedCaregiverId?: string;
  assignedTherapistId?: string;
  assignedNutritionistId?: string;
  instigatingEncounterId?: string;
}

export interface CompleteCarePlanTaskInput {
  resultData?: Record<string, unknown>;
  skipReason?: string;
  observation?: {
    code: string;
    display: string;
    valueNumber?: number;
    valueText?: string;
    unit?: string;
    observedAt?: string;
  };
}

export interface CarePlanTemplateSummary {
  id: string;
  tenantId: string;
  category: string;
  title: string;
  description?: string | null;
  durationDays: number;
  stages: CarePlanStageDefinition[];
  taskTemplates: CarePlanTaskTemplate[];
  alertRules: CarePlanAlertRule[];
  isActive: boolean;
  version: number;
  createdByMembershipId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanTaskSummary {
  id: string;
  tenantId: string;
  carePlanId: string;
  taskType: CarePlanTaskType;
  stageNumber: number;
  dayNumber: number;
  scheduledFor: string;
  dueBy?: string | null;
  title: string;
  instructions?: string | null;
  requiredSource?: ObservationSource | null;
  status: CarePlanTaskStatus;
  completedAt?: string | null;
  completedByIdentityId?: string | null;
  resultData?: Record<string, unknown> | null;
  skipReason?: string | null;
  createdAt: string;
}

export interface CarePlanAlertSummary {
  id: string;
  tenantId: string;
  carePlanId: string;
  patientId: string;
  triggeredByObservationId?: string | null;
  severity: CarePlanAlertSeverity;
  status: CarePlanAlertStatus;
  title: string;
  message: string;
  acknowledgedByMembershipId?: string | null;
  acknowledgedAt?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface CarePlanSummary {
  id: string;
  tenantId: string;
  patientId: string;
  /** Present on the single-plan detail response so the screen can name the patient. */
  patientName?: string | null;
  patientNumber?: string | null;
  templateId?: string | null;
  category: string;
  title: string;
  status: CarePlanStatus;
  startDate: string;
  endDate?: string | null;
  currentStage: number;
  instigatingEncounterId?: string | null;
  managingDoctorId: string;
  assignedCaregiverId?: string | null;
  assignedTherapistId?: string | null;
  assignedNutritionistId?: string | null;
  progressNotes?: CarePlanProgressNote[] | null;
  tasks?: CarePlanTaskSummary[];
  alerts?: CarePlanAlertSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CarePlanRosterItem {
  id: string;
  tenantId: string;
  patientId: string;
  patientNumber: string;
  patientName: string;
  title: string;
  category: string;
  status: CarePlanStatus;
  startDate: string;
  endDate?: string | null;
  currentDayNumber: number;
  totalDays: number;
  currentStage: number;
  totalStages: number;
  todayCompletedTasks: number;
  todayTotalTasks: number;
  highestAlertSeverity: CarePlanAlertSeverity | "NONE";
  activeAlertCount: number;
  managingDoctorName: string;
  assignedTherapistName?: string | null;
  assignedNutritionistName?: string | null;
  lastVitalsSummary?: string | null;
  lastDrainSummary?: string | null;
  lastWoundSummary?: string | null;
  lastActiveAt?: string | null;
}

export interface AcknowledgeAlertInput {
  notes?: string;
  resolutionNotes?: string;
}

export interface ResolveAlertInput {
  resolutionNotes: string;
}

export interface AddProgressNoteInput {
  note: string;
}

