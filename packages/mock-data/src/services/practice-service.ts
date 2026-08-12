/**
 * Storage-independent service interface for WonFlow practice workflows.
 *
 * The frontend imports this interface and never reads repository arrays
 * directly. The in-memory implementation and future PostgreSQL
 * implementation must both satisfy this exact boundary.
 */

import type {
  Appointment,
  AppointmentCancellation,
  AppointmentRescheduleEvent,
  AppointmentRescheduleRequest,
  AppointmentStatusEvent,
  AppointmentPriority,
  CalendarDate,
  DoctorConsultationMode,
  IsoDateTime,
  ModuleCode,
  ModuleEntitlement,
  OrganizationModuleActivation,
  OrganizationOwnerAssignment,
  OrganizationOwnerInvitation,
  OrganizationSubscription,
  Patient,
  PatientAccount,
  PatientAccountLink,
  PaymentProviderConfig,
  PlatformControlAction,
  PracticeAppointment,
  PracticeBookingPolicy,
  PracticeBookingChannel,
  PracticeCareTeam,
  PracticeCareTeamAggregate,
  PracticeClinicSession,
  PracticeDocument,
  PracticeDocumentAggregate,
  PracticeLocation,
  PracticeLocationAggregate,
  PracticeMessageCategoryConfig,
  PracticeMessageTriageRule,
  PracticeScheduleOverride,
  PracticeMessageThread,
  PracticeMessageThreadAggregate,
  PracticePaymentAggregate,
  PracticePaymentRecord,
  PracticePatientAssignment,
  PracticePrivilege,
  PracticePrivilegeOverride,
  PracticeService,
  PracticeServiceCatalogue,
  PracticeServiceFeeChange,
  PracticeServiceOffering,
  PracticePaymentIntent,
  PracticeSlot,
  PracticeTeamInvitation,
  PracticeTeamMember,
  PermissionCode,
  SupportAccessAuditEvent,
  SupportAccessSession,
  TenantContentBlock,
  TenantNotificationTemplate,
  TenantOnboardingState,
  TenantOnboardingStepCode,
  TenantProvisioningRequest,
  TenantPolicySettings,
  TenantSettingsAggregate,
  TenantTerminology,
  TenantUsageSnapshot,
  WonFlowId,
} from "@wonflow/contracts";

import type {
  PracticeRepositoryPage,
  PracticeRepositoryQuery,
  PracticeRepositoryScope,
} from "../repositories/practice-repository";

import type {
  WonFlowPracticeResourceMap,
  WonFlowPracticeResourceName,
} from "../repositories/practice-repositories";
import type { WonFlowPatientDocumentService } from "./patient-document-workflow";
import type { WonFlowPracticeClinicalWorkflowService } from "./practice-clinical-workflows";
import type { WonFlowPublicBookingService } from "./public-booking-service";

export type {
  WonFlowPracticeResourceMap,
  WonFlowPracticeResourceName,
} from "../repositories/practice-repositories";

export type PracticeBookingActor =
  | {
      type: "team-member";
      userId: WonFlowId;
      teamMemberId: WonFlowId;
    }
  | {
      type: "patient-account";
      patientAccountId: WonFlowId;
    };

export interface PracticeBookingClinicianOption {
  teamMember: PracticeTeamMember;
  practitionerId: WonFlowId;
}

export interface PracticeBookingOfferingOption {
  location: PracticeLocation;
  service: PracticeService;
  offering: PracticeServiceOffering;
  policy: PracticeBookingPolicy;
  effectiveMinimumBookingNoticeMinutes: number;
  bookingHorizonDays: number;
  consultationModes: DoctorConsultationMode[];
  clinicians: PracticeBookingClinicianOption[];
  paymentProviders: PaymentProviderConfig[];
  requiresPrepayment: boolean;
}

export interface GetPracticeBookingOptionsInput {
  actor: PracticeBookingActor;
  patientId: WonFlowId;
  bookingChannel: Exclude<PracticeBookingChannel, "public-page">;
}

export interface PracticeBookingOptionsView {
  locations: PracticeLocation[];
  offerings: PracticeBookingOfferingOption[];
}

export interface ListPracticeBookingSlotsInput {
  actor: PracticeBookingActor;
  patientId: WonFlowId;
  bookingChannel: Exclude<PracticeBookingChannel, "public-page">;
  practiceLocationId: WonFlowId;
  practiceServiceId: WonFlowId;
  practiceServiceOfferingId: WonFlowId;
  consultationMode: DoctorConsultationMode;
  assignedTeamMemberId?: WonFlowId;
  dateFrom: CalendarDate;
  dateTo: CalendarDate;
}

export interface ConfirmPracticeBookingInput {
  actor: PracticeBookingActor;
  idempotencyKey: string;
  patientId: WonFlowId;
  practiceLocationId: WonFlowId;
  practiceServiceId: WonFlowId;
  practiceServiceOfferingId: WonFlowId;
  practiceSlotId: WonFlowId;
  assignedTeamMemberId?: WonFlowId;
  consultationMode: DoctorConsultationMode;
  bookingChannel: Exclude<PracticeBookingChannel, "public-page">;
  priority: AppointmentPriority;
  reasonForAppointment?: string;
  patientNotes?: string;
  attachedDocumentIds: WonFlowId[];
  paymentProviderConfigId?: WonFlowId;
}

export interface ConfirmPracticeBookingResult {
  appointment: Appointment;
  practiceAppointment: PracticeAppointment;
  slot: PracticeSlot;
  location: PracticeLocation;
  service: PracticeService;
  offering: PracticeServiceOffering;
  policy: PracticeBookingPolicy;
  paymentIntent?: PracticePaymentIntent;
  requiresPrepayment: boolean;
}

export interface PatientAppointmentCancellationConsequence {
  contentBlockId: WonFlowId;
  version: string;
  title?: string;
  body: string;
}

export interface PatientAppointmentActionState {
  canCancel: boolean;
  cancellationKind: "free" | "outside-free-window" | "not-allowed";
  cancellationDeadline?: IsoDateTime;
  cancellationConsequence?: PatientAppointmentCancellationConsequence;
  cancellationUnavailableReason?: string;
  canReschedule: boolean;
  remainingReschedules: number;
  rescheduleUnavailableReason?: string;
  canPayNow: boolean;
  payNowProviders: PaymentProviderConfig[];
  payNowUnavailableReason?: string;
}

export interface PatientAppointmentViewItem {
  appointment: Appointment;
  practiceAppointment: PracticeAppointment;
  location: PracticeLocation;
  service: PracticeService;
  offering: PracticeServiceOffering;
  policy: PracticeBookingPolicy;
  assignedTeamMember?: PracticeTeamMember;
  paymentIntent?: PracticePaymentIntent;
  paymentRecords: PracticePaymentRecord[];
  cancellations: AppointmentCancellation[];
  rescheduleRequests: AppointmentRescheduleRequest[];
  rescheduleHistory: AppointmentRescheduleEvent[];
  statusHistory: AppointmentStatusEvent[];
  actions: PatientAppointmentActionState;
}

export interface PatientAppointmentsView {
  account: PatientAccount;
  accountLink: PatientAccountLink;
  patient: Patient;
  upcoming: PatientAppointmentViewItem[];
  past: PatientAppointmentViewItem[];
}

export interface GetPatientAppointmentsViewInput {
  patientAccountId: WonFlowId;
  patientId: WonFlowId;
}

export interface ListPatientAppointmentRescheduleSlotsInput {
  patientAccountId: WonFlowId;
  patientId: WonFlowId;
  appointmentId: WonFlowId;
  dateFrom: CalendarDate;
  dateTo: CalendarDate;
}

export interface ReschedulePatientPracticeAppointmentInput {
  patientAccountId: WonFlowId;
  patientId: WonFlowId;
  appointmentId: WonFlowId;
  destinationPracticeSlotId: WonFlowId;
  reason?: string;
}

export interface CancelPatientPracticeAppointmentInput {
  patientAccountId: WonFlowId;
  patientId: WonFlowId;
  appointmentId: WonFlowId;
  reasonCode: "patient-request" | "other";
  reason?: string;
  acknowledgeOutsideFreeWindow: boolean;
}

export interface PreparePatientAppointmentPaymentInput {
  patientAccountId: WonFlowId;
  patientId: WonFlowId;
  appointmentId: WonFlowId;
  paymentProviderConfigId: WonFlowId;
}

export interface PreparePatientAppointmentPaymentResult {
  intent: PracticePaymentIntent;
  provider: PaymentProviderConfig;
}

/**
 * Every request carries an explicit tenant boundary.
 */
export type WonFlowOrganizationScope =
  PracticeRepositoryScope;

type ManagedRecordKey =
  | "id"
  | "organizationId"
  | "createdAt"
  | "updatedAt";

/**
 * Fields supplied by a create form or operation.
 *
 * IDs, organization ownership and persistence timestamps are generated
 * by the service implementation.
 *
 * PracticeAppointment has no id field, so its appointmentId remains in
 * the input and becomes its repository key.
 */
export type PracticeCreateInput<
  TRecord,
> = Omit<
  TRecord,
  Extract<
    keyof TRecord,
    ManagedRecordKey
  >
>;

/**
 * Mutable fields accepted by an update operation.
 *
 * IDs, organization ownership and original creation timestamps cannot be
 * changed through this interface.
 */
export type PracticeUpdateInput<
  TRecord,
> = Partial<
  Omit<
    TRecord,
    Extract<
      keyof TRecord,
      ManagedRecordKey
    >
  >
>;

export interface WonFlowPracticeEntityService<
  TRecord,
> {
  list(
    scope: WonFlowOrganizationScope,
    query?: PracticeRepositoryQuery<TRecord>,
    signal?: AbortSignal,
  ): Promise<
    PracticeRepositoryPage<TRecord>
  >;

  get(
    scope: WonFlowOrganizationScope,
    key: WonFlowId,
    signal?: AbortSignal,
  ): Promise<TRecord>;

  create(
    scope: WonFlowOrganizationScope,
    input:
      PracticeCreateInput<TRecord>,
    signal?: AbortSignal,
  ): Promise<TRecord>;

  update(
    scope: WonFlowOrganizationScope,
    key: WonFlowId,
    patch:
      PracticeUpdateInput<TRecord>,
    signal?: AbortSignal,
  ): Promise<TRecord>;
}

export type WonFlowPracticeResourceServices = {
  [TName in WonFlowPracticeResourceName]:
    WonFlowPracticeEntityService<
      WonFlowPracticeResourceMap[TName]
    >;
};

/**
 * Input for atomically creating the first care team and owner member.
 *
 * The service generates both IDs so the circular references can be
 * written consistently.
 */
export interface CreateInitialPracticeCareTeamInput {
  careTeam: Omit<
    PracticeCreateInput<PracticeCareTeam>,
    | "ownerTeamMemberId"
    | "status"
  >;

  ownerMember: Omit<
    PracticeCreateInput<PracticeTeamMember>,
    | "careTeamId"
    | "roleCode"
    | "supervisionLevel"
    | "patientAccessScope"
    | "supervisorTeamMemberId"
    | "privilegeOverrides"
    | "status"
    | "joinedAt"
    | "leftAt"
  >;
}

/**
 * Input accepted by the staff-invitation operation.
 *
 * Token references and lifecycle state are generated by the service.
 */
export type InvitePracticeTeamMemberInput =
  Omit<
    PracticeCreateInput<PracticeTeamInvitation>,
    | "redemptionTokenReference"
    | "status"
    | "acceptedByUserId"
    | "acceptedAt"
    | "revokedByTeamMemberId"
    | "revokedAt"
    | "revocationReason"
  >;

/**
 * Owner-controlled transition within the resumable onboarding workflow.
 */
export type TenantOnboardingTransitionAction =
  | "start"
  | "resume"
  | "complete-step"
  | "skip-step"
  | "complete-onboarding";

export interface TransitionTenantOnboardingInput {
  onboardingStateId:
    WonFlowId;

  actorUserId:
    WonFlowId;

  action:
    TenantOnboardingTransitionAction;

  /**
   * Required for every action except complete-onboarding.
   */
  stepCode?:
    TenantOnboardingStepCode;
}

export type PracticeClinicSessionCandidate =
  PracticeCreateInput<
    PracticeClinicSession
  >;

export type PracticeClinicSessionConflictSeverity =
  | "blocking"
  | "warning";

export type PracticeClinicSessionConflictReason =
  | "same-location-overlap"
  | "cross-location-practitioner-overlap";

export interface PracticeClinicSessionConflict {
  severity:
    PracticeClinicSessionConflictSeverity;

  reason:
    PracticeClinicSessionConflictReason;

  conflictingSessionId:
    WonFlowId;

  conflictingPracticeLocationId:
    WonFlowId;

  practitionerId?:
    WonFlowId;

  weekday:
    PracticeClinicSession["weekday"];

  localStartTime:
    PracticeClinicSession["localStartTime"];

  localEndTime:
    PracticeClinicSession["localEndTime"];
}

export interface SavePracticeClinicSessionInput {
  /**
   * Omit when creating a new session.
   */
  sessionId?: WonFlowId;

  session:
    PracticeClinicSessionCandidate;
}

export interface SavePracticeClinicSessionResult {
  session:
    PracticeClinicSession;

  /**
   * A blocking overlap prevents saving. Returned conflicts therefore
   * contain advisory cross-location warnings only.
   */
  conflicts:
    PracticeClinicSessionConflict[];
}

export interface ArchivePracticeLocationInput {
  practiceLocationId:
    WonFlowId;

  actorUserId:
    WonFlowId;

  reason: string;
}

export interface PracticeLocationManagementView {
  location:
    PracticeLocation;

  clinicSessions:
    PracticeClinicSession[];

  scheduleOverrides:
    PracticeScheduleOverride[];
}

export type PracticeServiceCandidate =
  PracticeCreateInput<
    PracticeService
  >;

export interface SavePracticeServiceInput {
  /**
   * Omit when creating a service.
   */
  serviceId?: WonFlowId;

  service:
    PracticeServiceCandidate;
}

export type PracticeServiceOfferingCandidate =
  PracticeCreateInput<
    PracticeServiceOffering
  >;

export interface SavePracticeServiceOfferingInput {
  /**
   * Omit when creating an offering.
   */
  offeringId?: WonFlowId;

  offering:
    PracticeServiceOfferingCandidate;

  actorUserId:
    WonFlowId;

  /**
   * Required when creating the initial fee or changing an existing fee.
   */
  feeChangeReason?: string;
}

export interface SavePracticeServiceOfferingResult {
  offering:
    PracticeServiceOffering;

  /**
   * Present when this operation appended a fee-history record.
   */
  feeChange?:
    PracticeServiceFeeChange;
}

export interface PracticeServiceManagementView {
  service:
    PracticeService;

  offerings:
    PracticeServiceOffering[];

  feeHistory:
    PracticeServiceFeeChange[];
}

/**
 * Editable fields for an existing practice team member.
 *
 * Care-team ownership, privilege history, membership timestamps and
 * identifiers are controlled by the service.
 */
export type PracticeTeamMemberManagementCandidate =
  Pick<
    PracticeTeamMember,
    | "userId"
    | "practitionerId"
    | "displayName"
    | "roleCode"
    | "supervisionLevel"
    | "patientAccessScope"
    | "supervisorTeamMemberId"
    | "allPracticeLocations"
    | "practiceLocationIds"
    | "independentlyBookable"
    | "status"
  >;

export interface SavePracticeTeamMemberInput {
  teamMemberId: WonFlowId;
  actorTeamMemberId: WonFlowId;
  member: PracticeTeamMemberManagementCandidate;
}

/**
 * Desired currently effective member-level adjustment to a role.
 */
export interface PracticePrivilegeOverrideCandidate {
  privilege: PracticePrivilege;
  effect: PracticePrivilegeOverride["effect"];
  reason: string;
  effectiveTo?: IsoDateTime;
}

export interface ReplacePracticePrivilegeOverridesInput {
  teamMemberId: WonFlowId;
  actorTeamMemberId: WonFlowId;
  overrides: readonly PracticePrivilegeOverrideCandidate[];
}

export interface RevokePracticeTeamInvitationInput {
  invitationId: WonFlowId;
  actorTeamMemberId: WonFlowId;
  reason: string;
}

export interface EndPracticePatientAssignmentInput {
  assignmentId: WonFlowId;
  actorTeamMemberId: WonFlowId;
  reason: string;
}

export type PracticeMessageTriageRuleCandidate =
  Omit<
    PracticeCreateInput<PracticeMessageTriageRule>,
    "createdByTeamMemberId"
  >;

export interface SavePracticeMessageTriageRuleInput {
  /** Omit when creating a new rule. */
  triageRuleId?: WonFlowId;
  actorTeamMemberId: WonFlowId;
  rule: PracticeMessageTriageRuleCandidate;
}

export interface PracticeTeamManagementView {
  team: PracticeCareTeamAggregate;
  locations: PracticeLocation[];
  messageCategories: PracticeMessageCategoryConfig[];
  triageRules: PracticeMessageTriageRule[];
}

export interface PracticePatientAccessView {
  patientId: WonFlowId;
  members: PracticeTeamMember[];

  /** Only assignments granting access at the service timestamp. */
  activeAssignments: PracticePatientAssignment[];
}

export type PracticeBookingPolicyCandidate =
  PracticeCreateInput<PracticeBookingPolicy>;

export interface SavePracticeBookingPolicyInput {
  actorUserId: WonFlowId;
  /** Omit when creating a policy. */
  bookingPolicyId?: WonFlowId;
  policy: PracticeBookingPolicyCandidate;
}

export type TenantPolicySettingsCandidate =
  Omit<
    PracticeCreateInput<TenantPolicySettings>,
    "updatedByUserId"
  >;

export interface SaveTenantPolicySettingsInput {
  actorUserId: WonFlowId;
  settings: TenantPolicySettingsCandidate;
}

/** A content version supplied by the owner. */
export type TenantContentVersionCandidate =
  Omit<
    PracticeCreateInput<TenantContentBlock>,
    "version" | "supersedesContentBlockId" | "createdByUserId"
  >;

export interface CreateTenantContentVersionInput {
  actorUserId: WonFlowId;
  /** Required when replacing an existing version. */
  previousContentBlockId?: WonFlowId;
  content: TenantContentVersionCandidate;
}

export type TenantNotificationTemplateVersionCandidate =
  Omit<
    PracticeCreateInput<TenantNotificationTemplate>,
    "version" | "supersedesTemplateId" | "createdByUserId"
  >;

export interface CreateTenantNotificationTemplateVersionInput {
  actorUserId: WonFlowId;
  /** Required when replacing an existing template version. */
  previousTemplateId?: WonFlowId;
  template: TenantNotificationTemplateVersionCandidate;
}

export type TenantTerminologyCandidate =
  Omit<
    PracticeCreateInput<TenantTerminology>,
    "createdByUserId"
  >;

export interface SaveTenantTerminologyInput {
  actorUserId: WonFlowId;
  /** Omit when creating a terminology override. */
  terminologyId?: WonFlowId;
  terminology: TenantTerminologyCandidate;
}

export interface PracticePolicyContentManagementView {
  settings: TenantSettingsAggregate;
  bookingPolicies: PracticeBookingPolicy[];
}

/**
 * Patient-facing read model assembled inside one tenant boundary.
 */
export interface WonFlowPatientPortalOverview {
  account: PatientAccount;

  accountLinks:
    PatientAccountLink[];

  patient: Patient;

  appointments: Appointment[];

  practiceAppointments:
    PracticeAppointment[];

  documents: PracticeDocument[];

  messageThreads:
    PracticeMessageThread[];

  paymentRecords:
    PracticePaymentRecord[];
}

/**
 * Platform-facing view of one tenant.
 *
 * Platform administrators may control entitlements and lifecycle but do
 * not edit the tenant's clinical setup through this view.
 */
export interface WonFlowPlatformTenantOverview {
  provisioningRequests:
    TenantProvisioningRequest[];

  subscription?:
    OrganizationSubscription;

  ownerAssignments:
    OrganizationOwnerAssignment[];

  ownerInvitations:
    OrganizationOwnerInvitation[];

  onboardingState?:
    TenantOnboardingState;

  moduleActivations:
    OrganizationModuleActivation[];

  moduleEntitlements:
    ModuleEntitlement[];

  supportAccessSessions:
    SupportAccessSession[];

  supportAccessAuditEvents:
    SupportAccessAuditEvent[];

  usageSnapshots:
    TenantUsageSnapshot[];

  controlActions:
    PlatformControlAction[];
}

export interface WonFlowPlatformTenantListItem {
  organizationId: WonFlowId;
  organizationName: string;
  organizationCode: string;
  provisioningStatus: TenantProvisioningRequest["status"];
  subscriptionStatus?: OrganizationSubscription["billingStatus"];
  planTierCode?: string;
  seatCount?: number;
  ownerInvitationStatus?: OrganizationOwnerInvitation["status"];
  onboardingStatus?: TenantOnboardingState["status"];
  activeModuleCount: number;
  latestUsage?: TenantUsageSnapshot;
}

export interface ProvisionPlatformTenantInput {
  actorUserId: WonFlowId;
  organizationName: string;
  organizationCode: string;
  ownerEmail: string;
  intendedOwnerUserId?: WonFlowId;
  planTierCode: string;
  seatCount: number;
  moduleCodes: ModuleCode[];
  ownerInvitationExpiresAt: IsoDateTime;
  reason: string;
}

export interface ProvisionPlatformTenantResult {
  scope: WonFlowOrganizationScope;
  provisioningRequest: TenantProvisioningRequest;
  subscription: OrganizationSubscription;
  ownerInvitation: OrganizationOwnerInvitation;
  moduleEntitlements: ModuleEntitlement[];
  moduleActivations: OrganizationModuleActivation[];
  onboardingState: TenantOnboardingState;
}

export interface SavePlatformSubscriptionInput {
  actorUserId: WonFlowId;
  planTierCode: string;
  seatCount: number;
  billingStatus: OrganizationSubscription["billingStatus"];
  trialStartsAt?: IsoDateTime;
  trialEndsAt?: IsoDateTime;
  currentBillingPeriodStartsAt?: IsoDateTime;
  currentBillingPeriodEndsAt?: IsoDateTime;
  expiresAt?: IsoDateTime;
  reason: string;
}

export interface SetPlatformModuleEntitlementInput {
  actorUserId: WonFlowId;
  moduleCode: ModuleCode;
  entitlementStatus: ModuleEntitlement["status"];
  activationStatus: OrganizationModuleActivation["status"];
  effectiveFrom: IsoDateTime;
  effectiveTo?: IsoDateTime;
  notes?: string;
  reason: string;
}

export interface ExecutePlatformTenantLifecycleActionInput {
  actorUserId: WonFlowId;
  action: "suspend" | "reactivate" | "terminate";
  confirmation: string;
  reason: string;
}

export interface RequestPlatformSupportAccessInput {
  platformUserId: WonFlowId;
  requestedReason: string;
  allowedPermissionCodes: PermissionCode[];
  allowedBranchIds?: WonFlowId[];
  requestedExpiresAt: IsoDateTime;
}

export interface DecidePlatformSupportAccessInput {
  supportAccessSessionId: WonFlowId;
  decisionActorUserId: WonFlowId;
  decision: "approve" | "reject";
  reason: string;
  expiresAt?: IsoDateTime;
}

export interface RevokePlatformSupportAccessInput {
  supportAccessSessionId: WonFlowId;
  actorUserId: WonFlowId;
  confirmation: string;
  reason: string;
}

export interface RecordPlatformSupportAccessUseInput {
  supportAccessSessionId: WonFlowId;
  platformUserId: WonFlowId;
  permissionCode: PermissionCode;
  resourceType: string;
  resourceId?: WonFlowId;
  reason: string;
}

/**
 * Interface consumed by practice, patient and platform-admin screens.
 */
export type WonFlowPracticeService =
  WonFlowPracticeResourceServices & WonFlowPatientDocumentService & WonFlowPracticeClinicalWorkflowService & WonFlowPublicBookingService & {
    getPracticeBookingOptions(
      scope: WonFlowOrganizationScope,
      input: GetPracticeBookingOptionsInput,
      signal?: AbortSignal,
    ): Promise<PracticeBookingOptionsView>;

    listPracticeBookingSlots(
      scope: WonFlowOrganizationScope,
      input: ListPracticeBookingSlotsInput,
      signal?: AbortSignal,
    ): Promise<PracticeSlot[]>;

    confirmPracticeBooking(
      scope: WonFlowOrganizationScope,
      input: ConfirmPracticeBookingInput,
      signal?: AbortSignal,
    ): Promise<ConfirmPracticeBookingResult>;

    getPatientAppointmentsView(
      scope: WonFlowOrganizationScope,
      input: GetPatientAppointmentsViewInput,
      signal?: AbortSignal,
    ): Promise<PatientAppointmentsView>;

    listPatientAppointmentRescheduleSlots(
      scope: WonFlowOrganizationScope,
      input: ListPatientAppointmentRescheduleSlotsInput,
      signal?: AbortSignal,
    ): Promise<PracticeSlot[]>;

    reschedulePatientPracticeAppointment(
      scope: WonFlowOrganizationScope,
      input: ReschedulePatientPracticeAppointmentInput,
      signal?: AbortSignal,
    ): Promise<PatientAppointmentViewItem>;

    cancelPatientPracticeAppointment(
      scope: WonFlowOrganizationScope,
      input: CancelPatientPracticeAppointmentInput,
      signal?: AbortSignal,
    ): Promise<PatientAppointmentViewItem>;

    preparePatientAppointmentPayment(
      scope: WonFlowOrganizationScope,
      input: PreparePatientAppointmentPaymentInput,
      signal?: AbortSignal,
    ): Promise<PreparePatientAppointmentPaymentResult>;

    getTenantSettings(
      scope: WonFlowOrganizationScope,
      signal?: AbortSignal,
    ): Promise<TenantSettingsAggregate>;

    getPracticePolicyContentManagementView(
      scope: WonFlowOrganizationScope,
      actorUserId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticePolicyContentManagementView>;

    savePracticeBookingPolicy(
      scope: WonFlowOrganizationScope,
      input: SavePracticeBookingPolicyInput,
      signal?: AbortSignal,
    ): Promise<PracticeBookingPolicy>;

    saveTenantPolicySettings(
      scope: WonFlowOrganizationScope,
      input: SaveTenantPolicySettingsInput,
      signal?: AbortSignal,
    ): Promise<TenantPolicySettings>;

    createTenantContentVersion(
      scope: WonFlowOrganizationScope,
      input: CreateTenantContentVersionInput,
      signal?: AbortSignal,
    ): Promise<TenantContentBlock>;

    createTenantNotificationTemplateVersion(
      scope: WonFlowOrganizationScope,
      input: CreateTenantNotificationTemplateVersionInput,
      signal?: AbortSignal,
    ): Promise<TenantNotificationTemplate>;

    saveTenantTerminology(
      scope: WonFlowOrganizationScope,
      input: SaveTenantTerminologyInput,
      signal?: AbortSignal,
    ): Promise<TenantTerminology>;

    transitionTenantOnboarding(
      scope: WonFlowOrganizationScope,
      input:
        TransitionTenantOnboardingInput,
      signal?: AbortSignal,
    ): Promise<TenantOnboardingState>;

    getLocationAggregate(
      scope: WonFlowOrganizationScope,
      practiceLocationId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticeLocationAggregate>;

    findPracticeClinicSessionConflicts(
      scope: WonFlowOrganizationScope,
      candidate:
        PracticeClinicSessionCandidate,
      excludeSessionId?: WonFlowId,
      signal?: AbortSignal,
    ): Promise<
      PracticeClinicSessionConflict[]
    >;

    savePracticeClinicSession(
      scope: WonFlowOrganizationScope,
      input:
        SavePracticeClinicSessionInput,
      signal?: AbortSignal,
    ): Promise<
      SavePracticeClinicSessionResult
    >;

    archivePracticeLocation(
      scope: WonFlowOrganizationScope,
      input:
        ArchivePracticeLocationInput,
      signal?: AbortSignal,
    ): Promise<
      PracticeLocationManagementView
    >;

    getServiceCatalogue(
      scope: WonFlowOrganizationScope,
      signal?: AbortSignal,
    ): Promise<PracticeServiceCatalogue>;

    getPracticeServiceManagementView(
      scope: WonFlowOrganizationScope,
      practiceServiceId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<
      PracticeServiceManagementView
    >;

    savePracticeService(
      scope: WonFlowOrganizationScope,
      input:
        SavePracticeServiceInput,
      signal?: AbortSignal,
    ): Promise<PracticeService>;

    savePracticeServiceOffering(
      scope: WonFlowOrganizationScope,
      input:
        SavePracticeServiceOfferingInput,
      signal?: AbortSignal,
    ): Promise<
      SavePracticeServiceOfferingResult
    >;

    createInitialPracticeCareTeam(
      scope: WonFlowOrganizationScope,
      input:
        CreateInitialPracticeCareTeamInput,
      signal?: AbortSignal,
    ): Promise<PracticeCareTeamAggregate>;

    invitePracticeTeamMember(
      scope: WonFlowOrganizationScope,
      input:
        InvitePracticeTeamMemberInput,
      signal?: AbortSignal,
    ): Promise<PracticeTeamInvitation>;

    getPracticeTeamManagementView(
      scope: WonFlowOrganizationScope,
      careTeamId: WonFlowId,
      actorTeamMemberId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticeTeamManagementView>;

    savePracticeTeamMember(
      scope: WonFlowOrganizationScope,
      input: SavePracticeTeamMemberInput,
      signal?: AbortSignal,
    ): Promise<PracticeTeamMember>;

    replacePracticePrivilegeOverrides(
      scope: WonFlowOrganizationScope,
      input: ReplacePracticePrivilegeOverridesInput,
      signal?: AbortSignal,
    ): Promise<PracticeTeamMember>;

    revokePracticeTeamInvitation(
      scope: WonFlowOrganizationScope,
      input: RevokePracticeTeamInvitationInput,
      signal?: AbortSignal,
    ): Promise<PracticeTeamInvitation>;

    getPracticePatientAccessView(
      scope: WonFlowOrganizationScope,
      careTeamId: WonFlowId,
      patientId: WonFlowId,
      actorTeamMemberId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticePatientAccessView>;

    endPracticePatientAssignment(
      scope: WonFlowOrganizationScope,
      input: EndPracticePatientAssignmentInput,
      signal?: AbortSignal,
    ): Promise<PracticePatientAssignment>;

    savePracticeMessageTriageRule(
      scope: WonFlowOrganizationScope,
      input: SavePracticeMessageTriageRuleInput,
      signal?: AbortSignal,
    ): Promise<PracticeMessageTriageRule>;

    getCareTeamAggregate(
      scope: WonFlowOrganizationScope,
      careTeamId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticeCareTeamAggregate>;

    resolveTeamMemberPrivileges(
      scope: WonFlowOrganizationScope,
      teamMemberId: WonFlowId,
      at: IsoDateTime,
      signal?: AbortSignal,
    ): Promise<PracticePrivilege[]>;

    getDocumentAggregate(
      scope: WonFlowOrganizationScope,
      practiceDocumentId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticeDocumentAggregate>;

    getMessageThreadAggregate(
      scope: WonFlowOrganizationScope,
      threadId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<PracticeMessageThreadAggregate>;

    getPaymentAggregate(
      scope: WonFlowOrganizationScope,
      signal?: AbortSignal,
    ): Promise<PracticePaymentAggregate>;

    getPatientPortalOverview(
      scope: WonFlowOrganizationScope,
      patientAccountId: WonFlowId,
      patientId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<WonFlowPatientPortalOverview>;

    getPlatformTenantOverview(
      scope: WonFlowOrganizationScope,
      signal?: AbortSignal,
    ): Promise<WonFlowPlatformTenantOverview>;

    listPlatformTenants(
      actorUserId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<WonFlowPlatformTenantListItem[]>;

    provisionPlatformTenant(
      input: ProvisionPlatformTenantInput,
      signal?: AbortSignal,
    ): Promise<ProvisionPlatformTenantResult>;

    savePlatformTenantSubscription(
      scope: WonFlowOrganizationScope,
      input: SavePlatformSubscriptionInput,
      signal?: AbortSignal,
    ): Promise<OrganizationSubscription>;

    setPlatformTenantModuleEntitlement(
      scope: WonFlowOrganizationScope,
      input: SetPlatformModuleEntitlementInput,
      signal?: AbortSignal,
    ): Promise<{
      entitlement: ModuleEntitlement;
      activation: OrganizationModuleActivation;
      action: PlatformControlAction;
    }>;

    executePlatformTenantLifecycleAction(
      scope: WonFlowOrganizationScope,
      input: ExecutePlatformTenantLifecycleActionInput,
      signal?: AbortSignal,
    ): Promise<WonFlowPlatformTenantOverview>;

    requestPlatformSupportAccess(
      scope: WonFlowOrganizationScope,
      input: RequestPlatformSupportAccessInput,
      signal?: AbortSignal,
    ): Promise<SupportAccessSession>;

    decidePlatformSupportAccess(
      scope: WonFlowOrganizationScope,
      input: DecidePlatformSupportAccessInput,
      signal?: AbortSignal,
    ): Promise<SupportAccessSession>;

    activatePlatformSupportAccess(
      scope: WonFlowOrganizationScope,
      supportAccessSessionId: WonFlowId,
      actorUserId: WonFlowId,
      signal?: AbortSignal,
    ): Promise<SupportAccessSession>;

    revokePlatformSupportAccess(
      scope: WonFlowOrganizationScope,
      input: RevokePlatformSupportAccessInput,
      signal?: AbortSignal,
    ): Promise<SupportAccessSession>;

    recordPlatformSupportAccessUse(
      scope: WonFlowOrganizationScope,
      input: RecordPlatformSupportAccessUseInput,
      signal?: AbortSignal,
    ): Promise<SupportAccessAuditEvent>;
  };
