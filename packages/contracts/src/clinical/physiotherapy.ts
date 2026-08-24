export const INDEPENDENCE_LEVELS = [
  "BED_BOUND",
  "CHAIR_TRANSFER",
  "ASSISTED_AMBULATION",
  "INDEPENDENT_AMBULATION",
  "STAIR_NAVIGATING",
] as const;

export type IndependenceLevel = (typeof INDEPENDENCE_LEVELS)[number];

export const EXERCISE_CATEGORIES = [
  "RESPIRATORY",
  "CIRCULATORY",
  "MOBILITY",
  "STRENGTHENING",
  "POSTURE",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const THERAPY_ATTENDANCE_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "PATIENT_UNWELL",
  "REFUSED",
] as const;

export type TherapyAttendanceStatus = (typeof THERAPY_ATTENDANCE_STATUSES)[number];

export interface TherapyAssessmentRecord {
  id: string;
  tenantId: string;
  patientId: string;
  assessedByStaffId: string;
  referralId?: string | null;
  assessedAt: string;
  mobilityScore: number;
  painScore: number;
  respiratoryFunction?: string | null;
  independenceLevel: IndependenceLevel;
  surgicalRestrictions?: string | null;
  baselineNotes?: string | null;
  goals?: string | null;
  createdAt: string;
  updatedAt: string;
  assessedByStaff?: {
    id: string;
    staffType: string;
    title?: string | null;
    membership?: {
      displayName?: string | null;
    };
  };
}

export interface CreateTherapyAssessmentInput {
  patientId: string;
  referralId?: string;
  mobilityScore: number;
  painScore: number;
  respiratoryFunction?: string;
  independenceLevel: IndependenceLevel;
  surgicalRestrictions?: string;
  baselineNotes?: string;
  goals?: string;
}

export interface ExerciseDefinitionRecord {
  id: string;
  tenantId: string;
  name: string;
  category: ExerciseCategory;
  description?: string | null;
  instruction: string;
  demonstrationDocumentId?: string | null;
  demonstrationUrl?: string | null;
  defaultRepetitions?: number | null;
  defaultSets?: number | null;
  defaultDurationSeconds?: number | null;
  precautions?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExerciseDefinitionInput {
  name: string;
  category: ExerciseCategory;
  description?: string;
  instruction: string;
  demonstrationUrl?: string;
  defaultRepetitions?: number;
  defaultSets?: number;
  defaultDurationSeconds?: number;
  precautions?: string;
}

export interface TherapySessionRecord {
  id: string;
  tenantId: string;
  patientId: string;
  conductedByStaffId: string;
  referralId?: string | null;
  sessionDate: string;
  attendanceStatus: TherapyAttendanceStatus;
  painBefore?: number | null;
  painAfter?: number | null;
  spirometryAchievedMl?: number | null;
  stepsAchieved?: number | null;
  progressNotes?: string | null;
  goalsMet?: string | null;
  nextSessionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  conductedByStaff?: {
    id: string;
    staffType: string;
    title?: string | null;
    membership?: {
      displayName?: string | null;
    };
  };
}

export interface LogTherapySessionInput {
  patientId: string;
  referralId?: string;
  sessionDate?: string;
  attendanceStatus: TherapyAttendanceStatus;
  painBefore?: number;
  painAfter?: number;
  spirometryAchievedMl?: number;
  stepsAchieved?: number;
  progressNotes?: string;
  goalsMet?: string;
  nextSessionDate?: string;
}

export interface AssignTherapyExerciseInput {
  patientId: string;
  referralId?: string;
  carePlanId?: string;
  exerciseName: string;
  category: ExerciseCategory;
  instructions: string;
  targetDays?: number[];
  scheduledFor: string;
  repetitions?: number;
  sets?: number;
}
