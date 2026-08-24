export type EducationContentType = "VIDEO" | "DOCUMENT" | "ARTICLE";

export interface EducationComprehensionQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface EducationContentItem {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  category: string;
  contentType: EducationContentType;
  url?: string | null;
  documentId?: string | null;
  durationSeconds?: number | null;
  language: string;
  isActive: boolean;
  displayOrder: number;
  hasComprehensionCheck: boolean;
  comprehensionQuestions?: EducationComprehensionQuestion[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEducationContentInput {
  title: string;
  description?: string;
  category: string;
  contentType?: EducationContentType;
  url?: string;
  documentId?: string;
  durationSeconds?: number;
  language?: string;
  isActive?: boolean;
  displayOrder?: number;
  hasComprehensionCheck?: boolean;
  comprehensionQuestions?: EducationComprehensionQuestion[];
}

export interface UpdateEducationContentInput {
  title?: string;
  description?: string;
  category?: string;
  contentType?: EducationContentType;
  url?: string;
  documentId?: string;
  durationSeconds?: number;
  language?: string;
  isActive?: boolean;
  displayOrder?: number;
  hasComprehensionCheck?: boolean;
  comprehensionQuestions?: EducationComprehensionQuestion[];
}

export interface EducationCompletionSummary {
  id: string;
  completedAt: string;
  completedByIdentityId: string;
  completedByName?: string;
  watchedSeconds?: number | null;
  comprehensionPassed?: boolean | null;
  comprehensionScore?: number | null;
}

export interface EducationAssignmentItem {
  id: string;
  tenantId: string;
  patientId: string;
  patientName?: string;
  patientNumber?: string;
  contentId: string;
  content: EducationContentItem;
  assignedByMembershipId?: string | null;
  assignedByName?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  carePlanTaskId?: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
  isPreOp: boolean;
  completion?: EducationCompletionSummary | null;
  createdAt: string;
}

export interface AssignEducationInput {
  patientId: string;
  contentId: string;
  dueDate?: string;
  carePlanTaskId?: string;
}

export interface CompleteEducationInput {
  assignmentId: string;
  watchedSeconds?: number;
  selectedAnswers?: Record<string, number>;
}

export interface PatientEducationLibrary {
  assigned: EducationAssignmentItem[];
  available: EducationContentItem[];
  selectedLanguage: string;
}

export interface ClinicianEducationComplianceSummary {
  totalAssigned: number;
  completedCount: number;
  outstandingCount: number;
  overdueCount: number;
  overduePreOpCount: number;
  complianceRatePercentage: number;
  urgentPendingAssignments: EducationAssignmentItem[];
  allAssignments: EducationAssignmentItem[];
}
