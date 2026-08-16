/**
 * Clinical documentation shapes still displayed by a few screens outside
 * this task's scope (patient search, diagnostics, pharmacy). Real
 * consultation documentation — the note, diagnoses, orders and
 * prescriptions — is server-held; see @/lib/api/clinical,
 * clinical-consultation-documentation.tsx and
 * docs/architecture/clinical-encounters.md.
 */

export type DemoClinicalDocumentationStatus =
  | "draft"
  | "completed";

export type DemoClinicalKnowledgeStatus =
  | "unknown"
  | "none-known"
  | "documented";

export type DemoAllergySeverity =
  | "mild"
  | "moderate"
  | "severe"
  | "unknown";

export type DemoDiagnosisType =
  | "provisional"
  | "differential"
  | "confirmed";

export type DemoClinicalOrderType =
  | "laboratory"
  | "radiology"
  | "procedure"
  | "referral";

export type DemoMedicationRoute =
  | "oral"
  | "intravenous"
  | "intramuscular"
  | "subcutaneous"
  | "topical"
  | "inhalation"
  | "sublingual"
  | "rectal"
  | "other";

export interface DemoClinicalAllergy {
  id: string;

  substance: string;
  reaction: string;

  severity:
    DemoAllergySeverity;
}

export interface DemoCurrentMedication {
  id: string;

  medicineName: string;
  dose: string;
  frequency: string;
}

export interface DemoClinicalVitals {
  temperatureCelsius: string;

  pulsePerMinute: string;

  respiratoryRatePerMinute:
    string;

  systolicBloodPressure:
    string;

  diastolicBloodPressure:
    string;

  oxygenSaturationPercent:
    string;

  weightKilograms: string;
  heightCentimeters: string;

  painScore: string;
}

export interface DemoClinicalExamination {
  generalAppearance: string;

  cardiovascular: string;
  respiratory: string;
  abdomen: string;
  neurological: string;

  musculoskeletal: string;
  ent: string;
  skin: string;

  otherFindings: string;
}

export interface DemoClinicalDiagnosis {
  id: string;

  diagnosis: string;
  icdCode: string;

  type:
    DemoDiagnosisType;

  notes: string;
}

export interface DemoClinicalOrder {
  id: string;

  type:
    DemoClinicalOrderType;

  orderName: string;

  priority:
    "routine" |
    "urgent";

  instructions: string;
}

export interface DemoClinicalPrescriptionItem {
  id: string;

  medicineName: string;

  strength: string;
  dosage: string;

  route:
    DemoMedicationRoute;

  frequency: string;
  duration: string;

  quantity: string;

  instructions: string;
}

export interface DemoClinicalDocumentation {
  id: string;

  encounterId: string;
  patientId: string;

  practitionerId: string;
  branchId: string;

  status:
    DemoClinicalDocumentationStatus;

  chiefComplaint: string;

  historyOfPresentIllness:
    string;

  pastMedicalHistory: string;
  pastSurgicalHistory: string;

  familyHistory: string;
  socialHistory: string;

  allergyStatus:
    DemoClinicalKnowledgeStatus;

  allergies:
    DemoClinicalAllergy[];

  currentMedicationStatus:
    DemoClinicalKnowledgeStatus;

  currentMedications:
    DemoCurrentMedication[];

  vitals:
    DemoClinicalVitals;

  examination:
    DemoClinicalExamination;

  diagnoses:
    DemoClinicalDiagnosis[];

  orders:
    DemoClinicalOrder[];

  prescriptions:
    DemoClinicalPrescriptionItem[];

  clinicalAdvice: string;
  followUpPlan: string;

  createdAt: string;
  updatedAt: string;

  completedAt?: string;
}

export interface DemoClinicalDocumentationErrors {
  chiefComplaint?: string;

  historyOfPresentIllness?:
    string;

  allergyStatus?: string;

  currentMedicationStatus?:
    string;

  vitals?: string;

  diagnoses?: string;

  followUpPlan?: string;
}
