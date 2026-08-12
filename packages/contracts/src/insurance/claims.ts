import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";
import type {
  CurrencyCode,
  MoneyAmount,
} from "../finance/billing";

export type InsurancePayerType =
  | "insurance-company"
  | "third-party-administrator"
  | "government-program"
  | "corporate-health-plan"
  | "charity-program"
  | "international-assistance"
  | "other";

export type InsuranceCoverageType =
  | "primary"
  | "secondary"
  | "tertiary"
  | "supplemental"
  | "corporate"
  | "government"
  | "travel"
  | "other";

export type InsuranceCoverageStatus =
  | "draft"
  | "pending-verification"
  | "active"
  | "inactive"
  | "expired"
  | "suspended"
  | "cancelled"
  | "entered-in-error";

export type InsuranceMemberRelationship =
  | "self"
  | "spouse"
  | "child"
  | "parent"
  | "guardian"
  | "employee"
  | "dependent"
  | "other";

export type InsuranceEligibilityRequestStatus =
  | "draft"
  | "queued"
  | "sent"
  | "awaiting-response"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type InsuranceEligibilityResult =
  | "eligible"
  | "partially-eligible"
  | "not-eligible"
  | "coverage-inactive"
  | "coverage-expired"
  | "member-not-found"
  | "payer-unavailable"
  | "manual-review-required"
  | "unknown";

export type InsuranceBenefitType =
  | "consultation"
  | "emergency"
  | "inpatient"
  | "day-care"
  | "laboratory"
  | "radiology"
  | "pharmacy"
  | "procedure"
  | "surgery"
  | "maternity"
  | "dental"
  | "mental-health"
  | "physiotherapy"
  | "home-care"
  | "telemedicine"
  | "preventive-care"
  | "other";

export type InsuranceBenefitLimitPeriod =
  | "per-visit"
  | "per-day"
  | "per-admission"
  | "per-procedure"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "lifetime"
  | "none";

export type InsuranceAuthorizationStatus =
  | "draft"
  | "ready-for-submission"
  | "submitted"
  | "acknowledged"
  | "additional-information-required"
  | "in-review"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "withdrawn"
  | "entered-in-error";

export type InsuranceAuthorizationDecision =
  | "approved"
  | "partially-approved"
  | "rejected"
  | "additional-information-required"
  | "not-required";

export type InsuranceAuthorizationServiceStatus =
  | "requested"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "used"
  | "partially-used"
  | "expired"
  | "cancelled";

export type InsuranceClaimType =
  | "professional"
  | "facility"
  | "inpatient"
  | "outpatient"
  | "pharmacy"
  | "diagnostic"
  | "dental"
  | "combined"
  | "corrected"
  | "replacement"
  | "void"
  | "other";

export type InsuranceClaimStatus =
  | "draft"
  | "ready-for-validation"
  | "validation-failed"
  | "validated"
  | "ready-for-submission"
  | "submitted"
  | "acknowledged"
  | "rejected-at-submission"
  | "in-review"
  | "additional-information-required"
  | "partially-adjudicated"
  | "adjudicated"
  | "partially-denied"
  | "denied"
  | "partially-paid"
  | "paid"
  | "appealed"
  | "corrected"
  | "resubmitted"
  | "cancelled"
  | "voided"
  | "closed"
  | "entered-in-error";

export type InsuranceClaimLineStatus =
  | "draft"
  | "validated"
  | "submitted"
  | "in-review"
  | "approved"
  | "partially-approved"
  | "denied"
  | "paid"
  | "partially-paid"
  | "corrected"
  | "cancelled"
  | "voided"
  | "entered-in-error";

export type InsuranceClaimSubmissionChannel =
  | "electronic"
  | "payer-portal"
  | "clearinghouse"
  | "secure-email"
  | "physical"
  | "api"
  | "manual"
  | "other";

export type InsuranceClaimValidationIssueType =
  | "missing-patient-information"
  | "missing-coverage"
  | "coverage-inactive"
  | "coverage-expired"
  | "member-mismatch"
  | "missing-authorization"
  | "authorization-expired"
  | "authorization-limit-exceeded"
  | "invalid-service-code"
  | "invalid-diagnosis-code"
  | "missing-diagnosis"
  | "invalid-provider"
  | "provider-not-credentialed"
  | "duplicate-claim"
  | "duplicate-service"
  | "invalid-quantity"
  | "invalid-price"
  | "missing-document"
  | "date-outside-coverage"
  | "timely-filing-risk"
  | "payer-rule-failed"
  | "other";

export type InsuranceClaimValidationSeverity =
  | "information"
  | "warning"
  | "blocking";

export type InsuranceClaimValidationIssueStatus =
  | "open"
  | "acknowledged"
  | "resolved"
  | "overridden"
  | "not-applicable";

export type InsuranceAdjudicationDecision =
  | "approved"
  | "partially-approved"
  | "denied"
  | "pending-information"
  | "duplicate"
  | "not-covered"
  | "bundled"
  | "other";

export type InsuranceAdjustmentCategory =
  | "contractual"
  | "patient-responsibility"
  | "deductible"
  | "copayment"
  | "coinsurance"
  | "non-covered"
  | "authorization"
  | "duplicate"
  | "coding"
  | "medical-necessity"
  | "timely-filing"
  | "payer-policy"
  | "other";

export type InsuranceRemittanceStatus =
  | "received"
  | "parsing"
  | "matched"
  | "partially-matched"
  | "unmatched"
  | "posted"
  | "partially-posted"
  | "rejected"
  | "entered-in-error";

export type InsuranceClaimPaymentStatus =
  | "pending"
  | "received"
  | "partially-allocated"
  | "allocated"
  | "reversed"
  | "cancelled";

export type InsuranceDenialCategory =
  | "eligibility"
  | "authorization"
  | "medical-necessity"
  | "coding"
  | "documentation"
  | "duplicate"
  | "timely-filing"
  | "provider-credentialing"
  | "coverage-exclusion"
  | "benefit-limit"
  | "coordination-of-benefits"
  | "incorrect-patient-information"
  | "incorrect-payer"
  | "missing-referral"
  | "bundling"
  | "payment-policy"
  | "other";

export type InsuranceDenialStatus =
  | "identified"
  | "under-review"
  | "information-requested"
  | "correction-required"
  | "ready-for-resubmission"
  | "resubmitted"
  | "appeal-required"
  | "appealed"
  | "overturned"
  | "upheld"
  | "accepted"
  | "written-off"
  | "closed";

export type InsuranceAppealStatus =
  | "draft"
  | "under-preparation"
  | "ready-for-submission"
  | "submitted"
  | "acknowledged"
  | "additional-information-required"
  | "in-review"
  | "approved"
  | "partially-approved"
  | "rejected"
  | "withdrawn"
  | "expired"
  | "closed";

export type InsuranceEventType =
  | "payer-created"
  | "coverage-created"
  | "coverage-verified"
  | "coverage-expired"
  | "eligibility-requested"
  | "eligibility-completed"
  | "authorization-created"
  | "authorization-submitted"
  | "authorization-approved"
  | "authorization-rejected"
  | "claim-created"
  | "claim-validated"
  | "claim-validation-failed"
  | "claim-submitted"
  | "claim-acknowledged"
  | "claim-rejected"
  | "claim-adjudicated"
  | "remittance-received"
  | "remittance-posted"
  | "claim-payment-received"
  | "denial-created"
  | "denial-corrected"
  | "claim-resubmitted"
  | "appeal-created"
  | "appeal-submitted"
  | "appeal-approved"
  | "appeal-rejected"
  | "claim-closed"
  | "entered-in-error";

export interface InsurancePayer {
  id: WonFlowId;

  organizationId: WonFlowId;

  payerCode: string;
  name: string;
  type: InsurancePayerType;

  registrationNumber?: string;
  taxNumber?: string;

  website?: string;
  phoneNumber?: string;
  emailAddress?: string;

  claimsSubmissionChannel: InsuranceClaimSubmissionChannel;
  electronicPayerIdentifier?: string;

  defaultCurrencyCode: CurrencyCode;

  authorizationRequiredByDefault: boolean;
  eligibilityVerificationSupported: boolean;
  electronicClaimsSupported: boolean;
  electronicRemittanceSupported: boolean;

  defaultTimelyFilingDays?: number;
  defaultAppealDeadlineDays?: number;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsurancePlan {
  id: WonFlowId;

  organizationId: WonFlowId;
  payerId: WonFlowId;

  planCode: string;
  name: string;

  coverageType:
    | "individual"
    | "family"
    | "employee"
    | "corporate"
    | "government"
    | "group"
    | "other";

  networkType?:
    | "open"
    | "restricted"
    | "preferred-provider"
    | "closed-panel"
    | "other";

  defaultCurrencyCode: CurrencyCode;

  effectiveFrom: string;
  effectiveTo?: string;

  requiresReferral: boolean;
  requiresPrimaryCareProvider: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceCoverage {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  payerId: WonFlowId;
  planId?: WonFlowId;

  type: InsuranceCoverageType;
  status: InsuranceCoverageStatus;

  memberNumber: string;
  policyNumber?: string;
  groupNumber?: string;

  memberRelationship: InsuranceMemberRelationship;

  subscriberPatientId?: WonFlowId;
  subscriberName?: string;
  subscriberDateOfBirth?: string;

  coverageStartsOn: string;
  coverageEndsOn?: string;

  branchRestrictions: WonFlowId[];
  providerNetworkCode?: string;

  primaryCoverage: boolean;
  coordinationOrder: number;

  cardFrontDocumentId?: WonFlowId;
  cardBackDocumentId?: WonFlowId;
  policyDocumentIds: WonFlowId[];

  lastVerifiedAt?: IsoDateTime;
  verifiedByUserId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceEligibilityRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  coverageId: WonFlowId;
  payerId: WonFlowId;

  branchId: WonFlowId;

  appointmentId?: WonFlowId;
  encounterId?: WonFlowId;

  serviceDate: string;
  requestedBenefitTypes: InsuranceBenefitType[];
  requestedServiceCodes: string[];

  status: InsuranceEligibilityRequestStatus;

  idempotencyKey: string;

  requestedByUserId?: WonFlowId;
  requestedBySystem: boolean;
  requestedAt: IsoDateTime;

  sentAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  expiresAt?: IsoDateTime;

  failureReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceEligibilityResponse {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  eligibilityRequestId: WonFlowId;
  coverageId: WonFlowId;
  payerId: WonFlowId;

  result: InsuranceEligibilityResult;

  payerResponseReference?: string;

  memberMatched: boolean;
  coverageActive: boolean;

  coverageStartsOn?: string;
  coverageEndsOn?: string;

  planName?: string;
  networkStatus?:
    | "in-network"
    | "out-of-network"
    | "unknown";

  authorizationRequired: boolean;
  referralRequired: boolean;

  responseMessage?: string;
  rawResponseDocumentId?: WonFlowId;

  receivedAt: IsoDateTime;
  validUntil?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface InsuranceBenefit {
  id: WonFlowId;

  organizationId: WonFlowId;

  eligibilityResponseId?: WonFlowId;
  coverageId: WonFlowId;

  type: InsuranceBenefitType;

  serviceCode?: string;
  serviceCategoryCode?: string;

  covered: boolean;

  networkStatus?:
    | "in-network"
    | "out-of-network"
    | "both"
    | "unknown";

  authorizationRequired: boolean;
  referralRequired: boolean;

  coveragePercentageBasisPoints?: number;

  copaymentAmount?: MoneyAmount;
  deductibleAmount?: MoneyAmount;
  remainingDeductibleAmount?: MoneyAmount;

  limitAmount?: MoneyAmount;
  remainingLimitAmount?: MoneyAmount;

  maximumVisits?: number;
  remainingVisits?: number;

  limitPeriod: InsuranceBenefitLimitPeriod;

  exclusionReason?: string;
  notes?: string;

  effectiveFrom?: string;
  effectiveTo?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceAuthorizationRequest {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  coverageId: WonFlowId;
  payerId: WonFlowId;
  planId?: WonFlowId;

  branchId: WonFlowId;

  encounterId?: WonFlowId;
  appointmentId?: WonFlowId;
  admissionId?: WonFlowId;
  procedureId?: WonFlowId;
  laboratoryOrderId?: WonFlowId;
  radiologyOrderId?: WonFlowId;

  /**
   * Example:
   * AUTH-2026-000481
   */
  authorizationRequestNumber: string;

  status: InsuranceAuthorizationStatus;

  requestingPractitionerId?: WonFlowId;
  requestedByUserId: WonFlowId;

  clinicalIndication: string;
  diagnosisCodes: string[];

  requestedStartDate: string;
  requestedEndDate?: string;

  requestedAmount?: MoneyAmount;

  supportingDocumentIds: WonFlowId[];

  payerAuthorizationReference?: string;

  submittedAt?: IsoDateTime;
  acknowledgedAt?: IsoDateTime;
  decidedAt?: IsoDateTime;
  expiresAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceAuthorizationService {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  authorizationRequestId: WonFlowId;

  serviceCode: string;
  serviceDisplayName: string;

  status: InsuranceAuthorizationServiceStatus;

  requestedQuantity: number;
  approvedQuantity?: number;
  usedQuantity: number;

  requestedAmount?: MoneyAmount;
  approvedAmount?: MoneyAmount;
  usedAmount?: MoneyAmount;

  requestedStartDate: string;
  requestedEndDate?: string;

  approvedStartDate?: string;
  approvedEndDate?: string;

  denialReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceAuthorizationDecisionRecord {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  authorizationRequestId: WonFlowId;

  decision: InsuranceAuthorizationDecision;

  payerAuthorizationReference?: string;

  approvedAmount?: MoneyAmount;
  approvedStartDate?: string;
  approvedEndDate?: string;

  conditions?: string;
  denialReason?: string;

  decisionDocumentId?: WonFlowId;

  receivedByUserId?: WonFlowId;
  receivedBySystem: boolean;
  receivedAt: IsoDateTime;
}

export interface InsuranceClaim {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  payerId: WonFlowId;
  planId?: WonFlowId;
  coverageId: WonFlowId;

  billingAccountId: WonFlowId;
  invoiceId: WonFlowId;

  branchId: WonFlowId;

  encounterId?: WonFlowId;
  admissionId?: WonFlowId;
  appointmentId?: WonFlowId;

  /**
   * Example:
   * CLM-2026-000481
   */
  claimNumber: string;

  type: InsuranceClaimType;
  status: InsuranceClaimStatus;

  versionNumber: number;

  originalClaimId?: WonFlowId;
  replacesClaimId?: WonFlowId;
  replacedByClaimId?: WonFlowId;

  payerClaimReference?: string;

  serviceFromDate: string;
  serviceToDate: string;

  currencyCode: CurrencyCode;

  totalBilledAmount: MoneyAmount;
  totalApprovedAmount: MoneyAmount;
  totalPaidAmount: MoneyAmount;
  totalPatientResponsibilityAmount: MoneyAmount;
  totalAdjustmentAmount: MoneyAmount;
  totalDeniedAmount: MoneyAmount;

  diagnosisCodes: string[];

  renderingPractitionerId?: WonFlowId;
  referringPractitionerId?: WonFlowId;
  supervisingPractitionerId?: WonFlowId;

  authorizationRequestIds: WonFlowId[];

  submissionDeadlineAt?: IsoDateTime;

  preparedByUserId?: WonFlowId;
  validatedByUserId?: WonFlowId;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimLine {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  claimId: WonFlowId;

  invoiceLineItemId: WonFlowId;
  chargeItemId?: WonFlowId;

  sequenceNumber: number;

  serviceCode: string;
  serviceDisplayName: string;

  serviceDate: string;

  quantity: number;

  billedAmount: MoneyAmount;
  approvedAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  patientResponsibilityAmount: MoneyAmount;
  adjustmentAmount: MoneyAmount;
  deniedAmount: MoneyAmount;

  diagnosisCodes: string[];

  authorizationRequestId?: WonFlowId;
  authorizationServiceId?: WonFlowId;

  renderingPractitionerId?: WonFlowId;

  status: InsuranceClaimLineStatus;

  denialReasonCodes: string[];
  adjustmentReasonCodes: string[];

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimValidationIssue {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  claimId: WonFlowId;
  claimLineId?: WonFlowId;

  type: InsuranceClaimValidationIssueType;
  severity: InsuranceClaimValidationSeverity;
  status: InsuranceClaimValidationIssueStatus;

  title: string;
  description: string;

  resolutionRecommendation?: string;

  createdByUserId?: WonFlowId;
  createdBySystem: boolean;

  resolvedByUserId?: WonFlowId;
  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  overriddenByUserId?: WonFlowId;
  overriddenAt?: IsoDateTime;
  overrideReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimSubmission {
  id: WonFlowId;

  organizationId: WonFlowId;

  claimId: WonFlowId;
  payerId: WonFlowId;

  submissionNumber: number;
  channel: InsuranceClaimSubmissionChannel;

  submissionReference?: string;
  clearinghouseReference?: string;
  payerReference?: string;

  status:
    | "queued"
    | "submitted"
    | "acknowledged"
    | "accepted"
    | "rejected"
    | "failed"
    | "cancelled";

  submittedDocumentId?: WonFlowId;
  acknowledgementDocumentId?: WonFlowId;

  submittedByUserId?: WonFlowId;
  submittedBySystem: boolean;

  queuedAt: IsoDateTime;
  submittedAt?: IsoDateTime;
  acknowledgedAt?: IsoDateTime;

  failureReason?: string;
  rejectionReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimAdjudication {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  claimId: WonFlowId;
  payerId: WonFlowId;

  decision: InsuranceAdjudicationDecision;

  payerClaimReference?: string;
  remittanceId?: WonFlowId;

  billedAmount: MoneyAmount;
  approvedAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  patientResponsibilityAmount: MoneyAmount;
  adjustmentAmount: MoneyAmount;
  deniedAmount: MoneyAmount;

  decisionReasonCodes: string[];

  adjudicatedAt: IsoDateTime;
  receivedAt: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface InsuranceClaimLineAdjudication {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  adjudicationId: WonFlowId;
  claimId: WonFlowId;
  claimLineId: WonFlowId;

  decision: InsuranceAdjudicationDecision;

  billedAmount: MoneyAmount;
  approvedAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  patientResponsibilityAmount: MoneyAmount;
  adjustmentAmount: MoneyAmount;
  deniedAmount: MoneyAmount;

  adjustmentCategories: InsuranceAdjustmentCategory[];
  reasonCodes: string[];

  serviceCode?: string;

  createdAt: IsoDateTime;
}

export interface InsuranceRemittance {
  id: WonFlowId;

  organizationId: WonFlowId;
  payerId: WonFlowId;

  /**
   * Example:
   * REM-2026-000481
   */
  remittanceNumber: string;

  payerRemittanceReference?: string;

  status: InsuranceRemittanceStatus;

  currencyCode: CurrencyCode;

  totalPaymentAmount: MoneyAmount;
  totalAdjustmentAmount: MoneyAmount;

  paymentDate?: string;
  paymentReference?: string;

  sourceDocumentId?: WonFlowId;

  receivedByUserId?: WonFlowId;
  receivedBySystem: boolean;
  receivedAt: IsoDateTime;

  postedByUserId?: WonFlowId;
  postedAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceRemittanceClaim {
  id: WonFlowId;

  organizationId: WonFlowId;

  remittanceId: WonFlowId;

  claimId?: WonFlowId;
  payerClaimReference?: string;

  matched: boolean;
  manuallyMatched: boolean;

  billedAmount: MoneyAmount;
  approvedAmount: MoneyAmount;
  paidAmount: MoneyAmount;
  patientResponsibilityAmount: MoneyAmount;
  adjustmentAmount: MoneyAmount;
  deniedAmount: MoneyAmount;

  matchNotes?: string;

  matchedByUserId?: WonFlowId;
  matchedAt?: IsoDateTime;

  createdAt: IsoDateTime;
}

export interface InsuranceClaimPayment {
  id: WonFlowId;

  organizationId: WonFlowId;
  payerId: WonFlowId;

  claimId: WonFlowId;
  remittanceId?: WonFlowId;

  billingPaymentTransactionId?: WonFlowId;

  status: InsuranceClaimPaymentStatus;

  amount: MoneyAmount;

  payerPaymentReference?: string;
  bankReference?: string;

  receivedAt: IsoDateTime;

  allocatedByUserId?: WonFlowId;
  allocatedAt?: IsoDateTime;

  reversedAt?: IsoDateTime;
  reversalReason?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimDenial {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  claimId: WonFlowId;
  claimLineId?: WonFlowId;

  category: InsuranceDenialCategory;
  status: InsuranceDenialStatus;

  payerReasonCode?: string;
  payerReasonText?: string;

  denialAmount: MoneyAmount;

  preventable: boolean;
  rootCause?: string;

  correctionRequired: boolean;
  correctedClaimId?: WonFlowId;

  appealRequired: boolean;
  appealDeadlineAt?: IsoDateTime;

  assignedToUserId?: WonFlowId;
  assignedToDepartmentId?: WonFlowId;

  identifiedAt: IsoDateTime;

  resolvedAt?: IsoDateTime;
  resolutionNotes?: string;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceClaimAppeal {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  claimId: WonFlowId;
  denialId: WonFlowId;

  /**
   * Example:
   * APL-2026-000481
   */
  appealNumber: string;

  status: InsuranceAppealStatus;

  appealLevel:
    | "first"
    | "second"
    | "external-review"
    | "legal-review";

  reason: string;
  argumentSummary: string;

  disputedAmount: MoneyAmount;

  supportingDocumentIds: WonFlowId[];

  preparedByUserId: WonFlowId;
  approvedByUserId?: WonFlowId;

  submittedByUserId?: WonFlowId;
  submittedAt?: IsoDateTime;

  payerAppealReference?: string;
  acknowledgementAt?: IsoDateTime;

  decisionAt?: IsoDateTime;
  approvedAmount?: MoneyAmount;
  decisionReason?: string;
  decisionDocumentId?: WonFlowId;

  deadlineAt?: IsoDateTime;

  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InsuranceSupportingDocument {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId: WonFlowId;

  coverageId?: WonFlowId;
  authorizationRequestId?: WonFlowId;
  claimId?: WonFlowId;
  denialId?: WonFlowId;
  appealId?: WonFlowId;

  type:
    | "insurance-card"
    | "policy-document"
    | "referral"
    | "clinical-note"
    | "diagnostic-report"
    | "prescription"
    | "procedure-note"
    | "discharge-summary"
    | "invoice"
    | "authorization-letter"
    | "medical-necessity-letter"
    | "appeal-letter"
    | "identity-document"
    | "other";

  documentId: WonFlowId;

  required: boolean;
  submittedToPayer: boolean;

  submittedAt?: IsoDateTime;

  createdByUserId: WonFlowId;
  createdAt: IsoDateTime;
}

export interface InsuranceEvent {
  id: WonFlowId;

  organizationId: WonFlowId;
  patientId?: WonFlowId;

  payerId?: WonFlowId;
  planId?: WonFlowId;
  coverageId?: WonFlowId;

  eligibilityRequestId?: WonFlowId;
  authorizationRequestId?: WonFlowId;
  claimId?: WonFlowId;
  claimLineId?: WonFlowId;
  remittanceId?: WonFlowId;
  denialId?: WonFlowId;
  appealId?: WonFlowId;

  type: InsuranceEventType;

  previousStatus?: string;
  newStatus?: string;

  amount?: MoneyAmount;
  reason?: string;

  performedByUserId?: WonFlowId;
  performedBySystem: boolean;

  occurredAt: IsoDateTime;
}

export interface InsuranceAggregate {
  payer: InsurancePayer;
  plans: InsurancePlan[];

  coverages: InsuranceCoverage[];

  eligibilityRequests: InsuranceEligibilityRequest[];
  eligibilityResponses: InsuranceEligibilityResponse[];
  benefits: InsuranceBenefit[];

  authorizationRequests: InsuranceAuthorizationRequest[];
  authorizationServices: InsuranceAuthorizationService[];
  authorizationDecisions: InsuranceAuthorizationDecisionRecord[];

  claims: InsuranceClaim[];
  claimLines: InsuranceClaimLine[];
  claimValidationIssues: InsuranceClaimValidationIssue[];
  claimSubmissions: InsuranceClaimSubmission[];

  adjudications: InsuranceClaimAdjudication[];
  claimLineAdjudications: InsuranceClaimLineAdjudication[];

  remittances: InsuranceRemittance[];
  remittanceClaims: InsuranceRemittanceClaim[];
  claimPayments: InsuranceClaimPayment[];

  denials: InsuranceClaimDenial[];
  appeals: InsuranceClaimAppeal[];

  supportingDocuments: InsuranceSupportingDocument[];

  events: InsuranceEvent[];
}

export const WONFLOW_INSURANCE_COVERAGE_STATUS_TRANSITIONS: Record<
  InsuranceCoverageStatus,
  readonly InsuranceCoverageStatus[]
> = {
  draft: [
    "pending-verification",
    "active",
    "cancelled",
    "entered-in-error",
  ],

  "pending-verification": [
    "active",
    "inactive",
    "cancelled",
    "entered-in-error",
  ],

  active: [
    "inactive",
    "expired",
    "suspended",
    "cancelled",
    "entered-in-error",
  ],

  inactive: [
    "active",
    "expired",
    "cancelled",
  ],

  expired: [
    "active",
    "cancelled",
  ],

  suspended: [
    "active",
    "inactive",
    "cancelled",
  ],

  cancelled: [],
  "entered-in-error": [],
};

export const WONFLOW_AUTHORIZATION_STATUS_TRANSITIONS: Record<
  InsuranceAuthorizationStatus,
  readonly InsuranceAuthorizationStatus[]
> = {
  draft: [
    "ready-for-submission",
    "cancelled",
    "entered-in-error",
  ],

  "ready-for-submission": [
    "submitted",
    "cancelled",
    "entered-in-error",
  ],

  submitted: [
    "acknowledged",
    "additional-information-required",
    "in-review",
    "approved",
    "partially-approved",
    "rejected",
    "withdrawn",
  ],

  acknowledged: [
    "additional-information-required",
    "in-review",
    "approved",
    "partially-approved",
    "rejected",
    "withdrawn",
  ],

  "additional-information-required": [
    "submitted",
    "in-review",
    "approved",
    "partially-approved",
    "rejected",
    "withdrawn",
  ],

  "in-review": [
    "additional-information-required",
    "approved",
    "partially-approved",
    "rejected",
    "withdrawn",
  ],

  approved: [
    "expired",
    "cancelled",
  ],

  "partially-approved": [
    "expired",
    "cancelled",
  ],

  rejected: [],
  expired: [],
  cancelled: [],
  withdrawn: [],
  "entered-in-error": [],
};

export const WONFLOW_INSURANCE_CLAIM_STATUS_TRANSITIONS: Record<
  InsuranceClaimStatus,
  readonly InsuranceClaimStatus[]
> = {
  draft: [
    "ready-for-validation",
    "cancelled",
    "entered-in-error",
  ],

  "ready-for-validation": [
    "validation-failed",
    "validated",
    "cancelled",
    "entered-in-error",
  ],

  "validation-failed": [
    "draft",
    "ready-for-validation",
    "cancelled",
    "entered-in-error",
  ],

  validated: [
    "ready-for-submission",
    "cancelled",
  ],

  "ready-for-submission": [
    "submitted",
    "cancelled",
  ],

  submitted: [
    "acknowledged",
    "rejected-at-submission",
    "in-review",
    "additional-information-required",
    "resubmitted",
  ],

  acknowledged: [
    "in-review",
    "additional-information-required",
    "partially-adjudicated",
    "adjudicated",
    "partially-denied",
    "denied",
  ],

  "rejected-at-submission": [
    "corrected",
    "cancelled",
  ],

  "in-review": [
    "additional-information-required",
    "partially-adjudicated",
    "adjudicated",
    "partially-denied",
    "denied",
  ],

  "additional-information-required": [
    "submitted",
    "in-review",
    "corrected",
    "cancelled",
  ],

  "partially-adjudicated": [
    "adjudicated",
    "partially-denied",
    "partially-paid",
    "paid",
  ],

  adjudicated: [
    "partially-paid",
    "paid",
    "partially-denied",
    "denied",
    "closed",
  ],

  "partially-denied": [
    "partially-paid",
    "appealed",
    "corrected",
    "closed",
  ],

  denied: [
    "appealed",
    "corrected",
    "closed",
  ],

  "partially-paid": [
    "paid",
    "appealed",
    "closed",
  ],

  paid: [
    "closed",
  ],

  appealed: [
    "in-review",
    "partially-adjudicated",
    "adjudicated",
    "partially-paid",
    "paid",
    "denied",
    "closed",
  ],

  corrected: [
    "ready-for-validation",
    "ready-for-submission",
    "resubmitted",
  ],

  resubmitted: [
    "acknowledged",
    "rejected-at-submission",
    "in-review",
  ],

  cancelled: [],
  voided: [],
  closed: [],
  "entered-in-error": [],
};

export const WONFLOW_INSURANCE_DENIAL_STATUS_TRANSITIONS: Record<
  InsuranceDenialStatus,
  readonly InsuranceDenialStatus[]
> = {
  identified: [
    "under-review",
    "information-requested",
    "correction-required",
    "appeal-required",
    "accepted",
    "closed",
  ],

  "under-review": [
    "information-requested",
    "correction-required",
    "ready-for-resubmission",
    "appeal-required",
    "accepted",
    "closed",
  ],

  "information-requested": [
    "under-review",
    "correction-required",
    "ready-for-resubmission",
    "appeal-required",
  ],

  "correction-required": [
    "ready-for-resubmission",
    "appeal-required",
    "accepted",
  ],

  "ready-for-resubmission": [
    "resubmitted",
    "appeal-required",
    "accepted",
  ],

  resubmitted: [
    "overturned",
    "upheld",
    "under-review",
  ],

  "appeal-required": [
    "appealed",
    "accepted",
  ],

  appealed: [
    "overturned",
    "upheld",
    "under-review",
  ],

  overturned: [
    "closed",
  ],

  upheld: [
    "appeal-required",
    "accepted",
    "written-off",
    "closed",
  ],

  accepted: [
    "written-off",
    "closed",
  ],

  "written-off": [
    "closed",
  ],

  closed: [],
};

export const WONFLOW_INSURANCE_APPEAL_STATUS_TRANSITIONS: Record<
  InsuranceAppealStatus,
  readonly InsuranceAppealStatus[]
> = {
  draft: [
    "under-preparation",
    "withdrawn",
  ],

  "under-preparation": [
    "ready-for-submission",
    "withdrawn",
    "expired",
  ],

  "ready-for-submission": [
    "submitted",
    "withdrawn",
    "expired",
  ],

  submitted: [
    "acknowledged",
    "additional-information-required",
    "in-review",
    "approved",
    "partially-approved",
    "rejected",
  ],

  acknowledged: [
    "additional-information-required",
    "in-review",
    "approved",
    "partially-approved",
    "rejected",
  ],

  "additional-information-required": [
    "under-preparation",
    "submitted",
    "in-review",
    "rejected",
  ],

  "in-review": [
    "additional-information-required",
    "approved",
    "partially-approved",
    "rejected",
  ],

  approved: [
    "closed",
  ],

  "partially-approved": [
    "closed",
  ],

  rejected: [
    "under-preparation",
    "closed",
  ],

  withdrawn: [],
  expired: [],
  closed: [],
};