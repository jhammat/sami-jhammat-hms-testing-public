export const NUTRITION_ITEM_TYPES = [
  "MEAL",
  "SNACK",
  "SUPPLEMENT",
  "ENZYME",
] as const;

export type NutritionItemType = (typeof NUTRITION_ITEM_TYPES)[number];

export interface NutritionAssessmentRecord {
  id: string;
  tenantId: string;
  patientId: string;
  assessedByStaffId: string;
  referralId?: string | null;
  assessedAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  weightChangeSinceSurgeryKg?: number | null;
  appetiteScore?: number | null;
  intakeNotes?: string | null;
  giSymptoms?: string | null;
  enzymeRequirement: boolean;
  notes?: string | null;
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

export interface CreateNutritionAssessmentInput {
  patientId: string;
  referralId?: string;
  weightKg?: number;
  heightCm?: number;
  weightChangeSinceSurgeryKg?: number;
  appetiteScore?: number;
  intakeNotes?: string;
  giSymptoms?: string;
  enzymeRequirement?: boolean;
  notes?: string;
}

export interface NutritionPlanItemRecord {
  id: string;
  tenantId: string;
  planId: string;
  itemType: NutritionItemType;
  name: string;
  instruction?: string | null;
  timeOfDay: string;
  quantity?: number | null;
  unit?: string | null;
  withMeal: boolean;
  displayOrder: number;
  carePlanTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionPlanRecord {
  id: string;
  tenantId: string;
  patientId: string;
  createdByStaffId: string;
  referralId?: string | null;
  title: string;
  startDate: string;
  endDate?: string | null;
  caloricTargetKcal?: number | null;
  proteinTargetGrams?: number | null;
  fluidTargetMl?: number | null;
  phase: string;
  foodsToAvoid?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: NutritionPlanItemRecord[];
  createdByStaff?: {
    id: string;
    staffType: string;
    title?: string | null;
    membership?: {
      displayName?: string | null;
    };
  };
}

export interface CreateNutritionPlanItemInput {
  itemType: NutritionItemType;
  name: string;
  instruction?: string;
  timeOfDay: string;
  quantity?: number;
  unit?: string;
  withMeal?: boolean;
  displayOrder?: number;
}

export interface CreateNutritionPlanInput {
  patientId: string;
  referralId?: string;
  carePlanId?: string;
  title: string;
  startDate: string;
  endDate?: string;
  caloricTargetKcal?: number;
  proteinTargetGrams?: number;
  fluidTargetMl?: number;
  phase: string;
  foodsToAvoid?: string;
  notes?: string;
  items: CreateNutritionPlanItemInput[];
  syncToCarePlan?: boolean;
}
