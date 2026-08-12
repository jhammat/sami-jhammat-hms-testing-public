/**
 * Typed repository collection for the WonFlow practice service.
 *
 * Repositories start empty. P1-15 must populate them through the public
 * service operations rather than passing preconstructed tenant arrays
 * into this factory.
 */

import type {
  Appointment,
  AppointmentCancellation,
  AppointmentRescheduleEvent,
  AppointmentRescheduleRequest,
  AppointmentStatusEvent,
  ModuleEntitlement,
  OrganizationModuleActivation,
  OrganizationOwnerAssignment,
  OrganizationOwnerInvitation,
  OrganizationSubscription,
  Patient,
  PatientAccount,
  PatientAccountInvitation,
  PatientAccountLink,
  PatientAddress,
  PatientConsentRecord,
  PatientContactPreference,
  PatientDeviceRegistration,
  PatientIdentifier,
  PaymentProviderConfig,
  PlatformControlAction,
  PracticeAppointment,
  PracticeBookingPolicy,
  PracticeCareTeam,
  PracticeClinicSession,
  PracticeClinicalSignature,
  PracticeDocument,
  PracticeDocumentAccessEvent,
  PracticeDocumentFile,
  PracticeDocumentRelease,
  PracticeDocumentRequest,
  PracticeDocumentReview,
  PracticeLocation,
  PracticeMessage,
  PracticeMessageCategoryConfig,
  PracticeMessageEscalation,
  PracticeMessageSafetyNotice,
  PracticeMessageThread,
  PracticeMessageTriageRule,
  PracticePatientAssignment,
  PracticePaymentIntent,
  PracticePaymentRecord,
  PracticeReceipt,
  PracticeReceiptTemplate,
  PracticeRefund,
  PracticeScheduleOverride,
  PracticeService,
  PracticeServiceFeeChange,
  PracticeServiceOffering,
  PracticeSlot,
  PracticeTeamInvitation,
  PracticeTeamMember,
  PracticeTransferProof,
  SupportAccessAuditEvent,
  SupportAccessSession,
  TenantContentBlock,
  TenantNotificationTemplate,
  TenantOnboardingState,
  TenantPolicySettings,
  TenantProfile,
  TenantProvisioningRequest,
  TenantTerminology,
  TenantUsageSnapshot,
} from "@wonflow/contracts";

import {
  InMemoryPracticeRepository,
} from "./practice-repository";

/**
 * Exact resource names exposed by the practice service.
 */
export interface WonFlowPracticeResourceMap {
  tenantProfiles:
    TenantProfile;

  tenantPolicySettings:
    TenantPolicySettings;

  tenantContentBlocks:
    TenantContentBlock;

  tenantNotificationTemplates:
    TenantNotificationTemplate;

  tenantTerminology:
    TenantTerminology;

  practiceLocations:
    PracticeLocation;

  clinicSessions:
    PracticeClinicSession;

  scheduleOverrides:
    PracticeScheduleOverride;

  practiceServices:
    PracticeService;

  serviceOfferings:
    PracticeServiceOffering;

  serviceFeeChanges:
    PracticeServiceFeeChange;

  patients:
    Patient;

  patientIdentifiers:
    PatientIdentifier;

  patientAddresses:
    PatientAddress;

  appointments:
    Appointment;

  practiceAppointments:
    PracticeAppointment;

  appointmentStatusEvents:
    AppointmentStatusEvent;

  appointmentCancellations:
    AppointmentCancellation;

  appointmentRescheduleRequests:
    AppointmentRescheduleRequest;

  appointmentRescheduleEvents:
    AppointmentRescheduleEvent;

  practiceSlots:
    PracticeSlot;

  bookingPolicies:
    PracticeBookingPolicy;

  practiceDocuments:
    PracticeDocument;

  documentFiles:
    PracticeDocumentFile;

  documentReviews:
    PracticeDocumentReview;

  documentReleases:
    PracticeDocumentRelease;

  documentRequests:
    PracticeDocumentRequest;

  documentAccessEvents:
    PracticeDocumentAccessEvent;

  clinicalSignatures:
    PracticeClinicalSignature;

  careTeams:
    PracticeCareTeam;

  teamMembers:
    PracticeTeamMember;

  teamInvitations:
    PracticeTeamInvitation;

  patientAssignments:
    PracticePatientAssignment;

  messageCategories:
    PracticeMessageCategoryConfig;

  messageThreads:
    PracticeMessageThread;

  messages:
    PracticeMessage;

  messageTriageRules:
    PracticeMessageTriageRule;

  messageEscalations:
    PracticeMessageEscalation;

  messageSafetyNotices:
    PracticeMessageSafetyNotice;

  paymentProviders:
    PaymentProviderConfig;

  paymentIntents:
    PracticePaymentIntent;

  paymentRecords:
    PracticePaymentRecord;

  transferProofs:
    PracticeTransferProof;

  refunds:
    PracticeRefund;

  receiptTemplates:
    PracticeReceiptTemplate;

  receipts:
    PracticeReceipt;

  patientAccounts:
    PatientAccount;

  patientAccountLinks:
    PatientAccountLink;

  patientAccountInvitations:
    PatientAccountInvitation;

  patientConsentRecords:
    PatientConsentRecord;

  patientContactPreferences:
    PatientContactPreference;

  patientDeviceRegistrations:
    PatientDeviceRegistration;

  provisioningRequests:
    TenantProvisioningRequest;

  subscriptions:
    OrganizationSubscription;

  ownerAssignments:
    OrganizationOwnerAssignment;

  ownerInvitations:
    OrganizationOwnerInvitation;

  onboardingStates:
    TenantOnboardingState;

  moduleActivations:
    OrganizationModuleActivation;

  moduleEntitlements:
    ModuleEntitlement;

  supportAccessSessions:
    SupportAccessSession;

  supportAccessAuditEvents:
    SupportAccessAuditEvent;

  usageSnapshots:
    TenantUsageSnapshot;

  platformControlActions:
    PlatformControlAction;
}

export type WonFlowPracticeResourceName =
  keyof WonFlowPracticeResourceMap;

export type WonFlowPracticeRepositories = {
  [TName in WonFlowPracticeResourceName]:
    InMemoryPracticeRepository<
      WonFlowPracticeResourceMap[TName]
    >;
};

/**
 * Creates an empty repository set.
 *
 * Tenant/demo creation belongs to service operations in P1-15.
 */
export function createWonFlowPracticeRepositories():
  WonFlowPracticeRepositories {
  return {
    tenantProfiles:
      new InMemoryPracticeRepository(),

    tenantPolicySettings:
      new InMemoryPracticeRepository(),

    tenantContentBlocks:
      new InMemoryPracticeRepository(),

    tenantNotificationTemplates:
      new InMemoryPracticeRepository(),

    tenantTerminology:
      new InMemoryPracticeRepository(),

    practiceLocations:
      new InMemoryPracticeRepository(),

    clinicSessions:
      new InMemoryPracticeRepository(),

    scheduleOverrides:
      new InMemoryPracticeRepository(),

    practiceServices:
      new InMemoryPracticeRepository(),

    serviceOfferings:
      new InMemoryPracticeRepository(),

    serviceFeeChanges:
      new InMemoryPracticeRepository(),

    patients:
      new InMemoryPracticeRepository(),

    patientIdentifiers:
      new InMemoryPracticeRepository(),

    patientAddresses:
      new InMemoryPracticeRepository(),

    appointments:
      new InMemoryPracticeRepository(),

    practiceAppointments:
      new InMemoryPracticeRepository(),

    appointmentStatusEvents:
      new InMemoryPracticeRepository(),

    appointmentCancellations:
      new InMemoryPracticeRepository(),

    appointmentRescheduleRequests:
      new InMemoryPracticeRepository(),

    appointmentRescheduleEvents:
      new InMemoryPracticeRepository(),

    practiceSlots:
      new InMemoryPracticeRepository(),

    bookingPolicies:
      new InMemoryPracticeRepository(),

    practiceDocuments:
      new InMemoryPracticeRepository(),

    documentFiles:
      new InMemoryPracticeRepository(),

    documentReviews:
      new InMemoryPracticeRepository(),

    documentReleases:
      new InMemoryPracticeRepository(),

    documentRequests:
      new InMemoryPracticeRepository(),

    documentAccessEvents:
      new InMemoryPracticeRepository(),

    clinicalSignatures:
      new InMemoryPracticeRepository(),

    careTeams:
      new InMemoryPracticeRepository(),

    teamMembers:
      new InMemoryPracticeRepository(),

    teamInvitations:
      new InMemoryPracticeRepository(),

    patientAssignments:
      new InMemoryPracticeRepository(),

    messageCategories:
      new InMemoryPracticeRepository(),

    messageThreads:
      new InMemoryPracticeRepository(),

    messages:
      new InMemoryPracticeRepository(),

    messageTriageRules:
      new InMemoryPracticeRepository(),

    messageEscalations:
      new InMemoryPracticeRepository(),

    messageSafetyNotices:
      new InMemoryPracticeRepository(),

    paymentProviders:
      new InMemoryPracticeRepository(),

    paymentIntents:
      new InMemoryPracticeRepository(),

    paymentRecords:
      new InMemoryPracticeRepository(),

    transferProofs:
      new InMemoryPracticeRepository(),

    refunds:
      new InMemoryPracticeRepository(),

    receiptTemplates:
      new InMemoryPracticeRepository(),

    receipts:
      new InMemoryPracticeRepository(),

    patientAccounts:
      new InMemoryPracticeRepository(),

    patientAccountLinks:
      new InMemoryPracticeRepository(),

    patientAccountInvitations:
      new InMemoryPracticeRepository(),

    patientConsentRecords:
      new InMemoryPracticeRepository(),

    patientContactPreferences:
      new InMemoryPracticeRepository(),

    patientDeviceRegistrations:
      new InMemoryPracticeRepository(),

    provisioningRequests:
      new InMemoryPracticeRepository(),

    subscriptions:
      new InMemoryPracticeRepository(),

    ownerAssignments:
      new InMemoryPracticeRepository(),

    ownerInvitations:
      new InMemoryPracticeRepository(),

    onboardingStates:
      new InMemoryPracticeRepository(),

    moduleActivations:
      new InMemoryPracticeRepository(),

    moduleEntitlements:
      new InMemoryPracticeRepository(),

    supportAccessSessions:
      new InMemoryPracticeRepository(),

    supportAccessAuditEvents:
      new InMemoryPracticeRepository(),

    usageSnapshots:
      new InMemoryPracticeRepository(),

    platformControlActions:
      new InMemoryPracticeRepository(),
  };
}
