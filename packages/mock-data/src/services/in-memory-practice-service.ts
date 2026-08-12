/**
 * In-memory implementation of the WonFlow practice service.
 *
 * Every public operation runs through the existing mock async adapter,
 * so loading, cancellation and controlled error states are exercised.
 */

import {
  arePracticeMoneyValuesEqual,
  comparePracticeDocumentsByDate,
  canCancelWithoutCharge,
  canPatientAccountAuthenticate,
  isPatientAccountLinkActive,
  isPracticeSlotBookable,
  getActiveOrganizationOwnerAssignments,
  hasPracticePrivilege,
  isPracticePatientAssignmentActive,
  isPracticeTeamMemberActive,
  resolvePracticeTeamMemberPrivileges,
  WONFLOW_MODULES,
} from "@wonflow/contracts";

import type {
  IsoDateTime,
  Appointment,
  AppointmentCancellation,
  AppointmentRescheduleEvent,
  AppointmentRescheduleRequest,
  AppointmentStatusEvent,
  AppointmentType,
  DoctorConsultationMode,
  ModuleEntitlement,
  OrganizationModuleActivation,
  OrganizationOwnerAssignment,
  OrganizationOwnerInvitation,
  OrganizationSubscription,
  PlatformControlAction,
  PracticeAppointment,
  PracticeBookingPolicy,
  PaymentProviderConfig,
  PracticeLocation,
  PracticePaymentIntent,
  PracticeSlot,
  PracticeMessageTriageRule,
  PracticePatientAssignment,
  PracticePrivilegeOverride,
  PracticeService,
  PracticeServiceFeeChange,
  PracticeServiceOffering,
  PracticeTeamInvitation,
  PracticeTeamMember,
  SupportAccessAuditEvent,
  SupportAccessSession,
  TenantContentBlock,
  TenantNotificationTemplate,
  TenantOnboardingState,
  TenantOnboardingStepCode,
  TenantOnboardingStepState,
  TenantPolicySettings,
  TenantTerminology,
  TenantProvisioningRequest,
  TenantUsageSnapshot,
  WonFlowId,
} from "@wonflow/contracts";
import type { PracticeDocument, PracticeDocumentCategory, PracticeDocumentFile } from "@wonflow/contracts";

import {
  createMockId,
} from "../core/identifiers";

import {
  WONFLOW_DEMO_ANCHOR_DATE_TIME,
} from "../core/demo-clock";

import {
  createWonFlowPracticeRepositories,
} from "../repositories/practice-repositories";

import {
  registerEmptyTenantBootstrapService,
} from "../bootstrap/empty-tenant-bootstrap";

import type {
  EmptyTenantBootstrapService,
} from "../bootstrap/empty-tenant-bootstrap";

import type {
  WonFlowPracticeRepositories,
  WonFlowPracticeResourceMap,
  WonFlowPracticeResourceName,
} from "../repositories/practice-repositories";

import {
  createWonFlowMockAsyncAdapter,
  WonFlowMockServiceError,
} from "./async-adapter";

import type {
  MockAsyncAdapterOptions,
  WonFlowMockAsyncAdapter,
} from "./async-adapter";

import type {
  ArchivePracticeLocationInput,
  CreateTenantContentVersionInput,
  CreateTenantNotificationTemplateVersionInput,
  DecidePlatformSupportAccessInput,
  ExecutePlatformTenantLifecycleActionInput,
  PracticeClinicSessionCandidate,
  PracticeClinicSessionConflict,
  PracticeCreateInput,
  PracticeMessageTriageRuleCandidate,
  PracticeBookingPolicyCandidate,
  PracticePrivilegeOverrideCandidate,
  PracticeServiceCandidate,
  PracticeServiceOfferingCandidate,
  PracticeTeamMemberManagementCandidate,
  PracticeUpdateInput,
  ReplacePracticePrivilegeOverridesInput,
  ProvisionPlatformTenantInput,
  RecordPlatformSupportAccessUseInput,
  RequestPlatformSupportAccessInput,
  RevokePlatformSupportAccessInput,
  SavePracticeClinicSessionInput,
  SavePracticeBookingPolicyInput,
  SavePracticeServiceInput,
  SavePracticeServiceOfferingInput,
  SavePracticeMessageTriageRuleInput,
  SavePracticeTeamMemberInput,
  SaveTenantPolicySettingsInput,
  SaveTenantTerminologyInput,
  SavePlatformSubscriptionInput,
  SetPlatformModuleEntitlementInput,
  TenantNotificationTemplateVersionCandidate,
  WonFlowOrganizationScope,
  WonFlowPracticeEntityService,
  WonFlowPracticeResourceServices,
  WonFlowPracticeService,
  ConfirmPracticeBookingInput,
  ConfirmPracticeBookingResult,
  CancelPatientPracticeAppointmentInput,
  GetPatientAppointmentsViewInput,
  ListPatientAppointmentRescheduleSlotsInput,
  PatientAppointmentActionState,
  PatientAppointmentViewItem,
  PreparePatientAppointmentPaymentInput,
  ReschedulePatientPracticeAppointmentInput,
  GetPracticeBookingOptionsInput,
  ListPracticeBookingSlotsInput,
  PracticeBookingActor,
  PracticeBookingOfferingOption,
} from "./practice-service";
import type { PatientDocumentTimelineItem } from "./patient-document-workflow";

import {
  generatePracticeBookingSlots,
  resolvePracticeBookingClinicians,
  resolvePracticeBookingPolicy,
} from "./practice-booking-engine";

import {
  addPracticeCalendarDays,
  getPracticeLocalDate,
} from "./practice-booking-time";

export interface WonFlowPracticeServiceClock {
  now(): IsoDateTime;
}

export interface WonFlowPracticeServiceIdFactory {
  next(
    resourceName: string,
  ): WonFlowId;
}

export interface CreateInMemoryPracticeServiceOptions {
  repositories?:
    WonFlowPracticeRepositories;

  adapter?:
    WonFlowMockAsyncAdapter;

  adapterOptions?:
    MockAsyncAdapterOptions;

  clock?:
    WonFlowPracticeServiceClock;

  idFactory?:
    WonFlowPracticeServiceIdFactory;
}

interface PracticeEntityDescriptor<
  TRecord,
> {
  domain: string;

  key(
    record: TRecord,
  ): WonFlowId;

  create(
    scope: WonFlowOrganizationScope,
    input:
      PracticeCreateInput<TRecord>,
    generatedId: WonFlowId,
    now: IsoDateTime,
  ): TRecord;

  update?(
    current: TRecord,
    patch:
      PracticeUpdateInput<TRecord>,
    now: IsoDateTime,
  ): TRecord;
}

type PracticeDescriptorMap = {
  [TName in WonFlowPracticeResourceName]:
    PracticeEntityDescriptor<
      WonFlowPracticeResourceMap[TName]
    >;
};

function createDefaultClock():
  WonFlowPracticeServiceClock {
  return {
    now(): IsoDateTime {
      return WONFLOW_DEMO_ANCHOR_DATE_TIME;
    },
  };
}

function createDefaultIdFactory():
  WonFlowPracticeServiceIdFactory {
  const counters =
    new Map<string, number>();

  return {
    next(
      resourceName: string,
    ): WonFlowId {
      const sequence =
        (
          counters.get(
            resourceName,
          ) ?? 0
        ) + 1;

      counters.set(
        resourceName,
        sequence,
      );

      return createMockId(
        resourceName,
        sequence,
      );
    },
  };
}

function createOwnedVersionedDescriptor<
  TRecord extends {
    id: WonFlowId;

    organizationId: WonFlowId;

    createdAt: IsoDateTime;

    updatedAt: IsoDateTime;
  },
>(
  domain: string,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,

    key(
      record: TRecord,
    ): WonFlowId {
      return record.id;
    },

    create(
      scope,
      input,
      generatedId,
      now,
    ): TRecord {
      return {
        ...input,

        id: generatedId,

        organizationId:
          scope.organizationId,

        createdAt: now,

        updatedAt: now,
      } as TRecord;
    },

    update(
      current,
      patch,
      now,
    ): TRecord {
      return {
        ...current,

        ...patch,

        id: current.id,

        organizationId:
          current.organizationId,

        createdAt:
          current.createdAt,

        updatedAt: now,
      } as TRecord;
    },
  };
}

function createChildVersionedDescriptor<
  TRecord extends {
    id: WonFlowId;

    createdAt: IsoDateTime;

    updatedAt: IsoDateTime;
  },
>(
  domain: string,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,

    key(
      record: TRecord,
    ): WonFlowId {
      return record.id;
    },

    create(
      _scope,
      input,
      generatedId,
      now,
    ): TRecord {
      return {
        ...input,

        id: generatedId,

        createdAt: now,

        updatedAt: now,
      } as TRecord;
    },

    update(
      current,
      patch,
      now,
    ): TRecord {
      return {
        ...current,

        ...patch,

        id: current.id,

        createdAt:
          current.createdAt,

        updatedAt: now,
      } as TRecord;
    },
  };
}

function createScopedVersionedDescriptor<
  TRecord extends {
    id: WonFlowId;

    createdAt: IsoDateTime;

    updatedAt: IsoDateTime;
  },
>(
  domain: string,
): PracticeEntityDescriptor<TRecord> {
  return createChildVersionedDescriptor<
    TRecord
  >(domain);
}

function createOwnedCreatedOnlyDescriptor<
  TRecord extends {
    id: WonFlowId;

    organizationId: WonFlowId;

    createdAt: IsoDateTime;
  },
>(
  domain: string,
  mutable: boolean,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,

    key(
      record: TRecord,
    ): WonFlowId {
      return record.id;
    },

    create(
      scope,
      input,
      generatedId,
      now,
    ): TRecord {
      return {
        ...input,

        id: generatedId,

        organizationId:
          scope.organizationId,

        createdAt: now,
      } as TRecord;
    },

    update:
      mutable
        ? (
            current,
            patch,
          ): TRecord => ({
            ...current,

            ...patch,

            id: current.id,

            organizationId:
              current.organizationId,

            createdAt:
              current.createdAt,
          } as TRecord)
        : undefined,
  };
}

function createOwnedNoTimestampDescriptor<
  TRecord extends {
    id: WonFlowId;

    organizationId: WonFlowId;
  },
>(
  domain: string,
  mutable: boolean,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,

    key(
      record: TRecord,
    ): WonFlowId {
      return record.id;
    },

    create(
      scope,
      input,
      generatedId,
    ): TRecord {
      return {
        ...input,

        id: generatedId,

        organizationId:
          scope.organizationId,
      } as TRecord;
    },

    update:
      mutable
        ? (
            current,
            patch,
          ): TRecord => ({
            ...current,

            ...patch,

            id: current.id,

            organizationId:
              current.organizationId,
          } as TRecord)
        : undefined,
  };
}

const practiceAppointmentDescriptor:
  PracticeEntityDescriptor<PracticeAppointment> = {
    domain:
      "practice-appointment",

    key(
      record: PracticeAppointment,
    ): WonFlowId {
      return record.appointmentId;
    },

    create(
      scope,
      input,
      _generatedId,
      now,
    ): PracticeAppointment {
      return {
        ...input,

        organizationId:
          scope.organizationId,

        createdAt: now,

        updatedAt: now,
      };
    },

    update(
      current,
      patch,
      now,
    ): PracticeAppointment {
      return {
        ...current,

        ...patch,

        appointmentId:
          current.appointmentId,

        organizationId:
          current.organizationId,

        createdAt:
          current.createdAt,

        updatedAt: now,
      };
    },
  };

const appointmentPersistenceDescriptor =
  createOwnedVersionedDescriptor<Appointment>("appointment");

const practiceAppointmentPersistenceDescriptor =
  practiceAppointmentDescriptor;

const practiceSlotPersistenceDescriptor =
  createOwnedVersionedDescriptor<PracticeSlot>("practice-slot");

const paymentIntentPersistenceDescriptor =
  createOwnedVersionedDescriptor<PracticePaymentIntent>("practice-payment-intent");

const appointmentStatusEventPersistenceDescriptor =
  createOwnedNoTimestampDescriptor<AppointmentStatusEvent>("appointment-status-event", false);

const appointmentCancellationPersistenceDescriptor =
  createOwnedNoTimestampDescriptor<AppointmentCancellation>("appointment-cancellation", false);

const appointmentRescheduleRequestPersistenceDescriptor =
  createOwnedNoTimestampDescriptor<AppointmentRescheduleRequest>("appointment-reschedule-request", false);

const appointmentRescheduleEventPersistenceDescriptor =
  createOwnedNoTimestampDescriptor<AppointmentRescheduleEvent>("appointment-reschedule-event", false);

function createProtectedBookingDescriptor<TRecord extends { id: WonFlowId }>(
  domain: string,
): PracticeEntityDescriptor<TRecord> {
  return createProtectedOwnerManagedDescriptor<TRecord>(domain, "confirmPracticeBooking");
}

const protectedAppointmentDescriptor =
  createProtectedBookingDescriptor<Appointment>("appointment");

const protectedPracticeSlotDescriptor =
  createProtectedBookingDescriptor<PracticeSlot>("practice-slot");

const protectedPaymentIntentDescriptor =
  createProtectedOwnerManagedDescriptor<PracticePaymentIntent>(
    "practice-payment-intent",
    "confirmPracticeBooking or preparePatientAppointmentPayment",
  );

function createProtectedLifecycleDescriptor<TRecord extends { id: WonFlowId }>(
  domain: string,
  message: string,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,
    key: (record) => record.id,
    create(): TRecord {
      throw new WonFlowMockServiceError("invalid-query", message, `${domain}.create`);
    },
    update(): TRecord {
      throw new WonFlowMockServiceError("invalid-query", message, `${domain}.update`);
    },
  };
}

const protectedAppointmentStatusEventDescriptor =
  createProtectedLifecycleDescriptor<AppointmentStatusEvent>("appointment-status-event", "Appointment lifecycle history is append-only.");
const protectedAppointmentCancellationDescriptor =
  createProtectedLifecycleDescriptor<AppointmentCancellation>("appointment-cancellation", "Use cancelPatientPracticeAppointment.");
const protectedAppointmentRescheduleRequestDescriptor =
  createProtectedLifecycleDescriptor<AppointmentRescheduleRequest>("appointment-reschedule-request", "Use reschedulePatientPracticeAppointment.");
const protectedAppointmentRescheduleEventDescriptor =
  createProtectedLifecycleDescriptor<AppointmentRescheduleEvent>("appointment-reschedule-event", "Use reschedulePatientPracticeAppointment.");

const protectedPracticeAppointmentDescriptor: PracticeEntityDescriptor<PracticeAppointment> = {
  domain: "practice-appointment",
  key(record): WonFlowId {
    return record.appointmentId;
  },
  create(): PracticeAppointment {
    throw new WonFlowMockServiceError("invalid-query", "Use confirmPracticeBooking.", "practiceAppointments.create");
  },
  update(): PracticeAppointment {
    throw new WonFlowMockServiceError("invalid-query", "Use confirmPracticeBooking.", "practiceAppointments.update");
  },
};

/**
 * Offerings must be created and updated through
 * savePracticeServiceOffering so fee history cannot be bypassed.
 */
const protectedServiceOfferingDescriptor:
  PracticeEntityDescriptor<
    PracticeServiceOffering
  > = {
    domain:
      "practice-service-offering",

    key(
      record:
        PracticeServiceOffering,
    ): WonFlowId {
      return record.id;
    },

    create(): PracticeServiceOffering {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use savePracticeServiceOffering to create an offering.",
        "serviceOfferings.create",
      );
    },

    update(): PracticeServiceOffering {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use savePracticeServiceOffering to update an offering.",
        "serviceOfferings.update",
      );
    },
  };

/**
 * Fee-history records are generated only by the offering operation.
 */
const protectedServiceFeeChangeDescriptor:
  PracticeEntityDescriptor<
    PracticeServiceFeeChange
  > = {
    domain:
      "practice-service-fee-change",

    key(
      record:
        PracticeServiceFeeChange,
    ): WonFlowId {
      return record.id;
    },

    create(): PracticeServiceFeeChange {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Fee history may only be appended by savePracticeServiceOffering.",
        "serviceFeeChanges.create",
      );
    },
  };

const teamMemberPersistenceDescriptor =
  createChildVersionedDescriptor<PracticeTeamMember>(
    "practice-team-member",
  );

const teamInvitationPersistenceDescriptor =
  createOwnedVersionedDescriptor<PracticeTeamInvitation>(
    "practice-team-invitation",
  );

const patientAssignmentPersistenceDescriptor =
  createChildVersionedDescriptor<PracticePatientAssignment>(
    "practice-patient-assignment",
  );

const messageTriageRulePersistenceDescriptor =
  createOwnedVersionedDescriptor<PracticeMessageTriageRule>(
    "practice-message-triage-rule",
  );

const bookingPolicyPersistenceDescriptor =
  createOwnedVersionedDescriptor<PracticeBookingPolicy>(
    "practice-booking-policy",
  );

const tenantPolicySettingsPersistenceDescriptor =
  createOwnedVersionedDescriptor<TenantPolicySettings>(
    "tenant-policy-settings",
  );

const tenantContentBlockPersistenceDescriptor =
  createOwnedVersionedDescriptor<TenantContentBlock>(
    "tenant-content-block",
  );

const tenantNotificationTemplatePersistenceDescriptor =
  createOwnedVersionedDescriptor<TenantNotificationTemplate>(
    "tenant-notification-template",
  );

const tenantTerminologyPersistenceDescriptor =
  createOwnedVersionedDescriptor<TenantTerminology>(
    "tenant-terminology",
  );

const provisioningRequestPersistenceDescriptor =
  createScopedVersionedDescriptor<TenantProvisioningRequest>(
    "tenant-provisioning-request",
  );

const subscriptionPersistenceDescriptor =
  createOwnedVersionedDescriptor<OrganizationSubscription>(
    "organization-subscription",
  );

const ownerAssignmentPersistenceDescriptor =
  createOwnedVersionedDescriptor<OrganizationOwnerAssignment>(
    "organization-owner-assignment",
  );

const ownerInvitationPersistenceDescriptor =
  createOwnedVersionedDescriptor<OrganizationOwnerInvitation>(
    "organization-owner-invitation",
  );

const moduleEntitlementPersistenceDescriptor =
  createOwnedVersionedDescriptor<ModuleEntitlement>(
    "module-entitlement",
  );

const moduleActivationPersistenceDescriptor =
  createOwnedVersionedDescriptor<OrganizationModuleActivation>(
    "organization-module-activation",
  );

const platformControlActionPersistenceDescriptor =
  createOwnedVersionedDescriptor<PlatformControlAction>(
    "platform-control-action",
  );

const supportAccessSessionPersistenceDescriptor =
  createOwnedVersionedDescriptor<SupportAccessSession>(
    "support-access-session",
  );

const supportAccessAuditEventPersistenceDescriptor =
  createOwnedCreatedOnlyDescriptor<SupportAccessAuditEvent>(
    "support-access-audit-event",
    false,
  );

const usageSnapshotPersistenceDescriptor =
  createOwnedCreatedOnlyDescriptor<TenantUsageSnapshot>(
    "tenant-usage-snapshot",
    false,
  );

function createProtectedOwnerManagedDescriptor<
  TRecord extends { id: WonFlowId },
>(
  domain: string,
  safeOperationName: string,
): PracticeEntityDescriptor<TRecord> {
  return {
    domain,
    key(record): WonFlowId {
      return record.id;
    },
    create(): TRecord {
      throw new WonFlowMockServiceError(
        "invalid-query",
        `Use ${safeOperationName}.`,
        `${domain}.create`,
      );
    },
    update(): TRecord {
      throw new WonFlowMockServiceError(
        "invalid-query",
        `Use ${safeOperationName}.`,
        `${domain}.update`,
      );
    },
  };
}

const protectedBookingPolicyDescriptor =
  createProtectedOwnerManagedDescriptor<PracticeBookingPolicy>(
    "practice-booking-policy",
    "savePracticeBookingPolicy",
  );

const protectedTenantPolicySettingsDescriptor =
  createProtectedOwnerManagedDescriptor<TenantPolicySettings>(
    "tenant-policy-settings",
    "saveTenantPolicySettings",
  );

const protectedTenantContentBlockDescriptor =
  createProtectedOwnerManagedDescriptor<TenantContentBlock>(
    "tenant-content-block",
    "createTenantContentVersion",
  );

const protectedTenantNotificationTemplateDescriptor =
  createProtectedOwnerManagedDescriptor<TenantNotificationTemplate>(
    "tenant-notification-template",
    "createTenantNotificationTemplateVersion",
  );

const protectedTenantTerminologyDescriptor =
  createProtectedOwnerManagedDescriptor<TenantTerminology>(
    "tenant-terminology",
    "saveTenantTerminology",
  );

const protectedProvisioningRequestDescriptor =
  createProtectedOwnerManagedDescriptor<TenantProvisioningRequest>(
    "tenant-provisioning-request",
    "provisionPlatformTenant",
  );
const protectedSubscriptionDescriptor =
  createProtectedOwnerManagedDescriptor<OrganizationSubscription>(
    "organization-subscription",
    "savePlatformTenantSubscription",
  );
const protectedOwnerAssignmentDescriptor =
  createProtectedOwnerManagedDescriptor<OrganizationOwnerAssignment>(
    "organization-owner-assignment",
    "executePlatformTenantLifecycleAction",
  );
const protectedOwnerInvitationDescriptor =
  createProtectedOwnerManagedDescriptor<OrganizationOwnerInvitation>(
    "organization-owner-invitation",
    "provisionPlatformTenant",
  );
const protectedModuleEntitlementDescriptor =
  createProtectedOwnerManagedDescriptor<ModuleEntitlement>(
    "module-entitlement",
    "setPlatformTenantModuleEntitlement",
  );
const protectedModuleActivationDescriptor =
  createProtectedOwnerManagedDescriptor<OrganizationModuleActivation>(
    "organization-module-activation",
    "setPlatformTenantModuleEntitlement",
  );
const protectedPlatformControlActionDescriptor =
  createProtectedOwnerManagedDescriptor<PlatformControlAction>(
    "platform-control-action",
    "executePlatformTenantLifecycleAction",
  );
const protectedSupportAccessSessionDescriptor =
  createProtectedOwnerManagedDescriptor<SupportAccessSession>(
    "support-access-session",
    "requestPlatformSupportAccess or decidePlatformSupportAccess",
  );
const protectedSupportAccessAuditEventDescriptor =
  createProtectedOwnerManagedDescriptor<SupportAccessAuditEvent>(
    "support-access-audit-event",
    "Support access audit events are append-only",
  );
const protectedUsageSnapshotDescriptor =
  createProtectedOwnerManagedDescriptor<TenantUsageSnapshot>(
    "tenant-usage-snapshot",
    "the platform usage-snapshot operation",
  );

/**
 * Team members must be changed through savePracticeTeamMember or
 * replacePracticePrivilegeOverrides so supervisor and manager-lockout
 * checks cannot be bypassed.
 */
const protectedTeamMemberDescriptor:
  PracticeEntityDescriptor<PracticeTeamMember> = {
    domain: "practice-team-member",
    key(record): WonFlowId {
      return record.id;
    },
    create(): PracticeTeamMember {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Create the owner through initial-team setup or invite another member.",
        "teamMembers.create",
      );
    },
    update(): PracticeTeamMember {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use savePracticeTeamMember or replacePracticePrivilegeOverrides.",
        "teamMembers.update",
      );
    },
  };

/** Invitation lifecycle changes require actor attribution and a reason. */
const protectedTeamInvitationDescriptor:
  PracticeEntityDescriptor<PracticeTeamInvitation> = {
    domain: "practice-team-invitation",
    key(record): WonFlowId {
      return record.id;
    },
    create(): PracticeTeamInvitation {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use invitePracticeTeamMember.",
        "teamInvitations.create",
      );
    },
    update(): PracticeTeamInvitation {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use the protected invitation lifecycle operations.",
        "teamInvitations.update",
      );
    },
  };

/** Ending patient access must record the actor, timestamp and reason. */
const protectedPatientAssignmentDescriptor:
  PracticeEntityDescriptor<PracticePatientAssignment> = {
    ...patientAssignmentPersistenceDescriptor,
    update(): PracticePatientAssignment {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use endPracticePatientAssignment to end patient access.",
        "patientAssignments.update",
      );
    },
  };

/** Triage rules require an authorized team manager and valid references. */
const protectedMessageTriageRuleDescriptor:
  PracticeEntityDescriptor<PracticeMessageTriageRule> = {
    domain: "practice-message-triage-rule",
    key(record): WonFlowId {
      return record.id;
    },
    create(): PracticeMessageTriageRule {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use savePracticeMessageTriageRule.",
        "messageTriageRules.create",
      );
    },
    update(): PracticeMessageTriageRule {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Use savePracticeMessageTriageRule.",
        "messageTriageRules.update",
      );
    },
  };

const PRACTICE_DESCRIPTORS:
  PracticeDescriptorMap = {
    tenantProfiles:
      createOwnedVersionedDescriptor(
        "tenant-profile",
      ),

    tenantPolicySettings:
      protectedTenantPolicySettingsDescriptor,

    tenantContentBlocks:
      protectedTenantContentBlockDescriptor,

    tenantNotificationTemplates:
      protectedTenantNotificationTemplateDescriptor,

    tenantTerminology:
      protectedTenantTerminologyDescriptor,

    practiceLocations:
      createOwnedVersionedDescriptor(
        "practice-location",
      ),

    clinicSessions:
      createOwnedVersionedDescriptor(
        "practice-clinic-session",
      ),

    scheduleOverrides:
      createOwnedVersionedDescriptor(
        "practice-schedule-override",
      ),

    practiceServices:
      createOwnedVersionedDescriptor(
        "practice-service",
      ),

    serviceOfferings:
      protectedServiceOfferingDescriptor,

    serviceFeeChanges:
      protectedServiceFeeChangeDescriptor,

    patients:
      createOwnedVersionedDescriptor(
        "patient",
      ),

    patientIdentifiers:
      createOwnedVersionedDescriptor(
        "patient-identifier",
      ),

    patientAddresses:
      createOwnedVersionedDescriptor(
        "patient-address",
      ),

    appointments:
      protectedAppointmentDescriptor,

    practiceAppointments:
      protectedPracticeAppointmentDescriptor,

    appointmentStatusEvents:
      protectedAppointmentStatusEventDescriptor,

    appointmentCancellations:
      protectedAppointmentCancellationDescriptor,

    appointmentRescheduleRequests:
      protectedAppointmentRescheduleRequestDescriptor,

    appointmentRescheduleEvents:
      protectedAppointmentRescheduleEventDescriptor,

    practiceSlots:
      protectedPracticeSlotDescriptor,

    bookingPolicies:
      protectedBookingPolicyDescriptor,

    practiceDocuments:
      createOwnedVersionedDescriptor(
        "practice-document",
      ),

    documentFiles:
      createOwnedVersionedDescriptor(
        "practice-document-file",
      ),

    documentReviews:
      createOwnedVersionedDescriptor(
        "practice-document-review",
      ),

    documentReleases:
      createOwnedNoTimestampDescriptor(
        "practice-document-release",
        true,
      ),

    documentRequests:
      createOwnedVersionedDescriptor(
        "practice-document-request",
      ),

    documentAccessEvents:
      createOwnedNoTimestampDescriptor(
        "practice-document-access-event",
        false,
      ),

    clinicalSignatures:
      createOwnedVersionedDescriptor(
        "practice-clinical-signature",
      ),

    careTeams:
      createOwnedVersionedDescriptor(
        "practice-care-team",
      ),

    teamMembers:
      protectedTeamMemberDescriptor,

    teamInvitations:
      protectedTeamInvitationDescriptor,

    patientAssignments:
      protectedPatientAssignmentDescriptor,

    messageCategories:
      createOwnedVersionedDescriptor(
        "practice-message-category",
      ),

    messageThreads:
      createOwnedVersionedDescriptor(
        "practice-message-thread",
      ),

    messages:
      createOwnedVersionedDescriptor(
        "practice-message",
      ),

    messageTriageRules:
      protectedMessageTriageRuleDescriptor,

    messageEscalations:
      createOwnedCreatedOnlyDescriptor(
        "practice-message-escalation",
        true,
      ),

    messageSafetyNotices:
      createOwnedCreatedOnlyDescriptor(
        "practice-message-safety-notice",
        false,
      ),

    paymentProviders:
      createOwnedVersionedDescriptor(
        "payment-provider-config",
      ),

    paymentIntents:
      protectedPaymentIntentDescriptor,

    paymentRecords:
      createOwnedVersionedDescriptor(
        "practice-payment-record",
      ),

    transferProofs:
      createOwnedVersionedDescriptor(
        "practice-transfer-proof",
      ),

    refunds:
      createOwnedVersionedDescriptor(
        "practice-refund",
      ),

    receiptTemplates:
      createOwnedVersionedDescriptor(
        "practice-receipt-template",
      ),

    receipts:
      createOwnedCreatedOnlyDescriptor(
        "practice-receipt",
        false,
      ),

    patientAccounts:
      createOwnedVersionedDescriptor(
        "patient-account",
      ),

    patientAccountLinks:
      createOwnedVersionedDescriptor(
        "patient-account-link",
      ),

    patientAccountInvitations:
      createOwnedVersionedDescriptor(
        "patient-account-invitation",
      ),

    patientConsentRecords:
      createOwnedVersionedDescriptor(
        "patient-consent-record",
      ),

    patientContactPreferences:
      createOwnedVersionedDescriptor(
        "patient-contact-preference",
      ),

    patientDeviceRegistrations:
      createOwnedVersionedDescriptor(
        "patient-device-registration",
      ),

    provisioningRequests:
      protectedProvisioningRequestDescriptor,

    subscriptions:
      protectedSubscriptionDescriptor,

    ownerAssignments:
      protectedOwnerAssignmentDescriptor,

    ownerInvitations:
      protectedOwnerInvitationDescriptor,

    onboardingStates:
      createOwnedVersionedDescriptor(
        "tenant-onboarding-state",
      ),

    moduleActivations:
      protectedModuleActivationDescriptor,

    moduleEntitlements:
      protectedModuleEntitlementDescriptor,

    supportAccessSessions:
      protectedSupportAccessSessionDescriptor,

    supportAccessAuditEvents:
      protectedSupportAccessAuditEventDescriptor,

    usageSnapshots:
      protectedUsageSnapshotDescriptor,

    platformControlActions:
      protectedPlatformControlActionDescriptor,
  };

function createNotFoundError(
  resourceName: string,
  key: WonFlowId,
  operationName: string,
): WonFlowMockServiceError {
  return new WonFlowMockServiceError(
    "not-found",
    `${resourceName} was not found: ${key}`,
    operationName,
  );
}

function createEntityService<
  TName extends WonFlowPracticeResourceName,
>(
  resourceName: TName,
  repositories:
    WonFlowPracticeRepositories,
  adapter:
    WonFlowMockAsyncAdapter,
  clock:
    WonFlowPracticeServiceClock,
  idFactory:
    WonFlowPracticeServiceIdFactory,
): WonFlowPracticeEntityService<
  WonFlowPracticeResourceMap[TName]
> {
  type TRecord =
    WonFlowPracticeResourceMap[TName];

  const repository =
    repositories[resourceName];

  const descriptor =
    PRACTICE_DESCRIPTORS[
      resourceName
    ];

  return {
    list(
      scope,
      query = {},
      signal,
    ) {
      const operationName =
        `${resourceName}.list`;

      return adapter.execute(
        () =>
          repository.list(
            scope,
            query,
          ),

        {
          signal,

          operationName,
        },
      );
    },

    get(
      scope,
      key,
      signal,
    ) {
      const operationName =
        `${resourceName}.get`;

      return adapter.execute(
        () => {
          const record =
            repository.get(
              scope,
              key,
            );

          if (record === undefined) {
            throw createNotFoundError(
              resourceName,
              key,
              operationName,
            );
          }

          return record;
        },

        {
          signal,

          operationName,
        },
      );
    },

    create(
      scope,
      input:
        PracticeCreateInput<TRecord>,
      signal,
    ) {
      const operationName =
        `${resourceName}.create`;

      return adapter.execute(
        () => {
          const now =
            clock.now();

          const generatedId =
            idFactory.next(
              descriptor.domain,
            );

          const record =
            descriptor.create(
              scope,
              input,
              generatedId,
              now,
            );

          return repository.create(
            scope,
            descriptor.key(record),
            record,
          );
        },

        {
          signal,

          operationName,
        },
      );
    },

    update(
      scope,
      key,
      patch:
        PracticeUpdateInput<TRecord>,
      signal,
    ) {
      const operationName =
        `${resourceName}.update`;

      return adapter.execute(
        () => {
          if (
            descriptor.update ===
            undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              `${resourceName} is append-only and cannot be updated.`,
              operationName,
            );
          }

          const current =
            repository.get(
              scope,
              key,
            );

          if (current === undefined) {
            throw createNotFoundError(
              resourceName,
              key,
              operationName,
            );
          }

          const updated =
            descriptor.update(
              current,
              patch,
              clock.now(),
            );

          return repository.replace(
            scope,
            key,
            updated,
          );
        },

        {
          signal,

          operationName,
        },
      );
    },
  };
}

function createInternalBootstrapCreateService<
  TName extends WonFlowPracticeResourceName,
>(
  resourceName: TName,
  descriptor: PracticeEntityDescriptor<WonFlowPracticeResourceMap[TName]>,
  repositories: WonFlowPracticeRepositories,
  adapter: WonFlowMockAsyncAdapter,
  clock: WonFlowPracticeServiceClock,
  idFactory: WonFlowPracticeServiceIdFactory,
): Pick<
  WonFlowPracticeEntityService<WonFlowPracticeResourceMap[TName]>,
  "create"
> {
  return {
    create(scope, input, signal) {
      const operationName = `bootstrap.${resourceName}.create`;
      return adapter.execute(
        () => {
          const now = clock.now();
          const generatedId = idFactory.next(descriptor.domain);
          const record = descriptor.create(
            scope,
            input,
            generatedId,
            now,
          );
          return repositories[resourceName].create(
            scope,
            descriptor.key(record),
            record,
          );
        },
        { signal, operationName },
      );
    },
  };
}

function createResourceServices(
  repositories:
    WonFlowPracticeRepositories,
  adapter:
    WonFlowMockAsyncAdapter,
  clock:
    WonFlowPracticeServiceClock,
  idFactory:
    WonFlowPracticeServiceIdFactory,
): WonFlowPracticeResourceServices {
  return {
    tenantProfiles:
      createEntityService(
        "tenantProfiles",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    tenantPolicySettings:
      createEntityService(
        "tenantPolicySettings",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    tenantContentBlocks:
      createEntityService(
        "tenantContentBlocks",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    tenantNotificationTemplates:
      createEntityService(
        "tenantNotificationTemplates",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    tenantTerminology:
      createEntityService(
        "tenantTerminology",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    practiceLocations:
      createEntityService(
        "practiceLocations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    clinicSessions:
      createEntityService(
        "clinicSessions",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    scheduleOverrides:
      createEntityService(
        "scheduleOverrides",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    practiceServices:
      createEntityService(
        "practiceServices",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    serviceOfferings:
      createEntityService(
        "serviceOfferings",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    serviceFeeChanges:
      createEntityService(
        "serviceFeeChanges",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patients:
      createEntityService(
        "patients",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientIdentifiers:
      createEntityService(
        "patientIdentifiers",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientAddresses:
      createEntityService(
        "patientAddresses",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    appointments:
      createEntityService(
        "appointments",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    practiceAppointments:
      createEntityService(
        "practiceAppointments",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    appointmentStatusEvents:
      createEntityService(
        "appointmentStatusEvents",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    appointmentCancellations:
      createEntityService(
        "appointmentCancellations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    appointmentRescheduleRequests:
      createEntityService(
        "appointmentRescheduleRequests",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    appointmentRescheduleEvents:
      createEntityService(
        "appointmentRescheduleEvents",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    practiceSlots:
      createEntityService(
        "practiceSlots",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    bookingPolicies:
      createEntityService(
        "bookingPolicies",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    practiceDocuments:
      createEntityService(
        "practiceDocuments",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    documentFiles:
      createEntityService(
        "documentFiles",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    documentReviews:
      createEntityService(
        "documentReviews",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    documentReleases:
      createEntityService(
        "documentReleases",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    documentRequests:
      createEntityService(
        "documentRequests",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    documentAccessEvents:
      createEntityService(
        "documentAccessEvents",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    clinicalSignatures:
      createEntityService(
        "clinicalSignatures",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    careTeams:
      createEntityService(
        "careTeams",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    teamMembers:
      createEntityService(
        "teamMembers",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    teamInvitations:
      createEntityService(
        "teamInvitations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientAssignments:
      createEntityService(
        "patientAssignments",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messageCategories:
      createEntityService(
        "messageCategories",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messageThreads:
      createEntityService(
        "messageThreads",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messages:
      createEntityService(
        "messages",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messageTriageRules:
      createEntityService(
        "messageTriageRules",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messageEscalations:
      createEntityService(
        "messageEscalations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    messageSafetyNotices:
      createEntityService(
        "messageSafetyNotices",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    paymentProviders:
      createEntityService(
        "paymentProviders",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    paymentIntents:
      createEntityService(
        "paymentIntents",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    paymentRecords:
      createEntityService(
        "paymentRecords",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    transferProofs:
      createEntityService(
        "transferProofs",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    refunds:
      createEntityService(
        "refunds",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    receiptTemplates:
      createEntityService(
        "receiptTemplates",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    receipts:
      createEntityService(
        "receipts",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientAccounts:
      createEntityService(
        "patientAccounts",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientAccountLinks:
      createEntityService(
        "patientAccountLinks",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientAccountInvitations:
      createEntityService(
        "patientAccountInvitations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientConsentRecords:
      createEntityService(
        "patientConsentRecords",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientContactPreferences:
      createEntityService(
        "patientContactPreferences",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    patientDeviceRegistrations:
      createEntityService(
        "patientDeviceRegistrations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    provisioningRequests:
      createEntityService(
        "provisioningRequests",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    subscriptions:
      createEntityService(
        "subscriptions",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    ownerAssignments:
      createEntityService(
        "ownerAssignments",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    ownerInvitations:
      createEntityService(
        "ownerInvitations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    onboardingStates:
      createEntityService(
        "onboardingStates",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    moduleActivations:
      createEntityService(
        "moduleActivations",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    moduleEntitlements:
      createEntityService(
        "moduleEntitlements",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    supportAccessSessions:
      createEntityService(
        "supportAccessSessions",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    supportAccessAuditEvents:
      createEntityService(
        "supportAccessAuditEvents",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    usageSnapshots:
      createEntityService(
        "usageSnapshots",
        repositories,
        adapter,
        clock,
        idFactory,
      ),

    platformControlActions:
      createEntityService(
        "platformControlActions",
        repositories,
        adapter,
        clock,
        idFactory,
      ),
  };

}

function getRequiredRecord<
  TName extends WonFlowPracticeResourceName,
>(
  repositories:
    WonFlowPracticeRepositories,
  resourceName: TName,
  scope: WonFlowOrganizationScope,
  key: WonFlowId,
  operationName: string,
): WonFlowPracticeResourceMap[TName] {
  const value =
    repositories[
      resourceName
    ].get(
      scope,
      key,
    );

  if (value === undefined) {
    throw createNotFoundError(
      resourceName,
      key,
      operationName,
    );
  }

  return value;
}

function listAllRecords<
  TName extends WonFlowPracticeResourceName,
>(
  repositories:
    WonFlowPracticeRepositories,
  resourceName: TName,
  scope: WonFlowOrganizationScope,
  filter?: (
    record:
      Readonly<
        WonFlowPracticeResourceMap[TName]
      >,
  ) => boolean,
): WonFlowPracticeResourceMap[TName][] {
  return repositories[
    resourceName
  ].list(
    scope,
    {
      limit: 1_000,

      filter,
    },
  ).items;
}

function getAuthorizedPatientContext(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  patientAccountId: WonFlowId,
  patientId: WonFlowId,
  now: IsoDateTime,
  operationName: string,
) {
  const account = getRequiredRecord(repositories, "patientAccounts", scope, patientAccountId, operationName);
  if (!canPatientAccountAuthenticate(account, now)) {
    throw new WonFlowMockServiceError("invalid-query", "The patient account is not active and authenticated.", operationName);
  }
  const accountLink = listAllRecords(repositories, "patientAccountLinks", scope).find((link) =>
    link.patientAccountId === patientAccountId && link.patientId === patientId &&
    isPatientAccountLinkActive(link) && link.revokedAt === undefined,
  );
  if (accountLink === undefined) {
    throw new WonFlowMockServiceError("not-found", "The patient account is not linked to the requested patient.", operationName);
  }
  const patient = getRequiredRecord(repositories, "patients", scope, patientId, operationName);
  return { account, accountLink, patient };
}

function getAuthorizedPatientAppointmentContext(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  patientAccountId: WonFlowId,
  patientId: WonFlowId,
  appointmentId: WonFlowId,
  now: IsoDateTime,
  operationName: string,
) {
  const patientContext = getAuthorizedPatientContext(
    repositories, scope, patientAccountId, patientId, now, operationName,
  );
  const appointment = getRequiredRecord(repositories, "appointments", scope, appointmentId, operationName);
  if (appointment.patientId !== patientId) {
    throw new WonFlowMockServiceError("not-found", "The appointment does not belong to the requested patient.", operationName);
  }
  const practiceAppointment = getRequiredRecord(repositories, "practiceAppointments", scope, appointmentId, operationName);
  const location = getRequiredRecord(repositories, "practiceLocations", scope, practiceAppointment.practiceLocationId, operationName);
  const service = getRequiredRecord(repositories, "practiceServices", scope, practiceAppointment.practiceServiceId, operationName);
  const offering = getRequiredRecord(repositories, "serviceOfferings", scope, practiceAppointment.practiceServiceOfferingId, operationName);
  const policy = getRequiredRecord(repositories, "bookingPolicies", scope, practiceAppointment.practiceBookingPolicyId, operationName);
  if (
    offering.practiceLocationId !== location.id || offering.practiceServiceId !== service.id ||
    practiceAppointment.appointmentId !== appointment.id || practiceAppointment.organizationId !== scope.organizationId ||
    practiceAppointment.scheduledStartAt !== appointment.scheduledStartAt ||
    practiceAppointment.scheduledEndAt !== appointment.scheduledEndAt ||
    practiceAppointment.status !== appointment.status ||
    (policy.practiceLocationId !== undefined && policy.practiceLocationId !== location.id) ||
    (policy.practiceServiceId !== undefined && policy.practiceServiceId !== service.id) ||
    (policy.practiceServiceOfferingId !== undefined && policy.practiceServiceOfferingId !== offering.id) ||
    location.organizationId !== scope.organizationId || service.organizationId !== scope.organizationId ||
    offering.organizationId !== scope.organizationId || policy.organizationId !== scope.organizationId
  ) {
    throw new WonFlowMockServiceError("invalid-query", "The appointment catalogue references are inconsistent.", operationName);
  }
  const assignedTeamMember = practiceAppointment.assignedTeamMemberId === undefined
    ? undefined
    : repositories.teamMembers.get(scope, practiceAppointment.assignedTeamMemberId);
  if (practiceAppointment.assignedTeamMemberId !== undefined && assignedTeamMember === undefined) {
    throw new WonFlowMockServiceError("not-found", "The assigned team member was not found.", operationName);
  }
  return {
    ...patientContext,
    appointment,
    practiceAppointment,
    location,
    service,
    offering,
    policy,
    assignedTeamMember,
  };
}

function getRequiredOnboardingStepCode(
  stepCode:
    TenantOnboardingStepCode | undefined,
  operationName: string,
): TenantOnboardingStepCode {
  if (stepCode === undefined) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "This onboarding transition requires a step code.",
      operationName,
    );
  }

  return stepCode;
}

function getOnboardingStep(
  state:
    TenantOnboardingState,
  stepCode:
    TenantOnboardingStepCode,
  operationName: string,
): TenantOnboardingStepState {
  const step =
    state.steps.find(
      (candidate) =>
        candidate.code ===
        stepCode,
    );

  if (step === undefined) {
    throw new WonFlowMockServiceError(
      "not-found",
      `The onboarding step does not exist: ${stepCode}`,
      operationName,
    );
  }

  return step;
}

function replaceOnboardingStep(
  steps:
    readonly TenantOnboardingStepState[],
  replacement:
    TenantOnboardingStepState,
): TenantOnboardingStepState[] {
  return steps.map(
    (step) =>
      step.code ===
        replacement.code
        ? replacement
        : step,
  );
}

function findNextOnboardingStep(
  steps:
    readonly TenantOnboardingStepState[],
): TenantOnboardingStepCode | undefined {
  return steps.find(
    (step) =>
      step.status ===
        "not-started" ||
      step.status ===
        "in-progress",
  )?.code;
}

function areNonReviewOnboardingStepsFinished(
  steps:
    readonly TenantOnboardingStepState[],
): boolean {
  return steps
    .filter(
      (step) =>
        step.code !== "review",
    )
    .every(
      (step) =>
        step.status ===
          "completed" ||
        step.status ===
          "skipped",
    );
}

function doClinicSessionDateRangesOverlap(
  left: {
    effectiveFrom: string;
    effectiveTo?: string;
  },
  right: {
    effectiveFrom: string;
    effectiveTo?: string;
  },
): boolean {
  const leftEndsAfterRightStarts =
    left.effectiveTo ===
      undefined ||
    right.effectiveFrom <=
      left.effectiveTo;

  const rightEndsAfterLeftStarts =
    right.effectiveTo ===
      undefined ||
    left.effectiveFrom <=
      right.effectiveTo;

  return (
    leftEndsAfterRightStarts &&
    rightEndsAfterLeftStarts
  );
}

function doClinicSessionTimeRangesOverlap(
  left: {
    localStartTime: string;
    localEndTime: string;
  },
  right: {
    localStartTime: string;
    localEndTime: string;
  },
): boolean {
  return (
    left.localStartTime <
      right.localEndTime &&
    right.localStartTime <
      left.localEndTime
  );
}

function findClinicSessionConflicts(
  repositories:
    WonFlowPracticeRepositories,
  scope:
    WonFlowOrganizationScope,
  candidate:
    PracticeClinicSessionCandidate,
  excludeSessionId?: WonFlowId,
): PracticeClinicSessionConflict[] {
  if (
    candidate.status !== "active"
  ) {
    return [];
  }

  const sessions =
    listAllRecords(
      repositories,
      "clinicSessions",
      scope,
      (session) =>
        session.status ===
          "active" &&
        session.id !==
          excludeSessionId &&
        session.weekday ===
          candidate.weekday,
    );

  const conflicts:
    PracticeClinicSessionConflict[] = [];

  for (const existing of sessions) {
    if (
      !doClinicSessionDateRangesOverlap(
        existing,
        candidate,
      ) ||
      !doClinicSessionTimeRangesOverlap(
        existing,
        candidate,
      )
    ) {
      continue;
    }

    const sameSchedulingSubject =
      existing.practitionerId ===
      candidate.practitionerId;

    if (
      existing.practiceLocationId ===
        candidate.practiceLocationId &&
      sameSchedulingSubject
    ) {
      conflicts.push({
        severity: "blocking",

        reason:
          "same-location-overlap",

        conflictingSessionId:
          existing.id,

        conflictingPracticeLocationId:
          existing
            .practiceLocationId,

        practitionerId:
          candidate.practitionerId,

        weekday:
          existing.weekday,

        localStartTime:
          existing.localStartTime,

        localEndTime:
          existing.localEndTime,
      });

      continue;
    }

    if (
      existing.practiceLocationId !==
        candidate.practiceLocationId &&
      candidate.practitionerId !==
        undefined &&
      existing.practitionerId ===
        candidate.practitionerId
    ) {
      conflicts.push({
        severity: "warning",

        reason:
          "cross-location-practitioner-overlap",

        conflictingSessionId:
          existing.id,

        conflictingPracticeLocationId:
          existing
            .practiceLocationId,

        practitionerId:
          candidate.practitionerId,

        weekday:
          existing.weekday,

        localStartTime:
          existing.localStartTime,

        localEndTime:
          existing.localEndTime,
      });
    }
  }

  return conflicts;
}

function doServiceOfferingWindowsOverlap(
  left: {
    effectiveFrom: IsoDateTime;
    effectiveTo?: IsoDateTime;
  },
  right: {
    effectiveFrom: IsoDateTime;
    effectiveTo?: IsoDateTime;
  },
): boolean {
  const leftEndsAfterRightStarts =
    left.effectiveTo ===
      undefined ||
    right.effectiveFrom <=
      left.effectiveTo;

  const rightEndsAfterLeftStarts =
    right.effectiveTo ===
      undefined ||
    left.effectiveFrom <=
      right.effectiveTo;

  return (
    leftEndsAfterRightStarts &&
    rightEndsAfterLeftStarts
  );
}

function validatePracticeServiceClinicians(
  repositories:
    WonFlowPracticeRepositories,
  scope:
    WonFlowOrganizationScope,
  candidate:
    PracticeServiceCandidate,
  operationName: string,
): void {
  if (
    candidate.deliveryScope !==
      "selected-clinicians"
  ) {
    if (
      candidate.eligiblePractitionerIds
        .length > 0
    ) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Clinician selections require selected-clinicians delivery scope.",
        operationName,
      );
    }

    return;
  }

  if (
    candidate.eligiblePractitionerIds
      .length === 0
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Select at least one clinician.",
      operationName,
    );
  }

  const activePractitionerIds =
    new Set(
      listAllRecords(
        repositories,
        "teamMembers",
        scope,
        (member) =>
          isPracticeTeamMemberActive(
            member,
          ) &&
          member.practitionerId !==
            undefined,
      )
        .map(
          (member) =>
            member.practitionerId,
        )
        .filter(
          (
            practitionerId,
          ): practitionerId is WonFlowId =>
            practitionerId !==
            undefined,
        ),
    );

  for (
    const practitionerId of
    candidate
      .eligiblePractitionerIds
  ) {
    if (
      !activePractitionerIds.has(
        practitionerId,
      )
    ) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        `The selected clinician is not an active organization practitioner: ${practitionerId}`,
        operationName,
      );
    }
  }

  if (
    candidate.practitionerId !==
      undefined &&
    !candidate
      .eligiblePractitionerIds
      .includes(
        candidate.practitionerId,
      )
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "The service-specific clinician must also be eligible to deliver it.",
      operationName,
    );
  }
}

function validatePracticeServiceOffering(
  repositories:
    WonFlowPracticeRepositories,
  scope:
    WonFlowOrganizationScope,
  candidate:
    PracticeServiceOfferingCandidate,
  excludeOfferingId:
    WonFlowId | undefined,
  operationName: string,
): {
  service:
    PracticeService;

  location:
    WonFlowPracticeResourceMap[
      "practiceLocations"
    ];
} {
  const service =
    getRequiredRecord(
      repositories,
      "practiceServices",
      scope,
      candidate.practiceServiceId,
      operationName,
    );

  const location =
    getRequiredRecord(
      repositories,
      "practiceLocations",
      scope,
      candidate.practiceLocationId,
      operationName,
    );

  if (
    service.status ===
      "archived" ||
    location.status ===
      "archived"
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "An offering cannot use an archived service or location.",
      operationName,
    );
  }

  if (
    candidate.publiclyBookable
  ) {
    if (
      !service.publicVisible ||
      !service.publiclyBookable
    ) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Enable public visibility and booking on the service first.",
        operationName,
      );
    }

    if (
      !location.publicVisible ||
      !location.publicBookingEnabled
    ) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "Enable public visibility and patient booking on the location first.",
        operationName,
      );
    }

    const supportsAServiceMode =
      service.consultationModes.some(
        (mode) =>
          location
            .supportedConsultationModes
            .includes(mode),
      );

    if (!supportsAServiceMode) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "The location does not support any consultation mode configured for this service.",
        operationName,
      );
    }
  }

  if (
    candidate.status ===
      "active"
  ) {
    const overlappingOffering =
      listAllRecords(
        repositories,
        "serviceOfferings",
        scope,
        (offering) =>
          offering.id !==
            excludeOfferingId &&
          offering.status ===
            "active" &&
          offering
            .practiceServiceId ===
            candidate
              .practiceServiceId &&
          offering
            .practiceLocationId ===
            candidate
              .practiceLocationId &&
          doServiceOfferingWindowsOverlap(
            offering,
            candidate,
          ),
      )[0];

    if (
      overlappingOffering !==
      undefined
    ) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "An active offering already covers this service, location and effective period.",
        operationName,
      );
    }
  }

  return {
    service,
    location,
  };
}

function getAuthorizedPracticeTeamManager(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  careTeamId: WonFlowId,
  actorTeamMemberId: WonFlowId,
  at: IsoDateTime,
  operationName: string,
): PracticeTeamMember {
  const actor = getRequiredRecord(
    repositories,
    "teamMembers",
    scope,
    actorTeamMemberId,
    operationName,
  );

  if (
    actor.careTeamId !== careTeamId ||
    !isPracticeTeamMemberActive(actor) ||
    !hasPracticePrivilege(actor, "team.manage", at)
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "The acting team member cannot manage this care team.",
      operationName,
    );
  }

  return actor;
}

function assertPracticeTeamMemberLocations(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  candidate: Pick<
    PracticeTeamMemberManagementCandidate,
    "allPracticeLocations" | "practiceLocationIds"
  >,
  operationName: string,
): void {
  if (
    candidate.allPracticeLocations &&
    candidate.practiceLocationIds.length > 0
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Do not select individual locations when all locations are enabled.",
      operationName,
    );
  }

  if (
    new Set(candidate.practiceLocationIds).size !==
    candidate.practiceLocationIds.length
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Practice-location assignments must be unique.",
      operationName,
    );
  }

  for (const practiceLocationId of candidate.practiceLocationIds) {
    const location = getRequiredRecord(
      repositories,
      "practiceLocations",
      scope,
      practiceLocationId,
      operationName,
    );

    if (location.status === "archived") {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "A team member cannot be assigned to an archived location.",
        operationName,
      );
    }
  }
}

function assertPracticeTeamMemberSupervisor(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  careTeamId: WonFlowId,
  targetTeamMemberId: WonFlowId,
  candidate: Pick<
    PracticeTeamMemberManagementCandidate,
    "supervisionLevel" | "supervisorTeamMemberId"
  >,
  at: IsoDateTime,
  operationName: string,
): void {
  if (
    candidate.supervisionLevel === "countersigned" &&
    candidate.supervisorTeamMemberId === undefined
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "A countersigned member requires a supervisor.",
      operationName,
    );
  }

  if (
    candidate.supervisionLevel !== "countersigned" &&
    candidate.supervisorTeamMemberId !== undefined
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Only countersigned members may have a supervisor.",
      operationName,
    );
  }

  const supervisorTeamMemberId = candidate.supervisorTeamMemberId;
  if (supervisorTeamMemberId === undefined) return;

  if (supervisorTeamMemberId === targetTeamMemberId) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "A team member cannot supervise themselves.",
      operationName,
    );
  }

  const supervisor = getRequiredRecord(
    repositories,
    "teamMembers",
    scope,
    supervisorTeamMemberId,
    operationName,
  );

  if (
    supervisor.careTeamId !== careTeamId ||
    !isPracticeTeamMemberActive(supervisor) ||
    supervisor.supervisionLevel !== "independent" ||
    !hasPracticePrivilege(
      supervisor,
      "consultations.countersign",
      at,
    )
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "The selected supervisor cannot countersign work for this care team.",
      operationName,
    );
  }
}

function hasActivePracticeTeamManager(
  members: readonly PracticeTeamMember[],
  at: IsoDateTime,
): boolean {
  return members.some(
    (member) =>
      isPracticeTeamMemberActive(member) &&
      hasPracticePrivilege(member, "team.manage", at),
  );
}

function assertLastPracticeTeamManagerRemains(
  existingMembers: readonly PracticeTeamMember[],
  replacement: PracticeTeamMember,
  at: IsoDateTime,
  operationName: string,
): void {
  const projectedMembers = existingMembers.map((member) =>
    member.id === replacement.id ? replacement : member,
  );

  if (!hasActivePracticeTeamManager(projectedMembers, at)) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "This change would remove the final active member with team-management permission.",
      operationName,
    );
  }
}

function getAuthorizedTenantOwner(
  repositories: WonFlowPracticeRepositories,
  scope: WonFlowOrganizationScope,
  actorUserId: WonFlowId,
  at: IsoDateTime,
  operationName: string,
): OrganizationOwnerAssignment {
  const assignment = getActiveOrganizationOwnerAssignments(
    listAllRecords(
      repositories,
      "ownerAssignments",
      scope,
    ),
    at,
  ).find((candidate) => candidate.ownerUserId === actorUserId);

  if (assignment === undefined) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Only an active organization owner may manage tenant policies and content.",
      operationName,
    );
  }

  return assignment;
}

function getNextTenantVersion(
  records: readonly { version: string }[],
): string {
  const existingVersions = new Set(
    records.map((record) => record.version),
  );
  let candidate = records.length + 1;
  while (existingVersions.has(String(candidate))) {
    candidate += 1;
  }
  return String(candidate);
}

function assertVersionLifecycle(
  status: "draft" | "scheduled" | "active" | "retired",
  effectiveFrom: IsoDateTime | undefined,
  effectiveTo: IsoDateTime | undefined,
  now: IsoDateTime,
  operationName: string,
): void {
  if (status === "retired") {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "A newly created version cannot begin as retired.",
      operationName,
    );
  }
  if (
    (status === "active" || status === "scheduled") &&
    effectiveFrom === undefined
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Active and scheduled versions require an effective start time.",
      operationName,
    );
  }
  if (effectiveTo !== undefined && effectiveFrom === undefined) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "An effective end time requires an effective start time.",
      operationName,
    );
  }
  if (
    effectiveFrom !== undefined &&
    effectiveTo !== undefined &&
    effectiveTo <= effectiveFrom
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "The effective end time must be after the start time.",
      operationName,
    );
  }
  if (
    status === "scheduled" &&
    effectiveFrom !== undefined &&
    effectiveFrom <= now
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Scheduled content must begin after the current service time.",
      operationName,
    );
  }
  if (
    status === "active" &&
    effectiveFrom !== undefined &&
    effectiveFrom > now
  ) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Future content must use scheduled status.",
      operationName,
    );
  }
}

const TENANT_TEMPLATE_VARIABLE_PATTERN =
  /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g;

function extractTenantTemplateVariableNames(
  template: string,
): string[] {
  return Array.from(
    template.matchAll(TENANT_TEMPLATE_VARIABLE_PATTERN),
  )
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
}

function assertTenantTemplateVariables(
  template: TenantNotificationTemplateVersionCandidate,
  operationName: string,
): void {
  const declaredNames = template.variables.map(
    (variable) => variable.name,
  );
  if (new Set(declaredNames).size !== declaredNames.length) {
    throw new WonFlowMockServiceError(
      "invalid-query",
      "Notification-template variable names must be unique.",
      operationName,
    );
  }
  const referencedNames = new Set(
    extractTenantTemplateVariableNames(
      [template.subjectTemplate ?? "", template.bodyTemplate].join("\n"),
    ),
  );
  const declaredNameSet = new Set(declaredNames);
  for (const referencedName of referencedNames) {
    if (!declaredNameSet.has(referencedName)) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        `Template variable is not declared: ${referencedName}`,
        operationName,
      );
    }
  }
  for (const variable of template.variables) {
    if (variable.required && !referencedNames.has(variable.name)) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        `Required template variable is not referenced: ${variable.name}`,
        operationName,
      );
    }
  }
}

function mapPracticeServiceCategoryToAppointmentType(
  category: PracticeService["category"],
): AppointmentType {
  switch (category) {
    case "initial-consultation": return "new-consultation";
    case "follow-up-consultation":
    case "post-operative-review": return "follow-up";
    case "teleconsultation": return "telemedicine";
    case "report-review": return "diagnostic";
    case "procedure": return "procedure";
    case "dietitian-consultation": return "therapy";
    case "home-visit": return "home-care";
    case "multidisciplinary-review":
    case "other": return "other";
  }
}

function mapPracticeBookingChannel(
  channel: Exclude<PracticeAppointment["bookingChannel"], "public-page">,
): Appointment["bookingChannel"] {
  switch (channel) {
    case "staff": return "reception";
    case "phone": return "call-centre";
    case "walk-in": return "walk-in";
    case "patient-portal":
    case "mobile-app": return "patient-access";
  }
}

function isPaymentProviderEligible(
  provider: PaymentProviderConfig,
  location: PracticeLocation,
  offering: PracticeServiceOffering,
  patientFacing: boolean,
): boolean {
  return (
    provider.status === "active" &&
    (provider.allPracticeLocations || provider.practiceLocationIds.includes(location.id)) &&
    (provider.allServiceOfferings || provider.practiceServiceOfferingIds.includes(offering.id)) &&
    provider.supportedCurrencyCodes.includes(offering.fee.currencyCode) &&
    (!patientFacing || provider.patientFacing) &&
    (provider.collectionMode !== "online" || location.onlinePaymentEnabled)
  );
}

export function createInMemoryWonFlowPracticeService(
  options:
    CreateInMemoryPracticeServiceOptions = {},
): WonFlowPracticeService {
  const repositories =
    options.repositories ??
    createWonFlowPracticeRepositories();

  const adapter =
    options.adapter ??
    createWonFlowMockAsyncAdapter(
      options.adapterOptions,
    );

  const clock =
    options.clock ??
    createDefaultClock();

  const idFactory =
    options.idFactory ??
    createDefaultIdFactory();

  const resources =
    createResourceServices(
      repositories,
      adapter,
      clock,
      idFactory,
    );

  interface UploadSession { organizationId: WonFlowId; actorAccountId: WonFlowId; patientId: WonFlowId; fileName: string; mimeType: string; sizeBytes: number; categoryCode: string; clinicalDate: string; requestId?: WonFlowId; fingerprint: string; uploadedBytes: number; nextChunkIndex: number; chunks: Map<number,string>; expiresAt: IsoDateTime; completedDocumentId?: WonFlowId }
  const patientDocumentUploads = new Map<WonFlowId, UploadSession>();
  const patientDocumentAccess = new Map<string, { organizationId: WonFlowId; actorAccountId: WonFlowId; patientId: WonFlowId; documentId: WonFlowId; expiresAt: IsoDateTime }>();
  const publicBookingResumes = new Map<string,{organizationId:WonFlowId;draft:import("./public-booking-service").PublicBookingResumeDraft;expiresAt:IsoDateTime;idempotencyKey:string}>();
  const documentCategories = ["previous-visit","prescription","laboratory-report","radiology-report","histopathology-report","discharge-summary","referral","medical-certificate","consent","patient-instruction","consultation-summary","other"] as const satisfies readonly PracticeDocumentCategory[];
  const uploadPolicy = { acceptedMimeTypes: ["application/pdf","image/jpeg","image/png","image/heic"], maximumFileSizeBytes: 25 * 1024 * 1024, chunkSizeBytes: 1024 * 1024, maximumFilesPerUpload: 1, categories: documentCategories.map((code) => ({ code, label: code.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) })) };

  function invalidBooking(message: string, operationName: string): never {
    throw new WonFlowMockServiceError("invalid-query", message, operationName);
  }

  function authorizeBookingActor(
    scope: WonFlowOrganizationScope,
    actor: PracticeBookingActor,
    patientId: WonFlowId,
    channel: Exclude<PracticeAppointment["bookingChannel"], "public-page">,
    now: IsoDateTime,
    operationName: string,
  ): void {
    if (actor.type === "team-member") {
      const member = repositories.teamMembers.get(scope, actor.teamMemberId);
      if (
        member === undefined || member.userId !== actor.userId ||
        !hasPracticePrivilege(member, "appointments.book", now) ||
        (channel !== "staff" && channel !== "phone" && channel !== "walk-in")
      ) invalidBooking("The team member is not authorized for this booking channel.", operationName);
      return;
    }
    const account = repositories.patientAccounts.get(scope, actor.patientAccountId);
    const linked = listAllRecords(repositories, "patientAccountLinks", scope).some((link) =>
      link.patientAccountId === actor.patientAccountId && link.patientId === patientId && link.status === "active",
    );
    if (
      account?.status !== "active" || !linked ||
      (channel !== "patient-portal" && channel !== "mobile-app")
    ) invalidBooking("The patient account is not authorized for this booking channel.", operationName);
  }

  function resolveBookingContext(
    scope: WonFlowOrganizationScope,
    input: {
      patientId: WonFlowId;
      practiceLocationId: WonFlowId;
      practiceServiceId: WonFlowId;
      practiceServiceOfferingId: WonFlowId;
      consultationMode: PracticeAppointment["consultationMode"];
      assignedTeamMemberId?: WonFlowId;
      bookingChannel: Exclude<PracticeAppointment["bookingChannel"], "public-page">;
    },
    now: IsoDateTime,
    operationName: string,
  ) {
    if (repositories.patients.get(scope, input.patientId) === undefined) invalidBooking("The patient was not found.", operationName);
    const location = repositories.practiceLocations.get(scope, input.practiceLocationId);
    const service = repositories.practiceServices.get(scope, input.practiceServiceId);
    const offering = repositories.serviceOfferings.get(scope, input.practiceServiceOfferingId);
    if (location?.status !== "active") invalidBooking("The booking location is not active.", operationName);
    if (service?.status !== "active") invalidBooking("The booking service is not active.", operationName);
    if (
      offering?.status !== "active" || offering.practiceLocationId !== location.id ||
      offering.practiceServiceId !== service.id || offering.effectiveFrom > now ||
      (offering.effectiveTo !== undefined && offering.effectiveTo < now)
    ) invalidBooking("The service offering is not currently available at this location.", operationName);
    if (!location.supportedConsultationModes.includes(input.consultationMode) || !service.consultationModes.includes(input.consultationMode)) {
      invalidBooking("The consultation mode is not supported by both service and location.", operationName);
    }
    const settings = listAllRecords(repositories, "tenantPolicySettings", scope)[0];
    const policy = resolvePracticeBookingPolicy(
      listAllRecords(repositories, "bookingPolicies", scope),
      settings?.defaultBookingPolicyId,
      location.id,
      service.id,
      offering.id,
    );
    const clinicians = resolvePracticeBookingClinicians(
      listAllRecords(repositories, "teamMembers", scope), service, location.id, now,
    );
    const teamMember = input.assignedTeamMemberId === undefined
      ? (clinicians.length === 1 ? clinicians[0] : undefined)
      : clinicians.find((member) => member.id === input.assignedTeamMemberId);
    if (input.assignedTeamMemberId !== undefined && teamMember === undefined) invalidBooking("The selected clinician is not eligible for this service.", operationName);
    return { location, service, offering, policy, clinicians, teamMember };
  }

  function isPatientPayNowProvider(
    provider: PaymentProviderConfig,
    location: PracticeLocation,
    offering: PracticeServiceOffering,
    currencyCode: string,
  ): boolean {
    return provider.status === "active" && provider.patientFacing &&
      provider.collectionMode === "online" && location.onlinePaymentEnabled &&
      (provider.allPracticeLocations || provider.practiceLocationIds.includes(location.id)) &&
      (provider.allServiceOfferings || provider.practiceServiceOfferingIds.includes(offering.id)) &&
      provider.supportedCurrencyCodes.includes(currencyCode);
  }

  function getCancellationConsequence(
    scope: WonFlowOrganizationScope,
    now: IsoDateTime,
  ) {
    const settings = listAllRecords(repositories, "tenantPolicySettings", scope)[0];
    if (settings?.cancellationPolicyContentBlockId === undefined) return undefined;
    const block = repositories.tenantContentBlocks.get(scope, settings.cancellationPolicyContentBlockId);
    if (
      block === undefined || block.status !== "active" ||
      (block.effectiveFrom !== undefined && block.effectiveFrom > now) ||
      (block.effectiveTo !== undefined && block.effectiveTo < now)
    ) return undefined;
    return {
      contentBlockId: block.id,
      version: block.version,
      ...(block.title === undefined ? {} : { title: block.title }),
      body: block.body,
    };
  }

  function buildPatientAppointmentViewItem(
    scope: WonFlowOrganizationScope,
    context: ReturnType<typeof getAuthorizedPatientAppointmentContext>,
    now: IsoDateTime,
  ): PatientAppointmentViewItem {
    const {
      appointment, practiceAppointment, location, service, offering, policy, assignedTeamMember,
    } = context;
    const paymentIntents = listAllRecords(repositories, "paymentIntents", scope)
      .filter((intent) => intent.appointmentId === appointment.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const paymentRecords = listAllRecords(repositories, "paymentRecords", scope)
      .filter((record) => record.appointmentId === appointment.id);
    const cancellations = listAllRecords(repositories, "appointmentCancellations", scope)
      .filter((record) => record.appointmentId === appointment.id);
    const rescheduleRequests = listAllRecords(repositories, "appointmentRescheduleRequests", scope)
      .filter((record) => record.appointmentId === appointment.id);
    const rescheduleHistory = listAllRecords(repositories, "appointmentRescheduleEvents", scope)
      .filter((record) => record.appointmentId === appointment.id);
    const statusHistory = listAllRecords(repositories, "appointmentStatusEvents", scope)
      .filter((record) => record.appointmentId === appointment.id)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    const activeStatuses: readonly Appointment["status"][] = ["awaiting-payment", "confirmed", "reminder-sent"];
    const statusAllowsPatientAction = activeStatuses.includes(appointment.status) && appointment.scheduledStartAt > now;
    const withinFreeWindow = statusAllowsPatientAction && canCancelWithoutCharge(practiceAppointment, policy, now);
    const cancellationConsequence = statusAllowsPatientAction && !withinFreeWindow
      ? getCancellationConsequence(scope, now)
      : undefined;
    const cancellationDeadline = new Date(
      Date.parse(appointment.scheduledStartAt) - policy.cancellationWindowMinutes * 60_000,
    ).toISOString();
    const canCancel = statusAllowsPatientAction && (withinFreeWindow || cancellationConsequence !== undefined);
    const remainingReschedules = Math.max(0, policy.maximumReschedules - practiceAppointment.rescheduleCount);
    const canReschedule = statusAllowsPatientAction && remainingReschedules > 0 && practiceAppointment.practiceSlotId !== undefined;
    const payNowProviders = listAllRecords(repositories, "paymentProviders", scope).filter((provider) =>
      isPatientPayNowProvider(provider, location, offering, practiceAppointment.quotedFee.currencyCode),
    );
    const terminalPaymentStatuses: readonly Appointment["status"][] = [
      "cancelled", "completed", "expired", "no-show", "entered-in-error",
    ];
    const paymentEligible = !terminalPaymentStatuses.includes(appointment.status) &&
      (practiceAppointment.paymentState === "unpaid" || practiceAppointment.paymentState === "pending") &&
      practiceAppointment.quotedFee.amountMinorUnits > 0 &&
      (offering.paymentTiming === "at-booking" || offering.paymentTiming === "before-appointment") &&
      location.onlinePaymentEnabled;
    const canPayNow = paymentEligible && payNowProviders.length > 0;
    const actions: PatientAppointmentActionState = {
      canCancel,
      cancellationKind: !statusAllowsPatientAction
        ? "not-allowed"
        : withinFreeWindow
          ? "free"
          : cancellationConsequence === undefined
            ? "not-allowed"
            : "outside-free-window",
      cancellationDeadline,
      ...(cancellationConsequence === undefined ? {} : { cancellationConsequence }),
      ...(!canCancel ? { cancellationUnavailableReason: statusAllowsPatientAction ? "Cancellation policy content is not currently configured." : "This appointment can no longer be cancelled online." } : {}),
      canReschedule,
      remainingReschedules,
      ...(!canReschedule ? { rescheduleUnavailableReason: remainingReschedules === 0 ? "The configured reschedule limit has been reached." : "This appointment can no longer be rescheduled online." } : {}),
      canPayNow,
      payNowProviders,
      ...(!canPayNow ? { payNowUnavailableReason: paymentEligible ? "No compatible online payment provider is configured." : "Online payment is not available for this appointment." } : {}),
    };
    return {
      appointment,
      practiceAppointment,
      location,
      service,
      offering,
      policy,
      ...(assignedTeamMember === undefined ? {} : { assignedTeamMember }),
      ...(paymentIntents[0] === undefined ? {} : { paymentIntent: paymentIntents[0] }),
      paymentRecords,
      cancellations,
      rescheduleRequests,
      rescheduleHistory,
      statusHistory,
      actions,
    };
  }

  function requirePlatformReason(
    reason: string,
    operationName: string,
  ): string {
    const normalized = reason.trim();
    if (normalized.length === 0) {
      throw new WonFlowMockServiceError(
        "invalid-query",
        "A reason is required for this platform operation.",
        operationName,
      );
    }
    return normalized;
  }

  const lifecycleSuspensionReasonPrefix =
    "Platform lifecycle suspension: ";

  function buildPlatformTenantOverview(
    scope: WonFlowOrganizationScope,
  ) {
    return {
      provisioningRequests: listAllRecords(
        repositories,
        "provisioningRequests",
        scope,
      ),
      subscription: listAllRecords(
        repositories,
        "subscriptions",
        scope,
      )[0],
      ownerAssignments: listAllRecords(
        repositories,
        "ownerAssignments",
        scope,
      ),
      ownerInvitations: listAllRecords(
        repositories,
        "ownerInvitations",
        scope,
      ),
      onboardingState: listAllRecords(
        repositories,
        "onboardingStates",
        scope,
      )[0],
      moduleEntitlements: listAllRecords(
        repositories,
        "moduleEntitlements",
        scope,
      ),
      moduleActivations: listAllRecords(
        repositories,
        "moduleActivations",
        scope,
      ),
      usageSnapshots: listAllRecords(
        repositories,
        "usageSnapshots",
        scope,
      ),
      controlActions: listAllRecords(
        repositories,
        "platformControlActions",
        scope,
      ),
      supportAccessSessions: listAllRecords(
        repositories,
        "supportAccessSessions",
        scope,
      ),
      supportAccessAuditEvents: listAllRecords(
        repositories,
        "supportAccessAuditEvents",
        scope,
      ).sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      ),
    };
  }

  function appendPlatformControlAction(
    scope: WonFlowOrganizationScope,
    input: Omit<
      PracticeCreateInput<PlatformControlAction>,
      "status" | "requestedAt" | "startedAt" | "completedAt"
    >,
    now: IsoDateTime,
  ): PlatformControlAction {
    const id = idFactory.next(
      platformControlActionPersistenceDescriptor.domain,
    );
    const action = platformControlActionPersistenceDescriptor.create(
      scope,
      {
        ...input,
        status: "completed",
        requestedAt: now,
        startedAt: now,
        completedAt: now,
      },
      id,
      now,
    );
    return repositories.platformControlActions.create(
      scope,
      action.id,
      action,
    );
  }

  function appendSupportAccessAuditEvent(
    scope: WonFlowOrganizationScope,
    input: Omit<
      PracticeCreateInput<SupportAccessAuditEvent>,
      "occurredAt"
    >,
    now: IsoDateTime,
  ): SupportAccessAuditEvent {
    const id = idFactory.next(
      supportAccessAuditEventPersistenceDescriptor.domain,
    );
    const event = supportAccessAuditEventPersistenceDescriptor.create(
      scope,
      { ...input, occurredAt: now },
      id,
      now,
    );
    return repositories.supportAccessAuditEvents.create(
      scope,
      event.id,
      event,
    );
  }

  const service: WonFlowPracticeService = {
    ...resources,

    getPublicBookingEntry(scope,input,signal){const operationName="getPublicBookingEntry";return adapter.execute(()=>{const provisioning=listAllRecords(repositories,"provisioningRequests",scope)[0];const appointmentModule=listAllRecords(repositories,"moduleActivations",scope).find((item)=>item.moduleCode==="APPOINTMENTS"&&item.status==="enabled");const profile=listAllRecords(repositories,"tenantProfiles",scope).find((item)=>item.status==="active");if(provisioning?.status!=="active"||appointmentModule===undefined||profile===undefined)throw new WonFlowMockServiceError("not-found","The public booking page is unavailable.",operationName);const locations=listAllRecords(repositories,"practiceLocations",scope).filter((item)=>item.status==="active"&&item.publicVisible&&item.publicBookingEnabled);const services=listAllRecords(repositories,"practiceServices",scope).filter((item)=>item.status==="active"&&item.publicVisible&&item.publiclyBookable&&item.deliveryScope!=="unassigned");const offerings=listAllRecords(repositories,"serviceOfferings",scope).filter((item)=>item.status==="active"&&item.publiclyBookable&&item.effectiveFrom<=input.now&&(item.effectiveTo===undefined||item.effectiveTo>input.now));const members=listAllRecords(repositories,"teamMembers",scope);const terms=listAllRecords(repositories,"tenantContentBlocks",scope).filter((item)=>item.purpose==="booking-terms"&&item.status==="active"&&(item.effectiveFrom===undefined||item.effectiveFrom<=input.now)&&(item.effectiveTo===undefined||item.effectiveTo>input.now)).sort((a,b)=>b.version.localeCompare(a.version))[0];if(terms===undefined)throw new WonFlowMockServiceError("not-found","The public booking page is unavailable.",operationName);return{branding:{organizationId:scope.organizationId,displayName:profile.displayName,specialtyDescription:profile.specialtyDescription,logoAssetToken:profile.logoReference,primaryColor:profile.colours.primary,accentColor:profile.colours.accent??profile.colours.secondary??profile.colours.primary,backgroundColor:profile.colours.background??"#ffffff",textColor:profile.colours.foreground??"#0f172a",publicContactPhone:profile.publicContact.phoneNumber,publicContactEmail:profile.publicContact.email,publicSiteUrl:profile.publicSiteUrl,timeZone:profile.timeZone,defaultCurrency:profile.defaultCurrencyCode,supportedLanguages:profile.supportedLanguageCodes},locations:locations.map((location)=>({id:location.id,name:location.name,kindLabel:location.type.replaceAll("-"," "),addressLines:location.address?[location.address.addressLine1,...(location.address.addressLine2?[location.address.addressLine2]:[])]:[],locality:location.address?.city,region:location.address?.stateOrProvince,postalCode:location.address?.postalCode,clinicScheduleLabel:"Available appointment times",patientInstructions:location.patientDirections,consultationModeLabels:location.supportedConsultationModes.map((mode)=>mode.replaceAll("-"," "))})),services:offerings.flatMap((offering)=>{const practiceService=services.find((item)=>item.id===offering.practiceServiceId);const location=locations.find((item)=>item.id===offering.practiceLocationId);if(!practiceService||!location)return[];const clinicians=resolvePracticeBookingClinicians(members,practiceService,location.id,input.now);return[{serviceId:practiceService.id,offeringId:offering.id,locationId:location.id,name:practiceService.name,description:practiceService.description,categoryLabel:practiceService.category.replaceAll("-"," "),durationMinutes:offering.durationOverrideMinutes??practiceService.defaultDurationMinutes,consultationModes:practiceService.consultationModes.filter((mode)=>location.supportedConsultationModes.includes(mode)),eligibilityLabels:practiceService.eligibility.map((item)=>item.replaceAll("-"," ")),preparationInstructions:practiceService.preparationInstructions,requiresDocumentUpload:practiceService.requiresDocumentUpload,fee:offering.fee,feeCollectorLabel:offering.feeCollector.replaceAll("-"," "),paymentTimingLabel:offering.paymentTiming.replaceAll("-"," "),requiresPrepayment:offering.paymentTiming==="at-booking",clinicians:clinicians.map((member)=>({teamMemberId:member.id,displayName:member.displayName}))}] }),content:{bookingTermsTitle:terms.title??"Booking terms",bookingTermsBody:terms.body,bookingTermsVersion:Number.parseInt(terms.version,10)||1,accountRequirementLabel:"Sign in or create an account to confirm this appointment."},publicBookingEnabled:true};},{signal,operationName})},
    getPublicBookingSlots(scope,input,signal){const operationName="getPublicBookingSlots";return adapter.execute(()=>{const offering=getRequiredRecord(repositories,"serviceOfferings",scope,input.offeringId,operationName);const location=getRequiredRecord(repositories,"practiceLocations",scope,offering.practiceLocationId,operationName);const practiceService=getRequiredRecord(repositories,"practiceServices",scope,offering.practiceServiceId,operationName);if(offering.status!=="active"||!offering.publiclyBookable||practiceService.status!=="active"||!practiceService.publiclyBookable||location.status!=="active"||!location.publicBookingEnabled||!practiceService.consultationModes.includes(input.consultationMode as DoctorConsultationMode)||!location.supportedConsultationModes.includes(input.consultationMode as DoctorConsultationMode))throw new WonFlowMockServiceError("not-found","The booking option is unavailable.",operationName);const members=resolvePracticeBookingClinicians(listAllRecords(repositories,"teamMembers",scope),practiceService,location.id,input.now);const member=input.clinicianTeamMemberId===undefined?undefined:members.find((item)=>item.id===input.clinicianTeamMemberId);if(input.clinicianTeamMemberId!==undefined&&member===undefined)throw new WonFlowMockServiceError("not-found","The clinician is unavailable.",operationName);const policy=resolvePracticeBookingPolicy(listAllRecords(repositories,"bookingPolicies",scope),listAllRecords(repositories,"tenantPolicySettings",scope)[0]?.defaultBookingPolicyId,location.id,practiceService.id,offering.id);const from=getPracticeLocalDate(new Date(input.now),location.timezone);const to=addPracticeCalendarDays(from,location.bookingHorizonDays);return generatePracticeBookingSlots({organizationId:scope.organizationId,location,service:practiceService,offering,policy,sessions:listAllRecords(repositories,"clinicSessions",scope),overrides:listAllRecords(repositories,"scheduleOverrides",scope),appointments:listAllRecords(repositories,"appointments",scope),consultationMode:input.consultationMode as DoctorConsultationMode,bookingChannel:"patient-portal",teamMember:member,dateFrom:from,dateTo:to,now:input.now}).filter((slot)=>slot.remainingCount>0).map((slot)=>({slotId:slot.id,serviceId:practiceService.id,offeringId:offering.id,locationId:location.id,clinicianTeamMemberId:slot.assignedTeamMemberId,startsAt:slot.startsAt,endsAt:slot.endsAt,localDateLabel:new Intl.DateTimeFormat("en",{dateStyle:"medium",timeZone:location.timezone}).format(new Date(slot.startsAt)),localTimeLabel:new Intl.DateTimeFormat("en",{timeStyle:"short",timeZone:location.timezone}).format(new Date(slot.startsAt)),remainingCapacity:slot.remainingCount}));},{signal,operationName})},
    createPublicBookingResumeToken(scope,input,signal){const operationName="createPublicBookingResumeToken";return adapter.execute(()=>{if(input.draft.organizationId!==scope.organizationId||!input.idempotencyKey.trim())throw new WonFlowMockServiceError("invalid-query","The booking selection is invalid.",operationName);const slot=getRequiredRecord(repositories,"practiceSlots",scope,input.draft.slotId,operationName);if(slot.practiceLocationId!==input.draft.locationId||slot.practiceServiceId!==input.draft.serviceId||slot.practiceServiceOfferingId!==input.draft.offeringId||slot.remainingCount<=0)throw new WonFlowMockServiceError("not-found","The booking selection is no longer available.",operationName);const existing=[...publicBookingResumes.entries()].find(([,item])=>item.organizationId===scope.organizationId&&item.idempotencyKey===input.idempotencyKey&&item.expiresAt>input.now);const token=existing?.[0]??idFactory.next("public-booking-resume");const expiresAt=existing?.[1].expiresAt??new Date(Date.parse(input.now)+15*60*1000).toISOString() as IsoDateTime;if(!existing)publicBookingResumes.set(token,{organizationId:scope.organizationId,draft:input.draft,expiresAt,idempotencyKey:input.idempotencyKey});return{token,expiresAt,registrationPath:`/patient/register?resume=${encodeURIComponent(token)}`,signInPath:`/auth/login?resume=${encodeURIComponent(token)}`};},{signal,operationName})},
    resolvePublicBookingResumeToken(scope,input,signal){const operationName="resolvePublicBookingResumeToken";return adapter.execute(()=>{const record=publicBookingResumes.get(input.token);if(record===undefined||record.organizationId!==scope.organizationId||record.expiresAt<=input.now)throw new WonFlowMockServiceError("not-found","The booking continuation is unavailable or expired.",operationName);return{draft:record.draft,expiresAt:record.expiresAt};},{signal,operationName})},

    getClinicianDocumentInbox(_scope,_input,signal){const operationName="getClinicianDocumentInbox";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    openClinicianDocument(_scope,_input,signal){const operationName="openClinicianDocument";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    saveClinicianDocumentReview(_scope,_input,signal){const operationName="saveClinicianDocumentReview";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    createPracticeDocumentRequest(_scope,_input,signal){const operationName="createPracticeDocumentRequest";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    getPracticeConsultationCompletionView(_scope,_consultationId,_actor,signal){const operationName="getPracticeConsultationCompletionView";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    savePracticeConsultationCompletion(_scope,_input,signal){const operationName="savePracticeConsultationCompletion";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    getPracticeCountersignatureQueue(_scope,_actor,signal){const operationName="getPracticeCountersignatureQueue";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    countersignPracticeConsultation(_scope,_input,signal){const operationName="countersignPracticeConsultation";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    createPracticeConsultationAmendment(_scope,_input,signal){const operationName="createPracticeConsultationAmendment";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    getPatientMessageWorkspace(_scope,_actor,signal){const operationName="getPatientMessageWorkspace";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated patient workflow session is required.",operationName)},{signal,operationName})},
    acknowledgePracticeMessageSafety(_scope,_input,signal){const operationName="acknowledgePracticeMessageSafety";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated patient workflow session is required.",operationName)},{signal,operationName})},
    createPatientMessageThread(_scope,_input,signal){const operationName="createPatientMessageThread";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated patient workflow session is required.",operationName)},{signal,operationName})},
    sendPatientMessage(_scope,_input,signal){const operationName="sendPatientMessage";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated patient workflow session is required.",operationName)},{signal,operationName})},
    getPracticeMessageTriageWorkspace(_scope,_actor,_practiceLocationId,signal){const operationName="getPracticeMessageTriageWorkspace";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    savePracticeMessageTriage(_scope,_input,signal){const operationName="savePracticeMessageTriage";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    sendPracticeMessageReply(_scope,_input,signal){const operationName="sendPracticeMessageReply";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},
    countersignPracticeMessageReply(_scope,_input,signal){const operationName="countersignPracticeMessageReply";return adapter.execute(()=>{throw new WonFlowMockServiceError("invalid-query","An authenticated clinician workflow session is required.",operationName)},{signal,operationName})},

    getPatientDocumentWorkspace(scope, input, signal) {
      const operationName = "getPatientDocumentWorkspace";
      return adapter.execute(() => {
        const now = clock.now();
        getAuthorizedPatientContext(repositories, scope, input.actor.patientAccountId, input.actor.patientId, now, operationName);
        const files = listAllRecords(repositories, "documentFiles", scope);
        const releases = listAllRecords(repositories, "documentReleases", scope);
        const requests = listAllRecords(repositories, "documentRequests", scope).filter((request) => request.patientId === input.actor.patientId);
        const documents = listAllRecords(repositories, "practiceDocuments", scope)
          .filter((document) => document.patientId === input.actor.patientId && document.lifecycleStatus !== "archived" && document.lifecycleStatus !== "entered-in-error")
          .filter((document) => document.uploadedByPatientAccountId === input.actor.patientAccountId || document.visibility === "patient-visible" || releases.some((release) => release.practiceDocumentId === document.id && release.revokedAt === undefined && release.visibility === "patient-visible"))
          .sort(comparePracticeDocumentsByDate)
          .map((document): PatientDocumentTimelineItem => {
            const file = files.find((candidate) => candidate.id === document.currentFileId);
            const clean = file?.scanStatus === "clean" || file?.scanStatus === "not-required";
            const patientUpload = document.uploadedByPatientAccountId === input.actor.patientAccountId;
            const visibility = patientUpload ? "patient-upload" : document.visibility === "patient-visible" ? "released-to-patient" : "private-clinical";
            const scanStatus = clean ? "clean" : file?.scanStatus === "infected" ? "quarantined" : file?.scanStatus === "failed" ? "failed" : "pending";
            return { id: document.id, title: document.title, categoryCode: document.category, categoryLabel: uploadPolicy.categories.find((item) => item.code === document.category)?.label ?? document.category, clinicalDate: document.clinicalDate ?? document.createdAt.slice(0,10), uploadedAt: file?.uploadedAt ?? document.createdAt, mimeType: file?.mimeType ?? "application/octet-stream", sizeBytes: file?.fileSizeBytes ?? 0, scanStatus, visibility, sourceLabel: patientUpload ? "Uploaded by you" : "Released by your care team", openable: clean && visibility !== "private-clinical" };
          });
        return { documents, requests: requests.map((request) => ({ id: request.id, title: request.title, instructions: request.instructions, requestedCategoryCode: request.category, requestedCategoryLabel: uploadPolicy.categories.find((item) => item.code === request.category)?.label, requestedAt: request.requestedAt, dueAt: request.dueAt, status: request.status === "partially-fulfilled" ? "open" : request.status })), uploadPolicy };
      }, { signal, operationName });
    },

    beginPatientDocumentUpload(scope, input, signal) {
      const operationName = "beginPatientDocumentUpload";
      return adapter.execute(() => {
        const now = clock.now();
        getAuthorizedPatientContext(repositories, scope, input.actor.patientAccountId, input.actor.patientId, now, operationName);
        if (!uploadPolicy.acceptedMimeTypes.includes(input.mimeType.toLowerCase()) || input.sizeBytes <= 0 || input.sizeBytes > uploadPolicy.maximumFileSizeBytes) throw new WonFlowMockServiceError("invalid-query", "The file does not meet the patient document upload policy.", operationName);
        if (!documentCategories.includes(input.categoryCode as PracticeDocumentCategory)) throw new WonFlowMockServiceError("invalid-query", "The document category is not active.", operationName);
        if (input.requestId !== undefined) { const request = getRequiredRecord(repositories, "documentRequests", scope, input.requestId, operationName); if (request.patientId !== input.actor.patientId || !["open","partially-fulfilled"].includes(request.status)) throw new WonFlowMockServiceError("not-found", "The document request is not available.", operationName); }
        const existing = [...patientDocumentUploads.entries()].find(([, upload]) => upload.organizationId === scope.organizationId && upload.actorAccountId === input.actor.patientAccountId && upload.patientId === input.actor.patientId && upload.fingerprint === input.clientFingerprint && upload.completedDocumentId === undefined && upload.expiresAt > now);
        if (existing !== undefined) return { uploadId: existing[0], chunkSizeBytes: uploadPolicy.chunkSizeBytes, nextChunkIndex: existing[1].nextChunkIndex, expiresAt: existing[1].expiresAt };
        const uploadId = idFactory.next("patient-document-upload"); const expiresAt = new Date(Date.parse(now) + 24*60*60*1000).toISOString() as IsoDateTime;
        patientDocumentUploads.set(uploadId, { organizationId: scope.organizationId, actorAccountId: input.actor.patientAccountId, patientId: input.actor.patientId, fileName: input.fileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, categoryCode: input.categoryCode, clinicalDate: input.clinicalDate, requestId: input.requestId, fingerprint: input.clientFingerprint, uploadedBytes: 0, nextChunkIndex: 0, chunks: new Map(), expiresAt });
        return { uploadId, chunkSizeBytes: uploadPolicy.chunkSizeBytes, nextChunkIndex: 0, expiresAt };
      }, { signal, operationName });
    },

    uploadPatientDocumentChunk(scope, input, signal) {
      const operationName = "uploadPatientDocumentChunk";
      return adapter.execute(() => {
        const now=clock.now();getAuthorizedPatientContext(repositories,scope,input.actor.patientAccountId,input.actor.patientId,now,operationName);const upload=patientDocumentUploads.get(input.uploadId);if(upload===undefined||upload.organizationId!==scope.organizationId||upload.actorAccountId!==input.actor.patientAccountId||upload.patientId!==input.actor.patientId)throw new WonFlowMockServiceError("not-found","The upload session was not found.",operationName);if(upload.expiresAt<=now)throw new WonFlowMockServiceError("invalid-query","The upload session has expired.",operationName);const accepted=upload.chunks.get(input.chunkIndex);if(accepted!==undefined){if(accepted!==input.chunkChecksum)throw new WonFlowMockServiceError("invalid-query","The repeated chunk checksum does not match.",operationName);return {uploadId:input.uploadId,nextChunkIndex:upload.nextChunkIndex,uploadedBytes:upload.uploadedBytes,totalBytes:upload.sizeBytes}}if(input.chunkIndex!==upload.nextChunkIndex||input.offsetBytes!==upload.uploadedBytes||input.chunkSizeBytes<=0||input.offsetBytes+input.chunkSizeBytes>upload.sizeBytes||input.chunkChecksum.trim()==="")throw new WonFlowMockServiceError("invalid-query","The upload chunk is stale or invalid.",operationName);upload.chunks.set(input.chunkIndex,input.chunkChecksum);upload.uploadedBytes+=input.chunkSizeBytes;upload.nextChunkIndex+=1;return {uploadId:input.uploadId,nextChunkIndex:upload.nextChunkIndex,uploadedBytes:upload.uploadedBytes,totalBytes:upload.sizeBytes};
      }, { signal, operationName });
    },

    completePatientDocumentUpload(scope, input, signal) {
      const operationName="completePatientDocumentUpload";return adapter.execute(()=>{const now=clock.now();getAuthorizedPatientContext(repositories,scope,input.actor.patientAccountId,input.actor.patientId,now,operationName);const upload=patientDocumentUploads.get(input.uploadId);if(upload===undefined||upload.organizationId!==scope.organizationId||upload.actorAccountId!==input.actor.patientAccountId||upload.patientId!==input.actor.patientId)throw new WonFlowMockServiceError("not-found","The upload session was not found.",operationName);if(upload.completedDocumentId!==undefined){const existing=getRequiredRecord(repositories,"practiceDocuments",scope,upload.completedDocumentId,operationName);return {id:existing.id,title:existing.title,categoryCode:existing.category,categoryLabel:uploadPolicy.categories.find((item)=>item.code===existing.category)?.label??existing.category,clinicalDate:existing.clinicalDate??now.slice(0,10),uploadedAt:existing.createdAt,mimeType:upload.mimeType,sizeBytes:upload.sizeBytes,scanStatus:"pending",visibility:"patient-upload",sourceLabel:"Uploaded by you",requestId:upload.requestId,openable:false};}if(upload.uploadedBytes!==upload.sizeBytes||input.finalChecksum.trim()==="")throw new WonFlowMockServiceError("invalid-query","The upload is incomplete.",operationName);const documentId=idFactory.next("practice-document");const fileId=idFactory.next("practice-document-file");const document:PracticeDocument={id:documentId,organizationId:scope.organizationId,patientId:upload.patientId,category:upload.categoryCode as PracticeDocumentCategory,source:"patient-upload",title:upload.fileName,clinicalDate:upload.clinicalDate,fileIds:[fileId],currentFileId:fileId,reviewDisposition:"unreviewed",visibility:"patient-visible",lifecycleStatus:"processing",uploadedByPatientAccountId:upload.actorAccountId,createdAt:now,updatedAt:now};const file:PracticeDocumentFile={id:fileId,organizationId:scope.organizationId,practiceDocumentId:documentId,fileName:upload.fileName,mimeType:upload.mimeType,fileSizeBytes:upload.sizeBytes,checksumSha256:input.finalChecksum,storageKey:`pending/${documentId}/${fileId}`,scanStatus:"pending",uploadedAt:now,createdAt:now,updatedAt:now};repositories.practiceDocuments.create(scope,document.id,document);repositories.documentFiles.create(scope,file.id,file);upload.completedDocumentId=document.id;if(upload.requestId!==undefined){const request=getRequiredRecord(repositories,"documentRequests",scope,upload.requestId,operationName);repositories.documentRequests.replace(scope,request.id,{...request,status:"fulfilled",fulfilledDocumentIds:[...request.fulfilledDocumentIds,document.id],fulfilledAt:now,updatedAt:now});}return {id:document.id,title:document.title,categoryCode:document.category,categoryLabel:uploadPolicy.categories.find((item)=>item.code===document.category)?.label??document.category,clinicalDate:upload.clinicalDate,uploadedAt:now,mimeType:file.mimeType,sizeBytes:file.fileSizeBytes,scanStatus:"pending",visibility:"patient-upload",sourceLabel:"Uploaded by you",requestId:upload.requestId,openable:false};},{signal,operationName});
    },

    issuePatientDocumentReadAccess(scope,input,signal){const operationName="issuePatientDocumentReadAccess";return adapter.execute(()=>{const now=clock.now();getAuthorizedPatientContext(repositories,scope,input.actor.patientAccountId,input.actor.patientId,now,operationName);const document=getRequiredRecord(repositories,"practiceDocuments",scope,input.documentId,operationName);if(document.patientId!==input.actor.patientId)throw new WonFlowMockServiceError("not-found","The document was not found.",operationName);const file=getRequiredRecord(repositories,"documentFiles",scope,document.currentFileId??"",operationName);if(!["clean","not-required"].includes(file.scanStatus)||document.visibility!=="patient-visible")throw new WonFlowMockServiceError("invalid-query","The document is not available to open.",operationName);const accessToken=idFactory.next("patient-document-access");const expiresAt=new Date(Date.parse(now)+5*60*1000).toISOString() as IsoDateTime;patientDocumentAccess.set(accessToken,{organizationId:scope.organizationId,actorAccountId:input.actor.patientAccountId,patientId:input.actor.patientId,documentId:document.id,expiresAt});return {accessToken,documentId:document.id,expiresAt};},{signal,operationName});},
    resolvePatientDocumentReadAccess(scope,input,signal){const operationName="resolvePatientDocumentReadAccess";return adapter.execute(async()=>{const now=clock.now();getAuthorizedPatientContext(repositories,scope,input.actor.patientAccountId,input.actor.patientId,now,operationName);const access=patientDocumentAccess.get(input.accessToken);if(access===undefined||access.organizationId!==scope.organizationId||access.actorAccountId!==input.actor.patientAccountId||access.patientId!==input.actor.patientId||access.expiresAt<=now)throw new WonFlowMockServiceError("not-found","The document access token is invalid or expired.",operationName);const workspace=await service.getPatientDocumentWorkspace(scope,{actor:input.actor});const document=workspace.documents.find((item)=>item.id===access.documentId);if(document===undefined||!document.openable)throw new WonFlowMockServiceError("not-found","The document is not available.",operationName);return {document,previewKind:document.mimeType==="application/pdf"?"pdf":document.mimeType.startsWith("image/")?"image":"download-only",expiresAt:access.expiresAt};},{signal,operationName});},

    getPracticeBookingOptions(scope, input: GetPracticeBookingOptionsInput, signal) {
      const operationName = "getPracticeBookingOptions";
      return adapter.execute(() => {
        const now = clock.now();
        authorizeBookingActor(scope, input.actor, input.patientId, input.bookingChannel, now, operationName);
        const patientFacing = input.actor.type === "patient-account";
        const locations = listAllRecords(repositories, "practiceLocations", scope).filter((location) =>
          location.status === "active" &&
          (!patientFacing || (location.publicVisible && location.publicBookingEnabled)),
        );
        const services = listAllRecords(repositories, "practiceServices", scope);
        const sessions = listAllRecords(repositories, "clinicSessions", scope);
        const policies = listAllRecords(repositories, "bookingPolicies", scope);
        const settings = listAllRecords(repositories, "tenantPolicySettings", scope)[0];
        const members = listAllRecords(repositories, "teamMembers", scope);
        const providers = listAllRecords(repositories, "paymentProviders", scope);
        const offerings: PracticeBookingOfferingOption[] = [];
        for (const offering of listAllRecords(repositories, "serviceOfferings", scope)) {
          const location = locations.find((candidate) => candidate.id === offering.practiceLocationId);
          const practiceService = services.find((candidate) => candidate.id === offering.practiceServiceId);
          if (
            location === undefined || practiceService?.status !== "active" || offering.status !== "active" ||
            offering.effectiveFrom > now || (offering.effectiveTo !== undefined && offering.effectiveTo < now) ||
            (patientFacing && (!practiceService.publicVisible || !practiceService.publiclyBookable || practiceService.deliveryScope === "unassigned" || !offering.publiclyBookable))
          ) continue;
          const consultationModes = practiceService.consultationModes.filter((mode) => location.supportedConsultationModes.includes(mode));
          const hasSession = sessions.some((session) =>
            session.status === "active" && session.practiceLocationId === location.id &&
            (patientFacing ? session.allowOnlineBooking : input.bookingChannel === "walk-in" ? session.allowWalkIns : session.allowStaffBooking),
          );
          if (consultationModes.length === 0 || !hasSession) continue;
          const policy = resolvePracticeBookingPolicy(policies, settings?.defaultBookingPolicyId, location.id, practiceService.id, offering.id);
          const clinicians = resolvePracticeBookingClinicians(members, practiceService, location.id, now).map((teamMember) => ({
            teamMember,
            practitionerId: teamMember.practitionerId!,
          }));
          if (clinicians.length === 0) continue;
          offerings.push({
            location,
            service: practiceService,
            offering,
            policy,
            effectiveMinimumBookingNoticeMinutes: Math.max(location.minimumBookingNoticeMinutes, policy.minimumBookingNoticeMinutes),
            bookingHorizonDays: location.bookingHorizonDays,
            consultationModes,
            clinicians,
            paymentProviders: providers.filter((provider) => isPaymentProviderEligible(provider, location, offering, patientFacing)),
            requiresPrepayment: policy.enforcePrepayment || offering.paymentTiming === "at-booking",
          });
        }
        const availableLocationIds = new Set(offerings.map((option) => option.location.id));
        return { locations: locations.filter((location) => availableLocationIds.has(location.id)), offerings };
      }, { signal, operationName });
    },

    listPracticeBookingSlots(scope, input: ListPracticeBookingSlotsInput, signal) {
      const operationName = "listPracticeBookingSlots";
      return adapter.execute(() => {
        const now = clock.now();
        authorizeBookingActor(scope, input.actor, input.patientId, input.bookingChannel, now, operationName);
        const context = resolveBookingContext(scope, input, now, operationName);
        const firstDate = getPracticeLocalDate(new Date(now), context.location.timezone);
        const lastDate = addPracticeCalendarDays(firstDate, context.location.bookingHorizonDays);
        if (input.dateFrom > input.dateTo || input.dateFrom < firstDate || input.dateTo > lastDate) {
          invalidBooking("The requested date range is outside the location booking horizon.", operationName);
        }
        if (context.teamMember === undefined) invalidBooking("Select an eligible clinician before listing slots.", operationName);
        const generated = generatePracticeBookingSlots({
          organizationId: scope.organizationId,
          location: context.location,
          service: context.service,
          offering: context.offering,
          policy: context.policy,
          sessions: listAllRecords(repositories, "clinicSessions", scope),
          overrides: listAllRecords(repositories, "scheduleOverrides", scope),
          appointments: listAllRecords(repositories, "appointments", scope),
          consultationMode: input.consultationMode,
          bookingChannel: input.bookingChannel,
          teamMember: context.teamMember,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          now,
        });
        return generated.map((slot) => {
          const existing = repositories.practiceSlots.get(scope, slot.id);
          if (existing === undefined) return repositories.practiceSlots.create(scope, slot.id, slot);
          const bookedCount = listAllRecords(repositories, "practiceAppointments", scope).filter((appointment) =>
            appointment.practiceSlotId === slot.id && !["cancelled", "expired", "entered-in-error"].includes(appointment.status),
          ).length;
          const refreshed: PracticeSlot = {
            ...existing,
            bookedCount,
            remainingCount: Math.max(0, existing.capacity - existing.reservedCount - bookedCount),
            status: existing.capacity - existing.reservedCount - bookedCount > 0 ? "available" : "booked",
            updatedAt: now,
          };
          repositories.practiceSlots.replace(scope, existing.id, refreshed);
          return refreshed;
        }).filter((slot) => slot.status === "available" && slot.remainingCount > 0);
      }, { signal, operationName });
    },

    confirmPracticeBooking(scope, input: ConfirmPracticeBookingInput, signal): Promise<ConfirmPracticeBookingResult> {
      const operationName = "confirmPracticeBooking";
      return adapter.execute(() => {
        const now = clock.now();
        authorizeBookingActor(scope, input.actor, input.patientId, input.bookingChannel, now, operationName);
        const existingPracticeAppointment = listAllRecords(repositories, "practiceAppointments", scope)
          .find((appointment) => appointment.idempotencyKey === input.idempotencyKey);
        if (existingPracticeAppointment !== undefined) {
          const existingAppointment = repositories.appointments.get(scope, existingPracticeAppointment.appointmentId);
          const slot = existingPracticeAppointment.practiceSlotId === undefined ? undefined : repositories.practiceSlots.get(scope, existingPracticeAppointment.practiceSlotId);
          const location = repositories.practiceLocations.get(scope, existingPracticeAppointment.practiceLocationId);
          const practiceService = repositories.practiceServices.get(scope, existingPracticeAppointment.practiceServiceId);
          const offering = repositories.serviceOfferings.get(scope, existingPracticeAppointment.practiceServiceOfferingId);
          const policy = repositories.bookingPolicies.get(scope, existingPracticeAppointment.practiceBookingPolicyId);
          const sameDocuments = [...existingPracticeAppointment.attachedDocumentIds].sort().join("|") === [...input.attachedDocumentIds].sort().join("|");
          const existingPaymentIntent = existingAppointment === undefined ? undefined : listAllRecords(repositories, "paymentIntents", scope)
            .find((intent) => intent.appointmentId === existingAppointment.id);
          const matches = existingAppointment !== undefined && slot !== undefined && location !== undefined && practiceService !== undefined && offering !== undefined && policy !== undefined &&
            existingAppointment.patientId === input.patientId && existingPracticeAppointment.practiceLocationId === input.practiceLocationId &&
            existingPracticeAppointment.practiceServiceId === input.practiceServiceId && existingPracticeAppointment.practiceServiceOfferingId === input.practiceServiceOfferingId &&
            existingPracticeAppointment.practiceSlotId === input.practiceSlotId &&
            (input.assignedTeamMemberId === undefined || existingPracticeAppointment.assignedTeamMemberId === input.assignedTeamMemberId) &&
            existingPracticeAppointment.consultationMode === input.consultationMode && existingPracticeAppointment.bookingChannel === input.bookingChannel &&
            existingAppointment.priority === input.priority && existingAppointment.reasonForAppointment === input.reasonForAppointment &&
            existingAppointment.patientNotes === input.patientNotes &&
            (existingPaymentIntent === undefined || existingPaymentIntent.paymentProviderConfigId === input.paymentProviderConfigId) && sameDocuments;
          if (!matches) invalidBooking("The idempotency key was already used for different booking data.", operationName);
          const paymentIntent = existingPaymentIntent;
          return {
            appointment: existingAppointment,
            practiceAppointment: existingPracticeAppointment,
            slot,
            location,
            service: practiceService,
            offering,
            policy,
            ...(paymentIntent === undefined ? {} : { paymentIntent }),
            requiresPrepayment: policy.enforcePrepayment || offering.paymentTiming === "at-booking",
          };
        }
        const context = resolveBookingContext(scope, input, now, operationName);
        if (context.teamMember === undefined) invalidBooking("Select an eligible clinician before confirming.", operationName);
        const slot = repositories.practiceSlots.get(scope, input.practiceSlotId);
        if (
          slot === undefined || slot.practiceLocationId !== context.location.id || slot.practiceServiceId !== context.service.id ||
          slot.practiceServiceOfferingId !== context.offering.id || slot.consultationMode !== input.consultationMode ||
          slot.assignedTeamMemberId !== context.teamMember.id
        ) invalidBooking("The selected slot does not match the current booking configuration.", operationName);
        const session = repositories.clinicSessions.get(scope, slot.practiceClinicSessionId);
        const channelAllowed = session !== undefined && (
          input.bookingChannel === "patient-portal" || input.bookingChannel === "mobile-app"
            ? session.allowOnlineBooking
            : input.bookingChannel === "walk-in"
              ? session.allowWalkIns
              : session.allowStaffBooking
        );
        if (session?.status !== "active" || !channelAllowed || (session.practitionerId !== undefined && session.practitionerId !== context.teamMember.practitionerId)) {
          invalidBooking("The clinic session or clinician is no longer available.", operationName);
        }
        const currentSlots = generatePracticeBookingSlots({
          organizationId: scope.organizationId,
          location: context.location,
          service: context.service,
          offering: context.offering,
          policy: context.policy,
          sessions: [session],
          overrides: listAllRecords(repositories, "scheduleOverrides", scope),
          appointments: listAllRecords(repositories, "appointments", scope),
          consultationMode: input.consultationMode,
          bookingChannel: input.bookingChannel,
          teamMember: context.teamMember,
          dateFrom: getPracticeLocalDate(new Date(slot.startsAt), context.location.timezone),
          dateTo: getPracticeLocalDate(new Date(slot.startsAt), context.location.timezone),
          now,
        });
        if (!currentSlots.some((candidate) => candidate.id === slot.id && candidate.startsAt === slot.startsAt && candidate.endsAt === slot.endsAt)) {
          invalidBooking("The selected slot changed or is no longer available.", operationName);
        }
        const effectivePolicy = { ...context.policy, minimumBookingNoticeMinutes: Math.max(context.location.minimumBookingNoticeMinutes, context.policy.minimumBookingNoticeMinutes) };
        const localToday = getPracticeLocalDate(new Date(now), context.location.timezone);
        const horizon = addPracticeCalendarDays(localToday, context.location.bookingHorizonDays);
        const slotDate = getPracticeLocalDate(new Date(slot.startsAt), context.location.timezone);
        if (!isPracticeSlotBookable(slot, effectivePolicy, now) || slotDate < localToday || slotDate > horizon) invalidBooking("The selected slot is no longer bookable.", operationName);
        const attachments = input.attachedDocumentIds.map((id) => repositories.practiceDocuments.get(scope, id));
        if (context.service.requiresDocumentUpload && attachments.length === 0) invalidBooking("Attach the required document before confirming the booking.", operationName);
        if (attachments.some((document) => document === undefined || document.patientId !== input.patientId)) invalidBooking("Every attached document must belong to the selected patient.", operationName);
        if (attachments.some((document) => {
          if (document === undefined || document.lifecycleStatus !== "available" || document.currentFileId === undefined) return true;
          const file = repositories.documentFiles.get(scope, document.currentFileId);
          const visibleToPatient = input.actor.type !== "patient-account" || document.uploadedByPatientAccountId === input.actor.patientAccountId || document.visibility === "patient-visible";
          return file === undefined || !["clean", "not-required"].includes(file.scanStatus) || !visibleToPatient;
        })) invalidBooking("Every attached document must be active, clean, and visible to the booking actor.", operationName);
        const activeAppointments = listAllRecords(repositories, "appointments", scope).filter((appointment) =>
          !["cancelled", "expired", "entered-in-error"].includes(appointment.status),
        );
        const overlaps = (appointment: Appointment) => appointment.scheduledStartAt < slot.endsAt && appointment.scheduledEndAt > slot.startsAt;
        if (activeAppointments.some((appointment) => appointment.patientId === input.patientId && overlaps(appointment))) invalidBooking("The patient already has an overlapping appointment.", operationName);
        if (activeAppointments.some((appointment) => appointment.practitionerId === context.teamMember!.practitionerId && overlaps(appointment))) invalidBooking("The clinician already has an overlapping appointment.", operationName);
        const requiresPrepayment = context.policy.enforcePrepayment || context.offering.paymentTiming === "at-booking";
        const noPayment = context.offering.fee.amountMinorUnits === 0 || context.offering.paymentTiming === "not-required";
        const provider = input.paymentProviderConfigId === undefined ? undefined : repositories.paymentProviders.get(scope, input.paymentProviderConfigId);
        if (requiresPrepayment && !noPayment && (provider === undefined || !isPaymentProviderEligible(provider, context.location, context.offering, input.actor.type === "patient-account"))) {
          invalidBooking("Select an eligible payment provider for prepayment.", operationName);
        }
        const appointmentId = idFactory.next(appointmentPersistenceDescriptor.domain);
        const awaitingPayment = requiresPrepayment && !noPayment;
        const appointment = appointmentPersistenceDescriptor.create(scope, {
          appointmentNumber: appointmentId,
          patientId: input.patientId,
          ...(context.location.linkedBranchId === undefined ? {} : { branchId: context.location.linkedBranchId }),
          practitionerId: context.teamMember.practitionerId,
          serviceCode: context.service.code,
          appointmentType: mapPracticeServiceCategoryToAppointmentType(context.service.category),
          bookingMethod: "time-slot",
          consultationMode: input.consultationMode,
          bookingChannel: mapPracticeBookingChannel(input.bookingChannel),
          priority: input.priority,
          status: awaitingPayment ? "awaiting-payment" : "confirmed",
          scheduleSessionId: session.id,
          appointmentSlotId: slot.id,
          reasonForAppointment: input.reasonForAppointment,
          patientNotes: input.patientNotes,
          scheduledStartAt: slot.startsAt,
          scheduledEndAt: slot.endsAt,
          paymentRequirement: noPayment ? "not-required" : requiresPrepayment ? "full-payment-required" : "optional",
          confirmationMethod: awaitingPayment ? undefined : input.actor.type === "patient-account" ? "patient-confirmed" : "staff-confirmed",
          confirmedAt: awaitingPayment ? undefined : now,
          ...(input.actor.type === "team-member" ? { createdByUserId: input.actor.userId } : { createdByPatientAccessAccountId: input.actor.patientAccountId }),
        }, appointmentId, now);
        const practiceAppointment = practiceAppointmentPersistenceDescriptor.create(scope, {
          appointmentId: appointment.id,
          idempotencyKey: input.idempotencyKey,
          practiceBookingPolicyId: context.policy.id,
          practiceLocationId: context.location.id,
          practiceServiceId: context.service.id,
          practiceServiceOfferingId: context.offering.id,
          practiceSlotId: slot.id,
          assignedTeamMemberId: context.teamMember.id,
          consultationMode: input.consultationMode,
          quotedFee: context.offering.fee,
          paymentState: noPayment ? "not-required" : awaitingPayment ? "pending" : "unpaid",
          bookingChannel: input.bookingChannel,
          attachedDocumentIds: [...input.attachedDocumentIds],
          rescheduleCount: 0,
          scheduledStartAt: slot.startsAt,
          scheduledEndAt: slot.endsAt,
          status: appointment.status,
        }, appointment.id, now);
        const paymentIntent = awaitingPayment && provider !== undefined
          ? paymentIntentPersistenceDescriptor.create(scope, {
              appointmentId: appointment.id,
              paymentProviderConfigId: provider.id,
              methodCode: provider.code,
              amount: context.offering.fee,
              status: "pending",
            }, idFactory.next(paymentIntentPersistenceDescriptor.domain), now)
          : undefined;
        const updatedSlot: PracticeSlot = {
          ...slot,
          bookedCount: slot.bookedCount + 1,
          remainingCount: slot.remainingCount - 1,
          status: slot.remainingCount - 1 > 0 ? "available" : "booked",
          updatedAt: now,
        };
        repositories.appointments.create(scope, appointment.id, appointment);
        repositories.practiceAppointments.create(scope, practiceAppointment.appointmentId, practiceAppointment);
        if (paymentIntent !== undefined) repositories.paymentIntents.create(scope, paymentIntent.id, paymentIntent);
        repositories.practiceSlots.replace(scope, updatedSlot.id, updatedSlot);
        return {
          appointment,
          practiceAppointment,
          slot: updatedSlot,
          location: context.location,
          service: context.service,
          offering: context.offering,
          policy: context.policy,
          ...(paymentIntent === undefined ? {} : { paymentIntent }),
          requiresPrepayment,
        };
      }, { signal, operationName });
    },

    getPatientAppointmentsView(scope, input: GetPatientAppointmentsViewInput, signal) {
      const operationName = "getPatientAppointmentsView";
      return adapter.execute(() => {
        const now = clock.now();
        const patientContext = getAuthorizedPatientContext(
          repositories, scope, input.patientAccountId, input.patientId, now, operationName,
        );
        const practiceAppointmentIds = new Set(
          listAllRecords(repositories, "practiceAppointments", scope).map((appointment) => appointment.appointmentId),
        );
        const items = listAllRecords(repositories, "appointments", scope)
          .filter((appointment) => appointment.patientId === input.patientId && practiceAppointmentIds.has(appointment.id))
          .map((appointment) => getAuthorizedPatientAppointmentContext(
            repositories, scope, input.patientAccountId, input.patientId, appointment.id, now, operationName,
          ))
          .map((context) => buildPatientAppointmentViewItem(scope, context, now));
        const terminalStatuses: readonly Appointment["status"][] = [
          "completed", "cancelled", "no-show", "expired", "entered-in-error",
        ];
        const upcoming = items
          .filter((item) => item.appointment.scheduledStartAt >= now && !terminalStatuses.includes(item.appointment.status))
          .sort((left, right) => left.appointment.scheduledStartAt.localeCompare(right.appointment.scheduledStartAt));
        const past = items
          .filter((item) => !upcoming.includes(item))
          .sort((left, right) => right.appointment.scheduledStartAt.localeCompare(left.appointment.scheduledStartAt));
        return {
          account: patientContext.account,
          accountLink: patientContext.accountLink,
          patient: patientContext.patient,
          upcoming,
          past,
        };
      }, { signal, operationName });
    },

    listPatientAppointmentRescheduleSlots(scope, input: ListPatientAppointmentRescheduleSlotsInput, signal) {
      const operationName = "listPatientAppointmentRescheduleSlots";
      return adapter.execute(() => {
        const now = clock.now();
        const context = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        const blockedStatuses: readonly Appointment["status"][] = [
          "patient-arrived", "checked-in", "in-progress", "completed", "cancelled", "no-show", "expired", "entered-in-error",
        ];
        if (blockedStatuses.includes(context.appointment.status) || context.appointment.scheduledStartAt <= now) {
          invalidBooking("This appointment can no longer be rescheduled.", operationName);
        }
        if (context.practiceAppointment.rescheduleCount >= context.policy.maximumReschedules) {
          invalidBooking("The configured reschedule limit has been reached.", operationName);
        }
        if (context.practiceAppointment.practiceSlotId === undefined || context.assignedTeamMember === undefined) {
          invalidBooking("The appointment does not have a reusable slot and clinician assignment.", operationName);
        }
        if (
          context.location.status !== "active" || !context.location.publicVisible || !context.location.publicBookingEnabled ||
          context.service.status !== "active" || !context.service.publicVisible || !context.service.publiclyBookable ||
          context.offering.status !== "active" || !context.offering.publiclyBookable ||
          context.offering.effectiveFrom > now ||
          (context.offering.effectiveTo !== undefined && context.offering.effectiveTo < now)
        ) invalidBooking("The original appointment configuration is no longer available for patient rescheduling.", operationName);
        const firstDate = getPracticeLocalDate(new Date(now), context.location.timezone);
        const lastDate = addPracticeCalendarDays(firstDate, context.location.bookingHorizonDays);
        if (input.dateFrom > input.dateTo || input.dateFrom < firstDate || input.dateTo > lastDate) {
          invalidBooking("The requested date range is outside the location booking horizon.", operationName);
        }
        const generated = generatePracticeBookingSlots({
          organizationId: scope.organizationId,
          location: context.location,
          service: context.service,
          offering: context.offering,
          policy: context.policy,
          sessions: listAllRecords(repositories, "clinicSessions", scope),
          overrides: listAllRecords(repositories, "scheduleOverrides", scope),
          appointments: listAllRecords(repositories, "appointments", scope).filter((appointment) => appointment.id !== context.appointment.id),
          consultationMode: context.practiceAppointment.consultationMode,
          bookingChannel: "patient-portal",
          teamMember: context.assignedTeamMember,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          now,
        }).filter((slot) => slot.id !== context.practiceAppointment.practiceSlotId);
        return generated.map((slot) => {
          const existing = repositories.practiceSlots.get(scope, slot.id);
          if (existing === undefined) return repositories.practiceSlots.create(scope, slot.id, slot);
          return repositories.practiceSlots.replace(scope, existing.id, {
            ...slot,
            createdAt: existing.createdAt,
          });
        });
      }, { signal, operationName });
    },

    reschedulePatientPracticeAppointment(scope, input: ReschedulePatientPracticeAppointmentInput, signal) {
      const operationName = "reschedulePatientPracticeAppointment";
      return adapter.execute(() => {
        const now = clock.now();
        const context = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        const oldSlotId = context.practiceAppointment.practiceSlotId;
        if (oldSlotId === undefined || oldSlotId === input.destinationPracticeSlotId) {
          invalidBooking("Choose a different generated appointment slot.", operationName);
        }
        if (context.practiceAppointment.rescheduleCount >= context.policy.maximumReschedules) {
          invalidBooking("The configured reschedule limit has been reached.", operationName);
        }
        const blockedStatuses: readonly Appointment["status"][] = [
          "patient-arrived", "checked-in", "in-progress", "completed", "cancelled", "no-show", "expired", "entered-in-error",
        ];
        if (blockedStatuses.includes(context.appointment.status) || context.appointment.scheduledStartAt <= now) {
          invalidBooking("This appointment can no longer be rescheduled.", operationName);
        }
        const oldSlot = getRequiredRecord(repositories, "practiceSlots", scope, oldSlotId, operationName);
        const destination = getRequiredRecord(repositories, "practiceSlots", scope, input.destinationPracticeSlotId, operationName);
        if (
          destination.practiceLocationId !== context.location.id || destination.practiceServiceId !== context.service.id ||
          destination.practiceServiceOfferingId !== context.offering.id ||
          destination.consultationMode !== context.practiceAppointment.consultationMode ||
          destination.assignedTeamMemberId !== context.practiceAppointment.assignedTeamMemberId
        ) invalidBooking("The destination slot must retain the same location, service, offering and clinician.", operationName);
        const destinationSession = getRequiredRecord(repositories, "clinicSessions", scope, destination.practiceClinicSessionId, operationName);
        if (
          destinationSession.status !== "active" || !destinationSession.allowOnlineBooking ||
          context.location.status !== "active" || context.service.status !== "active" || context.offering.status !== "active" ||
          context.assignedTeamMember === undefined ||
          !resolvePracticeBookingClinicians(
            listAllRecords(repositories, "teamMembers", scope), context.service, context.location.id, now,
          ).some((member) => member.id === context.assignedTeamMember?.id)
        ) invalidBooking("The appointment configuration or clinician is no longer available.", operationName);
        const effectivePolicy = {
          ...context.policy,
          minimumBookingNoticeMinutes: Math.max(context.location.minimumBookingNoticeMinutes, context.policy.minimumBookingNoticeMinutes),
        };
        const horizon = addPracticeCalendarDays(
          getPracticeLocalDate(new Date(now), context.location.timezone), context.location.bookingHorizonDays,
        );
        if (!isPracticeSlotBookable(destination, effectivePolicy, now) || getPracticeLocalDate(new Date(destination.startsAt), context.location.timezone) > horizon) {
          invalidBooking("The destination slot is no longer bookable.", operationName);
        }
        const destinationDate = getPracticeLocalDate(new Date(destination.startsAt), context.location.timezone);
        const currentDestination = generatePracticeBookingSlots({
          organizationId: scope.organizationId,
          location: context.location,
          service: context.service,
          offering: context.offering,
          policy: context.policy,
          sessions: [destinationSession],
          overrides: listAllRecords(repositories, "scheduleOverrides", scope),
          appointments: listAllRecords(repositories, "appointments", scope).filter((appointment) => appointment.id !== context.appointment.id),
          consultationMode: context.practiceAppointment.consultationMode,
          bookingChannel: "patient-portal",
          teamMember: context.assignedTeamMember,
          dateFrom: destinationDate,
          dateTo: destinationDate,
          now,
        }).find((slot) => slot.id === destination.id && slot.startsAt === destination.startsAt && slot.endsAt === destination.endsAt);
        if (currentDestination === undefined) invalidBooking("The destination slot changed or is no longer available.", operationName);
        const activeAppointments = listAllRecords(repositories, "appointments", scope).filter((appointment) =>
          appointment.id !== context.appointment.id && !["cancelled", "expired", "entered-in-error"].includes(appointment.status),
        );
        const overlaps = (appointment: Appointment) => appointment.scheduledStartAt < destination.endsAt && appointment.scheduledEndAt > destination.startsAt;
        if (activeAppointments.some((appointment) => appointment.patientId === input.patientId && overlaps(appointment))) {
          invalidBooking("The patient already has an overlapping appointment.", operationName);
        }
        if (activeAppointments.some((appointment) => appointment.practitionerId === destination.practitionerId && overlaps(appointment))) {
          invalidBooking("The clinician already has an overlapping appointment.", operationName);
        }
        const releasedOldSlot: PracticeSlot = {
          ...oldSlot,
          bookedCount: Math.max(0, oldSlot.bookedCount - 1),
          remainingCount: Math.min(oldSlot.capacity, oldSlot.remainingCount + 1),
          status: "available",
          updatedAt: now,
        };
        const consumedDestination: PracticeSlot = {
          ...destination,
          bookedCount: destination.bookedCount + 1,
          remainingCount: destination.remainingCount - 1,
          status: destination.remainingCount - 1 > 0 ? "available" : "booked",
          updatedAt: now,
        };
        const updatedAppointment = appointmentPersistenceDescriptor.update!(context.appointment, {
          appointmentSlotId: destination.id,
          scheduleSessionId: destinationSession.id,
          scheduledStartAt: destination.startsAt,
          scheduledEndAt: destination.endsAt,
          practitionerId: destination.practitionerId,
          branchId: context.location.linkedBranchId,
          branchDepartmentId: undefined,
          updatedByPatientAccessAccountId: input.patientAccountId,
        }, now);
        const updatedPracticeAppointment = practiceAppointmentPersistenceDescriptor.update!(context.practiceAppointment, {
          practiceSlotId: destination.id,
          scheduledStartAt: destination.startsAt,
          scheduledEndAt: destination.endsAt,
          rescheduleCount: context.practiceAppointment.rescheduleCount + 1,
          outcome: "rescheduled",
        }, now);
        const requestId = idFactory.next(appointmentRescheduleRequestPersistenceDescriptor.domain);
        const request = appointmentRescheduleRequestPersistenceDescriptor.create(scope, {
          appointmentId: context.appointment.id,
          status: "confirmed",
          requestedBy: context.accountLink.relationship === "self" ? "patient" : "guardian",
          requestedByPatientAccessAccountId: input.patientAccountId,
          reason: input.reason,
          fromBranchId: context.appointment.branchId,
          fromPractitionerId: context.appointment.practitionerId,
          fromAppointmentSlotId: oldSlot.id,
          fromScheduledStartAt: context.appointment.scheduledStartAt,
          fromScheduledEndAt: context.appointment.scheduledEndAt,
          preferredBranchIds: context.location.linkedBranchId === undefined ? [] : [context.location.linkedBranchId],
          preferredPractitionerIds: destination.practitionerId === undefined ? [] : [destination.practitionerId],
          selectedBranchId: context.location.linkedBranchId,
          selectedPractitionerId: destination.practitionerId,
          selectedAppointmentSlotId: destination.id,
          selectedStartAt: destination.startsAt,
          selectedEndAt: destination.endsAt,
          patientConfirmationRequired: false,
          requestedAt: now,
          confirmedAt: now,
        }, requestId, now);
        const event = appointmentRescheduleEventPersistenceDescriptor.create(scope, {
          appointmentId: context.appointment.id,
          rescheduleRequestId: request.id,
          fromBranchId: context.appointment.branchId,
          toBranchId: context.location.linkedBranchId,
          fromPractitionerId: context.appointment.practitionerId,
          toPractitionerId: destination.practitionerId,
          fromAppointmentSlotId: oldSlot.id,
          toAppointmentSlotId: destination.id,
          fromScheduledStartAt: context.appointment.scheduledStartAt,
          fromScheduledEndAt: context.appointment.scheduledEndAt,
          toScheduledStartAt: destination.startsAt,
          toScheduledEndAt: destination.endsAt,
          reason: input.reason,
          performedByPatientAccessAccountId: input.patientAccountId,
          performedBySystem: false,
          occurredAt: now,
        }, idFactory.next(appointmentRescheduleEventPersistenceDescriptor.domain), now);
        repositories.practiceSlots.replace(scope, oldSlot.id, releasedOldSlot);
        repositories.practiceSlots.replace(scope, destination.id, consumedDestination);
        repositories.appointments.replace(scope, updatedAppointment.id, updatedAppointment);
        repositories.practiceAppointments.replace(scope, updatedPracticeAppointment.appointmentId, updatedPracticeAppointment);
        repositories.appointmentRescheduleRequests.create(scope, request.id, request);
        repositories.appointmentRescheduleEvents.create(scope, event.id, event);
        const refreshed = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        return buildPatientAppointmentViewItem(scope, refreshed, now);
      }, { signal, operationName });
    },

    cancelPatientPracticeAppointment(scope, input: CancelPatientPracticeAppointmentInput, signal) {
      const operationName = "cancelPatientPracticeAppointment";
      return adapter.execute(() => {
        const now = clock.now();
        const context = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        const cancellableStatuses: readonly Appointment["status"][] = ["awaiting-payment", "confirmed", "reminder-sent"];
        if (!cancellableStatuses.includes(context.appointment.status) || context.appointment.scheduledStartAt <= now) {
          invalidBooking("This appointment can no longer be cancelled online.", operationName);
        }
        const withinFreeWindow = canCancelWithoutCharge(context.practiceAppointment, context.policy, now);
        const consequence = withinFreeWindow ? undefined : getCancellationConsequence(scope, now);
        if (!withinFreeWindow && consequence === undefined) {
          invalidBooking("Cancellation outside the free window is unavailable because policy content is not configured.", operationName);
        }
        if (!withinFreeWindow && !input.acknowledgeOutsideFreeWindow) {
          invalidBooking("Acknowledge the configured cancellation consequence before continuing.", operationName);
        }
        if (input.reasonCode === "other" && (input.reason === undefined || input.reason.trim() === "")) {
          invalidBooking("Enter a cancellation reason.", operationName);
        }
        const paymentRecords = listAllRecords(repositories, "paymentRecords", scope)
          .filter((record) => record.appointmentId === context.appointment.id);
        const intents = listAllRecords(repositories, "paymentIntents", scope)
          .filter((intent) => intent.appointmentId === context.appointment.id);
        const financialReviewRequired = !withinFreeWindow || paymentRecords.length > 0 ||
          intents.some((intent) => intent.status === "processing" || intent.status === "succeeded");
        const cancellation = appointmentCancellationPersistenceDescriptor.create(scope, {
          appointmentId: context.appointment.id,
          initiator: context.accountLink.relationship === "self" ? "patient" : "guardian",
          reasonCode: input.reasonCode,
          reason: input.reason,
          cancelledByPatientAccessAccountId: input.patientAccountId,
          withinFreeCancellationWindow: withinFreeWindow,
          ...(consequence === undefined ? {} : {
            consequenceContentBlockId: consequence.contentBlockId,
            consequenceContentVersion: consequence.version,
            consequenceTextSnapshot: consequence.body,
          }),
          financialReviewRequired,
          cancellationFeeApplied: false,
          refundRequired: false,
          patientNotificationRequired: true,
          cancelledAt: now,
        }, idFactory.next(appointmentCancellationPersistenceDescriptor.domain), now);
        const previousStatus = context.appointment.status;
        const updatedAppointment = appointmentPersistenceDescriptor.update!(context.appointment, {
          status: "cancelled",
          cancelledAt: now,
          updatedByPatientAccessAccountId: input.patientAccountId,
        }, now);
        const updatedPracticeAppointment = practiceAppointmentPersistenceDescriptor.update!(context.practiceAppointment, {
          status: "cancelled",
          outcome: "cancelled-by-patient",
        }, now);
        const statusEvent = appointmentStatusEventPersistenceDescriptor.create(scope, {
          appointmentId: context.appointment.id,
          previousStatus,
          newStatus: "cancelled",
          trigger: context.accountLink.relationship === "self" ? "patient-action" : "guardian-action",
          reason: input.reason,
          changedByPatientAccessAccountId: input.patientAccountId,
          changedBySystem: false,
          occurredAt: now,
        }, idFactory.next(appointmentStatusEventPersistenceDescriptor.domain), now);
        const slot = context.practiceAppointment.practiceSlotId === undefined
          ? undefined
          : repositories.practiceSlots.get(scope, context.practiceAppointment.practiceSlotId);
        repositories.appointments.replace(scope, updatedAppointment.id, updatedAppointment);
        repositories.practiceAppointments.replace(scope, updatedPracticeAppointment.appointmentId, updatedPracticeAppointment);
        if (slot !== undefined) {
          repositories.practiceSlots.replace(scope, slot.id, {
            ...slot,
            bookedCount: Math.max(0, slot.bookedCount - 1),
            remainingCount: Math.min(slot.capacity, slot.remainingCount + 1),
            status: "available",
            updatedAt: now,
          });
        }
        for (const intent of intents) {
          if (["draft", "pending", "requires-action"].includes(intent.status)) {
            repositories.paymentIntents.replace(scope, intent.id, paymentIntentPersistenceDescriptor.update!(intent, {
              status: "cancelled",
              cancelledAt: now,
              cancellationReason: "The appointment was cancelled by the patient account.",
            }, now));
          }
        }
        repositories.appointmentCancellations.create(scope, cancellation.id, cancellation);
        repositories.appointmentStatusEvents.create(scope, statusEvent.id, statusEvent);
        const refreshed = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        return buildPatientAppointmentViewItem(scope, refreshed, now);
      }, { signal, operationName });
    },

    preparePatientAppointmentPayment(scope, input: PreparePatientAppointmentPaymentInput, signal) {
      const operationName = "preparePatientAppointmentPayment";
      return adapter.execute(() => {
        const now = clock.now();
        const context = getAuthorizedPatientAppointmentContext(
          repositories, scope, input.patientAccountId, input.patientId, input.appointmentId, now, operationName,
        );
        const terminalStatuses: readonly Appointment["status"][] = ["cancelled", "completed", "expired", "no-show", "entered-in-error"];
        if (terminalStatuses.includes(context.appointment.status)) invalidBooking("Payment is unavailable for this appointment.", operationName);
        if (["paid", "waived", "refunded", "not-required"].includes(context.practiceAppointment.paymentState)) {
          invalidBooking("This appointment does not have an outstanding payable balance.", operationName);
        }
        if (
          context.practiceAppointment.quotedFee.amountMinorUnits <= 0 ||
          (context.offering.paymentTiming !== "at-booking" && context.offering.paymentTiming !== "before-appointment")
        ) invalidBooking("Online payment is not available for this appointment.", operationName);
        const provider = getRequiredRecord(repositories, "paymentProviders", scope, input.paymentProviderConfigId, operationName);
        if (!isPatientPayNowProvider(provider, context.location, context.offering, context.practiceAppointment.quotedFee.currencyCode)) {
          invalidBooking("The selected payment provider is not available for this appointment.", operationName);
        }
        const usableStatuses: readonly PracticePaymentIntent["status"][] = ["draft", "pending", "requires-action", "processing"];
        const existing = listAllRecords(repositories, "paymentIntents", scope).find((intent) =>
          intent.appointmentId === context.appointment.id && intent.paymentProviderConfigId === provider.id &&
          usableStatuses.includes(intent.status) && arePracticeMoneyValuesEqual(intent.amount, context.practiceAppointment.quotedFee),
        );
        let intent = existing;
        if (intent === undefined) {
          intent = paymentIntentPersistenceDescriptor.create(scope, {
            appointmentId: context.appointment.id,
            paymentProviderConfigId: provider.id,
            methodCode: provider.code,
            amount: context.practiceAppointment.quotedFee,
            status: "requires-action",
            gatewaySessionReference: idFactory.next("practice-payment-session"),
          }, idFactory.next(paymentIntentPersistenceDescriptor.domain), now);
          repositories.paymentIntents.create(scope, intent.id, intent);
        }
        if (context.practiceAppointment.paymentState !== "pending") {
          repositories.practiceAppointments.replace(scope, context.practiceAppointment.appointmentId,
            practiceAppointmentPersistenceDescriptor.update!(context.practiceAppointment, { paymentState: "pending" }, now));
        }
        return { intent, provider };
      }, { signal, operationName });
    },

    getTenantSettings(
      scope,
      signal,
    ) {
      return adapter.execute(
        () => ({
          profile:
            listAllRecords(
              repositories,
              "tenantProfiles",
              scope,
            )[0],

          policySettings:
            listAllRecords(
              repositories,
              "tenantPolicySettings",
              scope,
            )[0],

          contentBlocks:
            listAllRecords(
              repositories,
              "tenantContentBlocks",
              scope,
            ),

          notificationTemplates:
            listAllRecords(
              repositories,
              "tenantNotificationTemplates",
              scope,
            ),

          terminology:
            listAllRecords(
              repositories,
              "tenantTerminology",
              scope,
            ),
        }),
        {
          signal,

          operationName:
            "getTenantSettings",
        },
      );
    },

    getPracticePolicyContentManagementView(
      scope,
      actorUserId,
      signal,
    ) {
      const operationName =
        "getPracticePolicyContentManagementView";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            actorUserId,
            now,
            operationName,
          );
          return {
            settings: {
              profile: listAllRecords(
                repositories,
                "tenantProfiles",
                scope,
              )[0],
              policySettings: listAllRecords(
                repositories,
                "tenantPolicySettings",
                scope,
              )[0],
              contentBlocks: listAllRecords(
                repositories,
                "tenantContentBlocks",
                scope,
              ),
              notificationTemplates: listAllRecords(
                repositories,
                "tenantNotificationTemplates",
                scope,
              ),
              terminology: listAllRecords(
                repositories,
                "tenantTerminology",
                scope,
              ),
            },
            bookingPolicies: listAllRecords(
              repositories,
              "bookingPolicies",
              scope,
            ),
          };
        },
        { signal, operationName },
      );
    },

    savePracticeBookingPolicy(
      scope,
      input: SavePracticeBookingPolicyInput,
      signal,
    ) {
      const operationName = "savePracticeBookingPolicy";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            input.actorUserId,
            now,
            operationName,
          );
          const candidate: PracticeBookingPolicyCandidate = input.policy;

          if (candidate.practiceLocationId !== undefined) {
            const location = getRequiredRecord(
              repositories,
              "practiceLocations",
              scope,
              candidate.practiceLocationId,
              operationName,
            );
            if (location.status === "archived") {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A booking policy cannot target an archived location.",
                operationName,
              );
            }
          }

          if (candidate.practiceServiceId !== undefined) {
            const service = getRequiredRecord(
              repositories,
              "practiceServices",
              scope,
              candidate.practiceServiceId,
              operationName,
            );
            if (service.status === "archived") {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A booking policy cannot target an archived service.",
                operationName,
              );
            }
          }

          if (candidate.practiceServiceOfferingId !== undefined) {
            const offering = getRequiredRecord(
              repositories,
              "serviceOfferings",
              scope,
              candidate.practiceServiceOfferingId,
              operationName,
            );
            if (
              offering.practiceServiceId !== candidate.practiceServiceId ||
              offering.practiceLocationId !== candidate.practiceLocationId
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "The selected offering does not match the policy service and location.",
                operationName,
              );
            }
          }

          if (input.bookingPolicyId === undefined) {
            const id = idFactory.next(
              bookingPolicyPersistenceDescriptor.domain,
            );
            const policy = bookingPolicyPersistenceDescriptor.create(
              scope,
              candidate,
              id,
              now,
            );
            return repositories.bookingPolicies.create(
              scope,
              policy.id,
              policy,
            );
          }

          const current = getRequiredRecord(
            repositories,
            "bookingPolicies",
            scope,
            input.bookingPolicyId,
            operationName,
          );
          if (current.status === "archived") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An archived booking policy cannot be edited.",
              operationName,
            );
          }
          if (
            current.practiceLocationId !== candidate.practiceLocationId ||
            current.practiceServiceId !== candidate.practiceServiceId ||
            current.practiceServiceOfferingId !==
              candidate.practiceServiceOfferingId
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Create a new policy to change its location, service or offering scope.",
              operationName,
            );
          }
          const update = bookingPolicyPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Booking policies cannot be updated.",
              operationName,
            );
          }
          const replacement = update(current, candidate, now);
          return repositories.bookingPolicies.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    saveTenantPolicySettings(
      scope,
      input: SaveTenantPolicySettingsInput,
      signal,
    ) {
      const operationName = "saveTenantPolicySettings";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            input.actorUserId,
            now,
            operationName,
          );
          if (input.settings.defaultBookingPolicyId !== undefined) {
            getRequiredRecord(
              repositories,
              "bookingPolicies",
              scope,
              input.settings.defaultBookingPolicyId,
              operationName,
            );
          }
          const contentReferences = [
            {
              id: input.settings.cancellationPolicyContentBlockId,
              purpose: "cancellation-policy",
            },
            {
              id: input.settings.refundPolicyContentBlockId,
              purpose: "refund-policy",
            },
          ] as const;
          for (const reference of contentReferences) {
            if (reference.id === undefined) continue;
            const content = getRequiredRecord(
              repositories,
              "tenantContentBlocks",
              scope,
              reference.id,
              operationName,
            );
            if (content.purpose !== reference.purpose) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                `The selected content must use purpose "${reference.purpose}".`,
                operationName,
              );
            }
            if (content.status === "retired") {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A retired content version cannot be selected as an active policy reference.",
                operationName,
              );
            }
          }

          const existing = listAllRecords(
            repositories,
            "tenantPolicySettings",
            scope,
          );
          if (existing.length > 1) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The organization has more than one tenant-policy settings record.",
              operationName,
            );
          }
          const current = existing[0];
          if (current === undefined) {
            const id = idFactory.next(
              tenantPolicySettingsPersistenceDescriptor.domain,
            );
            const settings = tenantPolicySettingsPersistenceDescriptor.create(
              scope,
              {
                ...input.settings,
                updatedByUserId: input.actorUserId,
              },
              id,
              now,
            );
            return repositories.tenantPolicySettings.create(
              scope,
              settings.id,
              settings,
            );
          }
          const update = tenantPolicySettingsPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Tenant policy settings cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            current,
            {
              ...input.settings,
              updatedByUserId: input.actorUserId,
            },
            now,
          );
          return repositories.tenantPolicySettings.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    createTenantContentVersion(
      scope,
      input: CreateTenantContentVersionInput,
      signal,
    ) {
      const operationName = "createTenantContentVersion";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            input.actorUserId,
            now,
            operationName,
          );
          assertVersionLifecycle(
            input.content.status,
            input.content.effectiveFrom,
            input.content.effectiveTo,
            now,
            operationName,
          );
          const versions = listAllRecords(
            repositories,
            "tenantContentBlocks",
            scope,
            (content) =>
              content.purpose === input.content.purpose &&
              content.languageCode === input.content.languageCode,
          );
          let previous: TenantContentBlock | undefined;
          if (input.previousContentBlockId !== undefined) {
            previous = getRequiredRecord(
              repositories,
              "tenantContentBlocks",
              scope,
              input.previousContentBlockId,
              operationName,
            );
            if (
              previous.purpose !== input.content.purpose ||
              previous.languageCode !== input.content.languageCode
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A new version must keep the previous version's purpose and language.",
                operationName,
              );
            }
          } else if (versions.length > 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Select the content version being replaced.",
              operationName,
            );
          }
          const id = idFactory.next(
            tenantContentBlockPersistenceDescriptor.domain,
          );
          const content = tenantContentBlockPersistenceDescriptor.create(
            scope,
            {
              ...input.content,
              version: getNextTenantVersion(versions),
              supersedesContentBlockId: previous?.id,
              createdByUserId: input.actorUserId,
            },
            id,
            now,
          );
          return repositories.tenantContentBlocks.create(
            scope,
            content.id,
            content,
          );
        },
        { signal, operationName },
      );
    },

    createTenantNotificationTemplateVersion(
      scope,
      input: CreateTenantNotificationTemplateVersionInput,
      signal,
    ) {
      const operationName =
        "createTenantNotificationTemplateVersion";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            input.actorUserId,
            now,
            operationName,
          );
          assertVersionLifecycle(
            input.template.status,
            input.template.effectiveFrom,
            input.template.effectiveTo,
            now,
            operationName,
          );
          assertTenantTemplateVariables(input.template, operationName);
          const versions = listAllRecords(
            repositories,
            "tenantNotificationTemplates",
            scope,
            (template) =>
              template.eventCode === input.template.eventCode &&
              template.channel === input.template.channel &&
              template.languageCode === input.template.languageCode,
          );
          let previous: TenantNotificationTemplate | undefined;
          if (input.previousTemplateId !== undefined) {
            previous = getRequiredRecord(
              repositories,
              "tenantNotificationTemplates",
              scope,
              input.previousTemplateId,
              operationName,
            );
            if (
              previous.eventCode !== input.template.eventCode ||
              previous.channel !== input.template.channel ||
              previous.languageCode !== input.template.languageCode
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A new template version must keep the previous event, channel and language.",
                operationName,
              );
            }
          } else if (versions.length > 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Select the notification-template version being replaced.",
              operationName,
            );
          }
          const id = idFactory.next(
            tenantNotificationTemplatePersistenceDescriptor.domain,
          );
          const template =
            tenantNotificationTemplatePersistenceDescriptor.create(
              scope,
              {
                ...input.template,
                version: getNextTenantVersion(versions),
                supersedesTemplateId: previous?.id,
                createdByUserId: input.actorUserId,
              },
              id,
              now,
            );
          return repositories.tenantNotificationTemplates.create(
            scope,
            template.id,
            template,
          );
        },
        { signal, operationName },
      );
    },

    saveTenantTerminology(
      scope,
      input: SaveTenantTerminologyInput,
      signal,
    ) {
      const operationName = "saveTenantTerminology";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedTenantOwner(
            repositories,
            scope,
            input.actorUserId,
            now,
            operationName,
          );
          if (
            input.terminology.effectiveTo !== undefined &&
            input.terminology.effectiveFrom === undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A terminology end time requires a start time.",
              operationName,
            );
          }
          if (
            input.terminology.effectiveFrom !== undefined &&
            input.terminology.effectiveTo !== undefined &&
            input.terminology.effectiveTo <=
              input.terminology.effectiveFrom
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The terminology end time must be after its start time.",
              operationName,
            );
          }
          const duplicate = listAllRecords(
            repositories,
            "tenantTerminology",
            scope,
            (terminology) =>
              terminology.id !== input.terminologyId &&
              terminology.status !== "retired" &&
              terminology.termKey === input.terminology.termKey &&
              terminology.languageCode === input.terminology.languageCode,
          )[0];
          if (duplicate !== undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An active terminology override already exists for this key and language.",
              operationName,
            );
          }

          if (input.terminologyId === undefined) {
            if (input.terminology.status === "retired") {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "A new terminology override cannot begin as retired.",
                operationName,
              );
            }
            const id = idFactory.next(
              tenantTerminologyPersistenceDescriptor.domain,
            );
            const terminology = tenantTerminologyPersistenceDescriptor.create(
              scope,
              {
                ...input.terminology,
                createdByUserId: input.actorUserId,
              },
              id,
              now,
            );
            return repositories.tenantTerminology.create(
              scope,
              terminology.id,
              terminology,
            );
          }

          const current = getRequiredRecord(
            repositories,
            "tenantTerminology",
            scope,
            input.terminologyId,
            operationName,
          );
          if (current.status === "retired") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A retired terminology override cannot be edited.",
              operationName,
            );
          }
          if (
            current.termKey !== input.terminology.termKey ||
            current.languageCode !== input.terminology.languageCode
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Create a new terminology override to change its key or language.",
              operationName,
            );
          }
          const update = tenantTerminologyPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Tenant terminology cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            current,
            {
              ...input.terminology,
              createdByUserId: current.createdByUserId,
            },
            now,
          );
          return repositories.tenantTerminology.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    transitionTenantOnboarding(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "transitionTenantOnboarding";

      return adapter.execute(
        () => {
          const current =
            getRequiredRecord(
              repositories,
              "onboardingStates",
              scope,
              input.onboardingStateId,
              operationName,
            );

          if (
            current.ownerUserId !==
            input.actorUserId
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only the assigned organization owner may update onboarding progress.",
              operationName,
            );
          }

          const now =
            clock.now();

          let steps = [
            ...current.steps,
          ];

          let status =
            current.status;

          let currentStepCode =
            current.currentStepCode;

          let startedAt =
            current.startedAt;

          let lastResumedAt =
            current.lastResumedAt;

          let completedAt =
            current.completedAt;

          switch (input.action) {
            case "start": {
              if (
                current.status !==
                "not-started"
              ) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "Onboarding has already started.",
                  operationName,
                );
              }

              const stepCode =
                getRequiredOnboardingStepCode(
                  input.stepCode,
                  operationName,
                );

              const step =
                getOnboardingStep(
                  current,
                  stepCode,
                  operationName,
                );

              steps =
                replaceOnboardingStep(
                  steps,
                  {
                    ...step,

                    status:
                      "in-progress",

                    startedAt:
                      step.startedAt ??
                      now,

                    completedAt:
                      undefined,

                    skippedAt:
                      undefined,
                  },
                );

              status =
                "in-progress";

              currentStepCode =
                stepCode;

              startedAt = now;

              lastResumedAt = now;

              completedAt =
                undefined;

              break;
            }

            case "resume": {
              if (
                current.status ===
                "completed"
              ) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "Completed onboarding cannot be resumed.",
                  operationName,
                );
              }

              const stepCode =
                getRequiredOnboardingStepCode(
                  input.stepCode,
                  operationName,
                );

              const step =
                getOnboardingStep(
                  current,
                  stepCode,
                  operationName,
                );

              if (
                step.status ===
                  "completed" ||
                step.status ===
                  "skipped"
              ) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "A completed or skipped step cannot become the current unfinished step.",
                  operationName,
                );
              }

              steps =
                replaceOnboardingStep(
                  steps,
                  {
                    ...step,

                    status:
                      "in-progress",

                    startedAt:
                      step.startedAt ??
                      now,
                  },
                );

              status =
                "in-progress";

              currentStepCode =
                stepCode;

              startedAt =
                startedAt ?? now;

              lastResumedAt = now;

              break;
            }

            case "complete-step": {
              const stepCode =
                getRequiredOnboardingStepCode(
                  input.stepCode,
                  operationName,
                );

              const step =
                getOnboardingStep(
                  current,
                  stepCode,
                  operationName,
                );

              steps =
                replaceOnboardingStep(
                  steps,
                  {
                    ...step,

                    status:
                      "completed",

                    startedAt:
                      step.startedAt ??
                      now,

                    completedAt:
                      now,

                    skippedAt:
                      undefined,
                  },
                );

              status =
                "in-progress";

              currentStepCode =
                findNextOnboardingStep(
                  steps,
                );

              startedAt =
                startedAt ?? now;

              break;
            }

            case "skip-step": {
              const stepCode =
                getRequiredOnboardingStepCode(
                  input.stepCode,
                  operationName,
                );

              const step =
                getOnboardingStep(
                  current,
                  stepCode,
                  operationName,
                );

              steps =
                replaceOnboardingStep(
                  steps,
                  {
                    ...step,

                    status:
                      "skipped",

                    completedAt:
                      undefined,

                    skippedAt:
                      now,
                  },
                );

              status =
                "in-progress";

              currentStepCode =
                findNextOnboardingStep(
                  steps,
                );

              startedAt =
                startedAt ?? now;

              break;
            }

            case "complete-onboarding": {
              if (
                !areNonReviewOnboardingStepsFinished(
                  steps,
                )
              ) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "Complete or skip every setup step before finishing onboarding.",
                  operationName,
                );
              }

              const reviewStep =
                getOnboardingStep(
                  current,
                  "review",
                  operationName,
                );

              if (
                reviewStep.status !==
                  "skipped"
              ) {
                steps =
                  replaceOnboardingStep(
                    steps,
                    {
                      ...reviewStep,

                      status:
                        "completed",

                      startedAt:
                        reviewStep
                          .startedAt ??
                        now,

                      completedAt:
                        now,

                      skippedAt:
                        undefined,
                    },
                  );
              }

              status =
                "completed";

              currentStepCode =
                undefined;

              startedAt =
                startedAt ?? now;

              completedAt = now;

              break;
            }
          }

          const update =
            PRACTICE_DESCRIPTORS
              .onboardingStates
              .update;

          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Onboarding state cannot be updated.",
              operationName,
            );
          }

          const replacement =
            update(
              current,
              {
                status,

                currentStepCode,

                steps,

                startedAt,

                lastResumedAt,

                completedAt,

                updatedByUserId:
                  input.actorUserId,
              },
              now,
            );

          return repositories
            .onboardingStates
            .replace(
              scope,
              current.id,
              replacement,
            );
        },
        {
          signal,

          operationName,
        },
      );
    },

    getLocationAggregate(
      scope,
      practiceLocationId,
      signal,
    ) {
      return adapter.execute(
        () => ({
          location:
            getRequiredRecord(
              repositories,
              "practiceLocations",
              scope,
              practiceLocationId,
              "getLocationAggregate",
            ),

          clinicSessions:
            listAllRecords(
              repositories,
              "clinicSessions",
              scope,
              (session) =>
                session
                  .practiceLocationId ===
                practiceLocationId,
            ),

          scheduleOverrides:
            listAllRecords(
              repositories,
              "scheduleOverrides",
              scope,
              (override) =>
                override
                  .practiceLocationId ===
                practiceLocationId,
            ),
        }),
        {
          signal,

          operationName:
            "getLocationAggregate",
        },
      );
    },

    findPracticeClinicSessionConflicts(
      scope,
      candidate,
      excludeSessionId,
      signal,
    ) {
      return adapter.execute(
        () =>
          findClinicSessionConflicts(
            repositories,
            scope,
            candidate,
            excludeSessionId,
          ),
        {
          signal,

          operationName:
            "findPracticeClinicSessionConflicts",
        },
      );
    },

    savePracticeClinicSession(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "savePracticeClinicSession";

      return adapter.execute(
        () => {
          const location =
            getRequiredRecord(
              repositories,
              "practiceLocations",
              scope,
              input.session
                .practiceLocationId,
              operationName,
            );

          if (
            location.status ===
            "archived"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A clinic session cannot be added to an archived location.",
              operationName,
            );
          }

          const conflicts =
            findClinicSessionConflicts(
              repositories,
              scope,
              input.session,
              input.sessionId,
            );

          if (
            conflicts.some(
              (conflict) =>
                conflict.severity ===
                "blocking",
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The clinic session overlaps an existing session for the same clinician or shared schedule at this location.",
              operationName,
            );
          }

          const now =
            clock.now();

          let session;

          if (
            input.sessionId ===
            undefined
          ) {
            const generatedId =
              idFactory.next(
                PRACTICE_DESCRIPTORS
                  .clinicSessions
                  .domain,
              );

            session =
              PRACTICE_DESCRIPTORS
                .clinicSessions
                .create(
                  scope,
                  input.session,
                  generatedId,
                  now,
                );

            repositories
              .clinicSessions
              .create(
                scope,
                session.id,
                session,
              );
          } else {
            const current =
              getRequiredRecord(
                repositories,
                "clinicSessions",
                scope,
                input.sessionId,
                operationName,
              );

            const update =
              PRACTICE_DESCRIPTORS
                .clinicSessions
                .update;

            if (
              update === undefined
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "Clinic sessions cannot be updated.",
                operationName,
              );
            }

            session =
              update(
                current,
                input.session,
                now,
              );

            repositories
              .clinicSessions
              .replace(
                scope,
                current.id,
                session,
              );
          }

          return {
            session,

            conflicts:
              conflicts.filter(
                (conflict) =>
                  conflict.severity ===
                  "warning",
              ),
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    archivePracticeLocation(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "archivePracticeLocation";

      return adapter.execute(
        () => {
          const currentLocation =
            getRequiredRecord(
              repositories,
              "practiceLocations",
              scope,
              input.practiceLocationId,
              operationName,
            );

          const reason =
            input.reason.trim();

          if (reason.length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An archive reason is required.",
              operationName,
            );
          }

          if (
            currentLocation.status ===
            "archived"
          ) {
            return {
              location:
                currentLocation,

              clinicSessions:
                listAllRecords(
                  repositories,
                  "clinicSessions",
                  scope,
                  (session) =>
                    session
                      .practiceLocationId ===
                    currentLocation.id,
                ),

              scheduleOverrides:
                listAllRecords(
                  repositories,
                  "scheduleOverrides",
                  scope,
                  (override) =>
                    override
                      .practiceLocationId ===
                    currentLocation.id,
                ),
            };
          }

          const now =
            clock.now();

          const updateLocation =
            PRACTICE_DESCRIPTORS
              .practiceLocations
              .update;

          if (
            updateLocation ===
            undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Practice locations cannot be archived.",
              operationName,
            );
          }

          const archivedLocation =
            updateLocation(
              currentLocation,
              {
                status: "archived",

                publicVisible: false,

                publicBookingEnabled:
                  false,

                onlinePaymentEnabled:
                  false,

                archivedAt: now,

                archivedByUserId:
                  input.actorUserId,

                archiveReason:
                  reason,
              },
              now,
            );

          repositories
            .practiceLocations
            .replace(
              scope,
              currentLocation.id,
              archivedLocation,
            );

          const sessions =
            listAllRecords(
              repositories,
              "clinicSessions",
              scope,
              (session) =>
                session
                  .practiceLocationId ===
                currentLocation.id,
            );

          const updateSession =
            PRACTICE_DESCRIPTORS
              .clinicSessions
              .update;

          if (
            updateSession !==
            undefined
          ) {
            for (const session of sessions) {
              if (
                session.status ===
                "archived"
              ) {
                continue;
              }

              repositories
                .clinicSessions
                .replace(
                  scope,
                  session.id,
                  updateSession(
                    session,
                    {
                      status:
                        "archived",
                    },
                    now,
                  ),
                );
            }
          }

          const overrides =
            listAllRecords(
              repositories,
              "scheduleOverrides",
              scope,
              (override) =>
                override
                  .practiceLocationId ===
                currentLocation.id,
            );

          const updateOverride =
            PRACTICE_DESCRIPTORS
              .scheduleOverrides
              .update;

          if (
            updateOverride !==
            undefined
          ) {
            for (const override of overrides) {
              if (
                override.status ===
                  "archived" ||
                override.status ===
                  "cancelled"
              ) {
                continue;
              }

              repositories
                .scheduleOverrides
                .replace(
                  scope,
                  override.id,
                  updateOverride(
                    override,
                    {
                      status:
                        "archived",
                    },
                    now,
                  ),
                );
            }
          }

          return {
            location:
              archivedLocation,

            clinicSessions:
              listAllRecords(
                repositories,
                "clinicSessions",
                scope,
                (session) =>
                  session
                    .practiceLocationId ===
                  currentLocation.id,
              ),

            scheduleOverrides:
              listAllRecords(
                repositories,
                "scheduleOverrides",
                scope,
                (override) =>
                  override
                    .practiceLocationId ===
                  currentLocation.id,
              ),
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    getServiceCatalogue(
      scope,
      signal,
    ) {
      return adapter.execute(
        () => ({
          services:
            listAllRecords(
              repositories,
              "practiceServices",
              scope,
            ),

          offerings:
            listAllRecords(
              repositories,
              "serviceOfferings",
              scope,
            ),

          feeHistory:
            listAllRecords(
              repositories,
              "serviceFeeChanges",
              scope,
            ),
        }),
        {
          signal,

          operationName:
            "getServiceCatalogue",
        },
      );
    },

    getPracticeServiceManagementView(
      scope,
      practiceServiceId,
      signal,
    ) {
      const operationName =
        "getPracticeServiceManagementView";

      return adapter.execute(
        () => {
          const service =
            getRequiredRecord(
              repositories,
              "practiceServices",
              scope,
              practiceServiceId,
              operationName,
            );

          const offerings =
            listAllRecords(
              repositories,
              "serviceOfferings",
              scope,
              (offering) =>
                offering
                  .practiceServiceId ===
                practiceServiceId,
            );

          const offeringIds =
            new Set(
              offerings.map(
                (offering) =>
                  offering.id,
              ),
            );

          const feeHistory =
            listAllRecords(
              repositories,
              "serviceFeeChanges",
              scope,
              (feeChange) =>
                offeringIds.has(
                  feeChange
                    .practiceServiceOfferingId,
                ),
            ).sort(
              (left, right) =>
                right.effectiveFrom
                  .localeCompare(
                    left.effectiveFrom,
                  ),
            );

          return {
            service,
            offerings,
            feeHistory,
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    savePracticeService(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "savePracticeService";

      return adapter.execute(
        () => {
          validatePracticeServiceClinicians(
            repositories,
            scope,
            input.service,
            operationName,
          );

          const normalizedCode =
            input.service.code
              .trim()
              .toLowerCase();

          const duplicate =
            listAllRecords(
              repositories,
              "practiceServices",
              scope,
              (service) =>
                service.id !==
                  input.serviceId &&
                service.code
                  .trim()
                  .toLowerCase() ===
                  normalizedCode,
            )[0];

          if (
            duplicate !== undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A service already uses this code.",
              operationName,
            );
          }

          if (
            input.service.publiclyBookable &&
            (
              !input.service.publicVisible ||
              input.service
                .deliveryScope ===
                "unassigned" ||
              input.service.status !==
                "active"
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Public booking requires an active, visible service with an assigned delivery scope.",
              operationName,
            );
          }

          const now =
            clock.now();

          if (
            input.serviceId ===
            undefined
          ) {
            const generatedId =
              idFactory.next(
                PRACTICE_DESCRIPTORS
                  .practiceServices
                  .domain,
              );

            const service =
              PRACTICE_DESCRIPTORS
                .practiceServices
                .create(
                  scope,
                  input.service,
                  generatedId,
                  now,
                );

            return repositories
              .practiceServices
              .create(
                scope,
                service.id,
                service,
              );
          }

          const current =
            getRequiredRecord(
              repositories,
              "practiceServices",
              scope,
              input.serviceId,
              operationName,
            );

          if (
            current.status ===
              "archived"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An archived service cannot be edited.",
              operationName,
            );
          }

          const update =
            PRACTICE_DESCRIPTORS
              .practiceServices
              .update;

          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Practice services cannot be updated.",
              operationName,
            );
          }

          const replacement =
            update(
              current,
              input.service,
              now,
            );

          return repositories
            .practiceServices
            .replace(
              scope,
              current.id,
              replacement,
            );
        },
        {
          signal,

          operationName,
        },
      );
    },

    savePracticeServiceOffering(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "savePracticeServiceOffering";

      return adapter.execute(
        () => {
          validatePracticeServiceOffering(
            repositories,
            scope,
            input.offering,
            input.offeringId,
            operationName,
          );

          const now =
            clock.now();

          const current =
            input.offeringId ===
              undefined
              ? undefined
              : getRequiredRecord(
                  repositories,
                  "serviceOfferings",
                  scope,
                  input.offeringId,
                  operationName,
                );

          if (
            current?.status ===
              "archived"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An archived offering cannot be edited.",
              operationName,
            );
          }

          if (
            current !== undefined &&
            (
              current
                .practiceServiceId !==
                input.offering
                  .practiceServiceId ||
              current
                .practiceLocationId !==
                input.offering
                  .practiceLocationId
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Create a new offering to change its service or location.",
              operationName,
            );
          }

          const feeChanged =
            current === undefined ||
            !arePracticeMoneyValuesEqual(
              current.fee,
              input.offering.fee,
            );

          if (
            current !== undefined &&
            feeChanged &&
            current.fee.currencyCode !==
              input.offering
                .fee.currencyCode
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Create a new offering when changing currency so historical fees remain unambiguous.",
              operationName,
            );
          }

          const reason =
            input.feeChangeReason
              ?.trim();

          if (
            feeChanged &&
            (
              reason ===
                undefined ||
              reason.length === 0
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A reason is required for the initial fee and every later fee change.",
              operationName,
            );
          }

          const offeringId =
            current?.id ??
            idFactory.next(
              "practice-service-offering",
            );

          const offering:
            PracticeServiceOffering = {
              ...input.offering,

              id: offeringId,

              organizationId:
                scope.organizationId,

              createdAt:
                current?.createdAt ??
                now,

              updatedAt: now,
            };

          if (current === undefined) {
            repositories
              .serviceOfferings
              .create(
                scope,
                offering.id,
                offering,
              );
          } else {
            repositories
              .serviceOfferings
              .replace(
                scope,
                offering.id,
                offering,
              );
          }

          let feeChange:
            PracticeServiceFeeChange | undefined;

          if (
            feeChanged &&
            reason !== undefined
          ) {
            feeChange = {
              id:
                idFactory.next(
                  "practice-service-fee-change",
                ),

              organizationId:
                scope.organizationId,

              practiceServiceOfferingId:
                offering.id,

              previousFee:
                current?.fee,

              newFee:
                offering.fee,

              effectiveFrom:
                current === undefined
                  ? offering.effectiveFrom
                  : now,

              changedByUserId:
                input.actorUserId,

              reason,

              createdAt: now,
            };

            repositories
              .serviceFeeChanges
              .create(
                scope,
                feeChange.id,
                feeChange,
              );
          }

          return {
            offering,

            feeChange,
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    createInitialPracticeCareTeam(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "createInitialPracticeCareTeam";

      return adapter.execute(
        () => {
          const existingCareTeams =
            listAllRecords(
              repositories,
              "careTeams",
              scope,
            );

          if (
            existingCareTeams.length > 0
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The organization already has an initial care team.",
              operationName,
            );
          }

          const now =
            clock.now();

          const careTeamId =
            idFactory.next(
              PRACTICE_DESCRIPTORS
                .careTeams.domain,
            );

          const ownerTeamMemberId =
            idFactory.next(
              PRACTICE_DESCRIPTORS
                .teamMembers.domain,
            );

          if (
            repositories.careTeams.exists(
              scope,
              careTeamId,
            ) ||
            repositories.teamMembers.exists(
              scope,
              ownerTeamMemberId,
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Generated initial-team identifiers are already in use.",
              operationName,
            );
          }

          const careTeam =
            PRACTICE_DESCRIPTORS
              .careTeams
              .create(
                scope,
                {
                  ...input.careTeam,

                  ownerTeamMemberId,

                  status: "active",
                },
                careTeamId,
                now,
              );

          const ownerMember =
            teamMemberPersistenceDescriptor
              .create(
                scope,
                {
                  ...input.ownerMember,

                  careTeamId,

                  roleCode: "owner",

                  supervisionLevel:
                    "independent",

                  patientAccessScope:
                    "all-patients",

                  privilegeOverrides: [],

                  status: "active",

                  joinedAt: now,
                },
                ownerTeamMemberId,
                now,
              );

          repositories.careTeams.create(
            scope,
            careTeam.id,
            careTeam,
          );

          repositories.teamMembers.create(
            scope,
            ownerMember.id,
            ownerMember,
          );

          return {
            careTeam,

            members: [
              ownerMember,
            ],

            invitations: [],

            patientAssignments: [],
          };
        },
        {
          signal,

          operationName,
        },
      );
    },

    invitePracticeTeamMember(
      scope,
      input,
      signal,
    ) {
      const operationName =
        "invitePracticeTeamMember";

      return adapter.execute(
        () => {
          getRequiredRecord(
            repositories,
            "careTeams",
            scope,
            input.careTeamId,
            operationName,
          );

          const inviter =
            getRequiredRecord(
              repositories,
              "teamMembers",
              scope,
              input
                .invitedByTeamMemberId,
              operationName,
            );

          const now =
            clock.now();

          if (
            inviter.careTeamId !==
              input.careTeamId ||
            !isPracticeTeamMemberActive(
              inviter,
            ) ||
            !hasPracticePrivilege(
              inviter,
              "team.manage",
              now,
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The invitation actor cannot manage this care team.",
              operationName,
            );
          }

          const expiryTime =
            Date.parse(
              input.expiresAt,
            );

          const currentTime =
            Date.parse(now);

          if (
            !Number.isFinite(
              expiryTime,
            ) ||
            expiryTime <= currentTime
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The invitation expiry must be after the current service time.",
              operationName,
            );
          }

          if (
            input.supervisionLevel ===
              "countersigned" &&
            input
              .supervisorTeamMemberId ===
              undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A countersigned invitee requires a supervisor.",
              operationName,
            );
          }

          if (
            input.supervisionLevel !==
              "countersigned" &&
            input
              .supervisorTeamMemberId !==
              undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only countersigned invitees may have supervisors.",
              operationName,
            );
          }

          if (
            input
              .supervisorTeamMemberId !==
              undefined
          ) {
            const supervisor =
              getRequiredRecord(
                repositories,
                "teamMembers",
                scope,
                input
                  .supervisorTeamMemberId,
                operationName,
              );

            if (
              supervisor.careTeamId !==
                input.careTeamId ||
              !isPracticeTeamMemberActive(
                supervisor,
              ) ||
              supervisor
                .supervisionLevel !==
                "independent" ||
              !hasPracticePrivilege(
                supervisor,
                "consultations.countersign",
                now,
              )
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "The selected supervisor cannot countersign work for this care team.",
                operationName,
              );
            }
          }

          const normalizedEmail =
            input.email
              .trim()
              .toLowerCase();

          const duplicateInvitation =
            listAllRecords(
              repositories,
              "teamInvitations",
              scope,
              (invitation) =>
                invitation.careTeamId ===
                  input.careTeamId &&
                invitation.email
                  .trim()
                  .toLowerCase() ===
                  normalizedEmail &&
                invitation.status ===
                  "pending",
            )[0];

          if (
            duplicateInvitation !==
            undefined
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A pending invitation already exists for this email address.",
              operationName,
            );
          }

          const invitationId =
            idFactory.next(
              PRACTICE_DESCRIPTORS
                .teamInvitations.domain,
            );

          const tokenReference =
            idFactory.next(
              "practice-team-invitation-token",
            );

          const invitation =
            teamInvitationPersistenceDescriptor
              .create(
                scope,
                {
                  ...input,

                  email:
                    normalizedEmail,

                  redemptionTokenReference:
                    tokenReference,

                  status:
                    "pending",
                },
                invitationId,
                now,
              );

          return repositories
            .teamInvitations
            .create(
              scope,
              invitation.id,
              invitation,
            );
        },
        {
          signal,

          operationName,
        },
      );
    },

    getPracticeTeamManagementView(
      scope,
      careTeamId,
      actorTeamMemberId,
      signal,
    ) {
      const operationName = "getPracticeTeamManagementView";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            careTeamId,
            actorTeamMemberId,
            now,
            operationName,
          );
          const careTeam = getRequiredRecord(
            repositories,
            "careTeams",
            scope,
            careTeamId,
            operationName,
          );
          return {
            team: {
              careTeam,
              members: listAllRecords(
                repositories,
                "teamMembers",
                scope,
                (member) => member.careTeamId === careTeamId,
              ),
              invitations: listAllRecords(
                repositories,
                "teamInvitations",
                scope,
                (invitation) => invitation.careTeamId === careTeamId,
              ),
              patientAssignments: listAllRecords(
                repositories,
                "patientAssignments",
                scope,
                (assignment) => assignment.careTeamId === careTeamId,
              ),
            },
            locations: listAllRecords(
              repositories,
              "practiceLocations",
              scope,
            ),
            messageCategories: listAllRecords(
              repositories,
              "messageCategories",
              scope,
            ),
            triageRules: listAllRecords(
              repositories,
              "messageTriageRules",
              scope,
            ),
          };
        },
        { signal, operationName },
      );
    },

    savePracticeTeamMember(
      scope,
      input: SavePracticeTeamMemberInput,
      signal,
    ) {
      const operationName = "savePracticeTeamMember";
      return adapter.execute(
        () => {
          const current = getRequiredRecord(
            repositories,
            "teamMembers",
            scope,
            input.teamMemberId,
            operationName,
          );
          const careTeam = getRequiredRecord(
            repositories,
            "careTeams",
            scope,
            current.careTeamId,
            operationName,
          );
          const now = clock.now();
          getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            current.careTeamId,
            input.actorTeamMemberId,
            now,
            operationName,
          );

          if (input.member.userId !== current.userId) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A member's user account cannot be changed.",
              operationName,
            );
          }
          if (
            input.member.status === "invited" ||
            input.member.status === "archived"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The selected membership status cannot be assigned through this operation.",
              operationName,
            );
          }

          const isOwner = current.id === careTeam.ownerTeamMemberId;
          if (
            isOwner &&
            (input.member.roleCode !== "owner" ||
              input.member.status !== "active")
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The explicit organization owner must remain an active owner.",
              operationName,
            );
          }
          if (!isOwner && input.member.roleCode === "owner") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The owner role belongs only to the care team's explicit owner.",
              operationName,
            );
          }

          assertPracticeTeamMemberLocations(
            repositories,
            scope,
            input.member,
            operationName,
          );
          assertPracticeTeamMemberSupervisor(
            repositories,
            scope,
            current.careTeamId,
            current.id,
            input.member,
            now,
            operationName,
          );

          const duplicatePractitioner =
            input.member.practitionerId === undefined
              ? undefined
              : listAllRecords(
                  repositories,
                  "teamMembers",
                  scope,
                  (member) =>
                    member.id !== current.id &&
                    member.practitionerId === input.member.practitionerId &&
                    member.status !== "archived",
                )[0];
          if (duplicatePractitioner !== undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "This practitioner is already linked to another team member.",
              operationName,
            );
          }

          const update = teamMemberPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Practice team members cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            current,
            {
              ...input.member,
              privilegeOverrides: current.privilegeOverrides,
              joinedAt:
                input.member.status === "active"
                  ? current.joinedAt ?? now
                  : current.joinedAt,
              leftAt:
                input.member.status === "inactive"
                  ? current.leftAt ?? now
                  : undefined,
            },
            now,
          );
          const members = listAllRecords(
            repositories,
            "teamMembers",
            scope,
            (member) => member.careTeamId === current.careTeamId,
          );
          assertLastPracticeTeamManagerRemains(
            members,
            replacement,
            now,
            operationName,
          );
          return repositories.teamMembers.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    replacePracticePrivilegeOverrides(
      scope,
      input: ReplacePracticePrivilegeOverridesInput,
      signal,
    ) {
      const operationName = "replacePracticePrivilegeOverrides";
      return adapter.execute(
        () => {
          const current = getRequiredRecord(
            repositories,
            "teamMembers",
            scope,
            input.teamMemberId,
            operationName,
          );
          const now = clock.now();
          const actor = getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            current.careTeamId,
            input.actorTeamMemberId,
            now,
            operationName,
          );
          const privilegeCodes = input.overrides.map(
            (override) => override.privilege,
          );
          if (new Set(privilegeCodes).size !== privilegeCodes.length) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only one override may exist for each privilege.",
              operationName,
            );
          }

          const closeTimestamp = new Date(
            Date.parse(now) - 1,
          ).toISOString();
          const previousOverrides = current.privilegeOverrides.flatMap(
            (override): PracticePrivilegeOverride[] => {
              if (
                override.effectiveTo !== undefined &&
                override.effectiveTo < now
              ) {
                return [override];
              }
              if (override.effectiveFrom < now) {
                return [
                  {
                    ...override,
                    effectiveTo: closeTimestamp,
                    updatedAt: now,
                  },
                ];
              }
              return [];
            },
          );
          const nextOverrides = input.overrides.map(
            (
              override: PracticePrivilegeOverrideCandidate,
            ): PracticePrivilegeOverride => {
              const reason = override.reason.trim();
              if (reason.length === 0) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "Every permission override requires a reason.",
                  operationName,
                );
              }
              if (
                override.effectiveTo !== undefined &&
                override.effectiveTo <= now
              ) {
                throw new WonFlowMockServiceError(
                  "invalid-query",
                  "A permission override cannot expire before it begins.",
                  operationName,
                );
              }
              return {
                id: idFactory.next("practice-privilege-override"),
                teamMemberId: current.id,
                privilege: override.privilege,
                effect: override.effect,
                reason,
                setByTeamMemberId: actor.id,
                effectiveFrom: now,
                effectiveTo: override.effectiveTo,
                createdAt: now,
                updatedAt: now,
              };
            },
          );
          const update = teamMemberPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Practice team permissions cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            current,
            {
              privilegeOverrides: [
                ...previousOverrides,
                ...nextOverrides,
              ],
            },
            now,
          );
          const members = listAllRecords(
            repositories,
            "teamMembers",
            scope,
            (member) => member.careTeamId === current.careTeamId,
          );
          assertLastPracticeTeamManagerRemains(
            members,
            replacement,
            now,
            operationName,
          );
          return repositories.teamMembers.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    revokePracticeTeamInvitation(scope, input, signal) {
      const operationName = "revokePracticeTeamInvitation";
      return adapter.execute(
        () => {
          const invitation = getRequiredRecord(
            repositories,
            "teamInvitations",
            scope,
            input.invitationId,
            operationName,
          );
          const now = clock.now();
          const actor = getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            invitation.careTeamId,
            input.actorTeamMemberId,
            now,
            operationName,
          );
          const reason = input.reason.trim();
          if (reason.length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An invitation revocation reason is required.",
              operationName,
            );
          }
          if (invitation.status !== "pending") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only a pending invitation may be revoked.",
              operationName,
            );
          }
          const update = teamInvitationPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Practice team invitations cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            invitation,
            {
              status: "revoked",
              revokedByTeamMemberId: actor.id,
              revokedAt: now,
              revocationReason: reason,
            },
            now,
          );
          return repositories.teamInvitations.replace(
            scope,
            invitation.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    getPracticePatientAccessView(
      scope,
      careTeamId,
      patientId,
      actorTeamMemberId,
      signal,
    ) {
      const operationName = "getPracticePatientAccessView";
      return adapter.execute(
        () => {
          const now = clock.now();
          getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            careTeamId,
            actorTeamMemberId,
            now,
            operationName,
          );
          getRequiredRecord(
            repositories,
            "patients",
            scope,
            patientId,
            operationName,
          );
          return {
            patientId,
            members: listAllRecords(
              repositories,
              "teamMembers",
              scope,
              (member) => member.careTeamId === careTeamId,
            ),
            activeAssignments: listAllRecords(
              repositories,
              "patientAssignments",
              scope,
              (assignment) =>
                assignment.careTeamId === careTeamId &&
                assignment.patientId === patientId &&
                isPracticePatientAssignmentActive(assignment, now),
            ),
          };
        },
        { signal, operationName },
      );
    },

    endPracticePatientAssignment(scope, input, signal) {
      const operationName = "endPracticePatientAssignment";
      return adapter.execute(
        () => {
          const assignment = getRequiredRecord(
            repositories,
            "patientAssignments",
            scope,
            input.assignmentId,
            operationName,
          );
          const now = clock.now();
          const actor = getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            assignment.careTeamId,
            input.actorTeamMemberId,
            now,
            operationName,
          );
          const reason = input.reason.trim();
          if (reason.length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A reason is required when ending patient access.",
              operationName,
            );
          }
          if (assignment.endedAt !== undefined) return assignment;
          const update = patientAssignmentPersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Patient assignments cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            assignment,
            {
              endedByTeamMemberId: actor.id,
              endedAt: now,
              endReason: reason,
              effectiveTo: assignment.effectiveTo ?? now,
            },
            now,
          );
          return repositories.patientAssignments.replace(
            scope,
            assignment.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    savePracticeMessageTriageRule(
      scope,
      input: SavePracticeMessageTriageRuleInput,
      signal,
    ) {
      const operationName = "savePracticeMessageTriageRule";
      return adapter.execute(
        () => {
          const now = clock.now();
          const actor = getRequiredRecord(
            repositories,
            "teamMembers",
            scope,
            input.actorTeamMemberId,
            operationName,
          );
          getAuthorizedPracticeTeamManager(
            repositories,
            scope,
            actor.careTeamId,
            actor.id,
            now,
            operationName,
          );

          for (const categoryId of input.rule.categoryIds) {
            const category = getRequiredRecord(
              repositories,
              "messageCategories",
              scope,
              categoryId,
              operationName,
            );
            if (category.status === "archived") {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "An archived message category cannot be used by a triage rule.",
                operationName,
              );
            }
          }

          const toMember = getRequiredRecord(
            repositories,
            "teamMembers",
            scope,
            input.rule.toTeamMemberId,
            operationName,
          );
          if (
            toMember.careTeamId !== actor.careTeamId ||
            !isPracticeTeamMemberActive(toMember)
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The escalation recipient must be an active member of this care team.",
              operationName,
            );
          }
          if (input.rule.fromTeamMemberId !== undefined) {
            const fromMember = getRequiredRecord(
              repositories,
              "teamMembers",
              scope,
              input.rule.fromTeamMemberId,
              operationName,
            );
            if (
              fromMember.careTeamId !== actor.careTeamId ||
              !isPracticeTeamMemberActive(fromMember) ||
              fromMember.id === toMember.id
            ) {
              throw new WonFlowMockServiceError(
                "invalid-query",
                "The escalation source and recipient must be different active members of this care team.",
                operationName,
              );
            }
          }

          if (input.triageRuleId === undefined) {
            const triageRuleId = idFactory.next(
              messageTriageRulePersistenceDescriptor.domain,
            );
            const triageRule = messageTriageRulePersistenceDescriptor.create(
              scope,
              {
                ...input.rule,
                createdByTeamMemberId: actor.id,
              },
              triageRuleId,
              now,
            );
            return repositories.messageTriageRules.create(
              scope,
              triageRule.id,
              triageRule,
            );
          }

          const current = getRequiredRecord(
            repositories,
            "messageTriageRules",
            scope,
            input.triageRuleId,
            operationName,
          );
          if (current.status === "archived") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An archived triage rule cannot be edited.",
              operationName,
            );
          }
          const update = messageTriageRulePersistenceDescriptor.update;
          if (update === undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Message-triage rules cannot be updated.",
              operationName,
            );
          }
          const replacement = update(
            current,
            {
              ...input.rule,
              createdByTeamMemberId: current.createdByTeamMemberId,
            },
            now,
          );
          return repositories.messageTriageRules.replace(
            scope,
            current.id,
            replacement,
          );
        },
        { signal, operationName },
      );
    },

    getCareTeamAggregate(
      scope,
      careTeamId,
      signal,
    ) {
      return adapter.execute(
        () => ({
          careTeam:
            getRequiredRecord(
              repositories,
              "careTeams",
              scope,
              careTeamId,
              "getCareTeamAggregate",
            ),

          members:
            listAllRecords(
              repositories,
              "teamMembers",
              scope,
              (member) =>
                member.careTeamId ===
                careTeamId,
            ),

          invitations:
            listAllRecords(
              repositories,
              "teamInvitations",
              scope,
              (invitation) =>
                invitation.careTeamId ===
                careTeamId,
            ),

          patientAssignments:
            listAllRecords(
              repositories,
              "patientAssignments",
              scope,
              (assignment) =>
                assignment.careTeamId ===
                careTeamId,
            ),
        }),
        {
          signal,

          operationName:
            "getCareTeamAggregate",
        },
      );
    },

    resolveTeamMemberPrivileges(
      scope,
      teamMemberId,
      at,
      signal,
    ) {
      return adapter.execute(
        () => {
          const teamMember =
            getRequiredRecord(
              repositories,
              "teamMembers",
              scope,
              teamMemberId,
              "resolveTeamMemberPrivileges",
            );

          return resolvePracticeTeamMemberPrivileges(
            teamMember,
            at,
          );
        },
        {
          signal,

          operationName:
            "resolveTeamMemberPrivileges",
        },
      );
    },

    getDocumentAggregate(
      scope,
      practiceDocumentId,
      signal,
    ) {
      return adapter.execute(
        () => {
          const document =
            getRequiredRecord(
              repositories,
              "practiceDocuments",
              scope,
              practiceDocumentId,
              "getDocumentAggregate",
            );

          const files =
            listAllRecords(
              repositories,
              "documentFiles",
              scope,
              (file) =>
                file
                  .practiceDocumentId ===
                practiceDocumentId,
            );

          const reviews =
            listAllRecords(
              repositories,
              "documentReviews",
              scope,
              (review) =>
                review
                  .practiceDocumentId ===
                practiceDocumentId,
            );

          const releases =
            listAllRecords(
              repositories,
              "documentReleases",
              scope,
              (release) =>
                release
                  .practiceDocumentId ===
                practiceDocumentId,
            );

          const accessEvents =
            listAllRecords(
              repositories,
              "documentAccessEvents",
              scope,
              (event) =>
                event
                  .practiceDocumentId ===
                practiceDocumentId,
            );

          const signatureSubjectIds =
            new Set<WonFlowId>([
              practiceDocumentId,

              ...reviews.map(
                (review) =>
                  review.id,
              ),

              ...releases.map(
                (release) =>
                  release.id,
              ),
            ]);

          const signatures =
            listAllRecords(
              repositories,
              "clinicalSignatures",
              scope,
              (signature) =>
                signatureSubjectIds.has(
                  signature.subjectId,
                ),
            );

          return {
            document,

            files,

            reviews,

            releases,

            accessEvents,

            signatures,
          };
        },
        {
          signal,

          operationName:
            "getDocumentAggregate",
        },
      );
    },

    getMessageThreadAggregate(
      scope,
      threadId,
      signal,
    ) {
      return adapter.execute(
        () => {
          const thread =
            getRequiredRecord(
              repositories,
              "messageThreads",
              scope,
              threadId,
              "getMessageThreadAggregate",
            );

          const categories =
            listAllRecords(
              repositories,
              "messageCategories",
              scope,
              (category) =>
                category.id ===
                thread.categoryId,
            );

          const messages =
            listAllRecords(
              repositories,
              "messages",
              scope,
              (message) =>
                message.threadId ===
                threadId,
            );

          const messageIds =
            new Set<WonFlowId>(
              messages.map(
                (message) =>
                  message.id,
              ),
            );

          const escalations =
            listAllRecords(
              repositories,
              "messageEscalations",
              scope,
              (escalation) =>
                escalation.threadId ===
                threadId,
            );

          const signatures =
            listAllRecords(
              repositories,
              "clinicalSignatures",
              scope,
              (signature) =>
                signature.subjectType ===
                  "message-reply" &&
                messageIds.has(
                  signature.subjectId,
                ),
            );

          return {
            thread,

            categories,

            messages,

            escalations,

            signatures,
          };
        },
        {
          signal,

          operationName:
            "getMessageThreadAggregate",
        },
      );
    },

    getPaymentAggregate(
      scope,
      signal,
    ) {
      return adapter.execute(
        () => ({
          providerConfigs:
            listAllRecords(
              repositories,
              "paymentProviders",
              scope,
            ),

          intents:
            listAllRecords(
              repositories,
              "paymentIntents",
              scope,
            ),

          records:
            listAllRecords(
              repositories,
              "paymentRecords",
              scope,
            ),

          transferProofs:
            listAllRecords(
              repositories,
              "transferProofs",
              scope,
            ),

          refunds:
            listAllRecords(
              repositories,
              "refunds",
              scope,
            ),

          receiptTemplates:
            listAllRecords(
              repositories,
              "receiptTemplates",
              scope,
            ),

          receipts:
            listAllRecords(
              repositories,
              "receipts",
              scope,
            ),
        }),
        {
          signal,

          operationName:
            "getPaymentAggregate",
        },
      );
    },

    getPatientPortalOverview(
      scope,
      patientAccountId,
      patientId,
      signal,
    ) {
      return adapter.execute(
        () => {
          const patientContext = getAuthorizedPatientContext(
            repositories,
            scope,
            patientAccountId,
            patientId,
            clock.now(),
            "getPatientPortalOverview",
          );

          const account = patientContext.account;
          const accountLinks = [patientContext.accountLink];
          const patient = patientContext.patient;

          const appointments =
            listAllRecords(
              repositories,
              "appointments",
              scope,
              (appointment) =>
                appointment.patientId ===
                patientId,
            );

          const appointmentIds =
            new Set<WonFlowId>(
              appointments.map(
                (appointment) =>
                  appointment.id,
              ),
            );

          return {
            account,

            accountLinks,

            patient,

            appointments,

            practiceAppointments:
              listAllRecords(
                repositories,
                "practiceAppointments",
                scope,
                (appointment) =>
                  appointmentIds.has(
                    appointment
                      .appointmentId,
                  ),
              ),

            documents:
              listAllRecords(
                repositories,
                "practiceDocuments",
                scope,
                (document) =>
                  document.patientId ===
                  patientId,
              ),

            messageThreads:
              listAllRecords(
                repositories,
                "messageThreads",
                scope,
                (thread) =>
                  thread.patientId ===
                  patientId,
              ),

            paymentRecords:
              listAllRecords(
                repositories,
                "paymentRecords",
                scope,
                (paymentRecord) =>
                  appointmentIds.has(
                    paymentRecord
                      .appointmentId,
                  ),
              ),
          };
        },
        {
          signal,

          operationName:
            "getPatientPortalOverview",
        },
      );
    },

    listPlatformTenants(
      actorUserId,
      signal,
    ) {
      const operationName = "listPlatformTenants";
      return adapter.execute(
        () => {
          if (actorUserId.trim().length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A platform actor is required.",
              operationName,
            );
          }
          return repositories.provisioningRequests
            .listAcrossOrganizations({ limit: 1_000 })
            .items.map((envelope) => {
              const scope = {
                organizationId: envelope.organizationId,
              };
              const request = envelope.value;
              const subscription = listAllRecords(
                repositories,
                "subscriptions",
                scope,
              )[0];
              const ownerInvitation = listAllRecords(
                repositories,
                "ownerInvitations",
                scope,
              ).sort((left, right) =>
                right.invitedAt.localeCompare(left.invitedAt),
              )[0];
              const onboarding = listAllRecords(
                repositories,
                "onboardingStates",
                scope,
              )[0];
              const activeModuleCount = listAllRecords(
                repositories,
                "moduleEntitlements",
                scope,
                (entitlement) => entitlement.status === "active",
              ).length;
              const latestUsage = listAllRecords(
                repositories,
                "usageSnapshots",
                scope,
              ).sort((left, right) =>
                right.capturedAt.localeCompare(left.capturedAt),
              )[0];
              return {
                organizationId: scope.organizationId,
                organizationName: request.requestedOrganizationName,
                organizationCode: request.requestedOrganizationCode,
                provisioningStatus: request.status,
                subscriptionStatus: subscription?.billingStatus,
                planTierCode: subscription?.planTierCode,
                seatCount: subscription?.seatCount,
                ownerInvitationStatus: ownerInvitation?.status,
                onboardingStatus: onboarding?.status,
                activeModuleCount,
                latestUsage,
              };
            });
        },
        { signal, operationName },
      );
    },

    provisionPlatformTenant(
      input: ProvisionPlatformTenantInput,
      signal,
    ) {
      const operationName = "provisionPlatformTenant";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const organizationCode = input.organizationCode.trim().toUpperCase();
          if (organizationCode.length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "An organization code is required.",
              operationName,
            );
          }
          const duplicate = repositories.provisioningRequests
            .listAcrossOrganizations({
              limit: 1_000,
              filter: (record) =>
                record.value.requestedOrganizationCode
                  .trim()
                  .toUpperCase() === organizationCode,
            }).items[0];
          if (duplicate !== undefined) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The organization code is already in use.",
              operationName,
            );
          }
          if (
            new Set(input.moduleCodes).size !== input.moduleCodes.length
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Module selections must be unique.",
              operationName,
            );
          }
          if (input.ownerInvitationExpiresAt <= now) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The owner invitation must expire after the current service time.",
              operationName,
            );
          }

          const scope: WonFlowOrganizationScope = {
            organizationId: idFactory.next("organization"),
          };
          const ownerUserId =
            input.intendedOwnerUserId ??
            idFactory.next("reserved-owner-user");
          const requestId = idFactory.next(
            provisioningRequestPersistenceDescriptor.domain,
          );
          const provisioningRequest =
            provisioningRequestPersistenceDescriptor.create(
              scope,
              {
                requestedOrganizationName: input.organizationName.trim(),
                requestedOrganizationCode: organizationCode,
                requestedOwnerUserId: ownerUserId,
                requestedPlanTierCode: input.planTierCode,
                requestedSeatCount: input.seatCount,
                requestedModuleCodes: [...input.moduleCodes],
                requestedByUserId: input.actorUserId,
                status: "active",
                submittedAt: now,
                reviewedByUserId: input.actorUserId,
                reviewedAt: now,
                decisionReason: reason,
                provisioningStartedAt: now,
                activatedAt: now,
              },
              requestId,
              now,
            );
          const subscriptionId = idFactory.next(
            subscriptionPersistenceDescriptor.domain,
          );
          const subscription = subscriptionPersistenceDescriptor.create(
            scope,
            {
              planTierCode: input.planTierCode,
              seatCount: input.seatCount,
              billingStatus: "active",
              activeModuleCodes: [...input.moduleCodes],
            },
            subscriptionId,
            now,
          );
          const invitationId = idFactory.next(
            ownerInvitationPersistenceDescriptor.domain,
          );
          const ownerInvitation = ownerInvitationPersistenceDescriptor.create(
            scope,
            {
              email: input.ownerEmail.trim().toLowerCase(),
              intendedOwnerUserId: input.intendedOwnerUserId,
              redemptionTokenReference: idFactory.next(
                "organization-owner-invitation-token-reference",
              ),
              status: "pending",
              invitedByPlatformUserId: input.actorUserId,
              invitedAt: now,
              expiresAt: input.ownerInvitationExpiresAt,
            },
            invitationId,
            now,
          );
          const moduleEntitlements = input.moduleCodes.map((moduleCode) =>
            moduleEntitlementPersistenceDescriptor.create(
              scope,
              {
                moduleCode,
                status: "active",
                effectiveFrom: now,
                grantedByUserId: input.actorUserId,
                notes: reason,
              },
              idFactory.next(moduleEntitlementPersistenceDescriptor.domain),
              now,
            ),
          );
          const moduleActivations = input.moduleCodes.map((moduleCode) =>
            moduleActivationPersistenceDescriptor.create(
              scope,
              { moduleCode, status: "pending-configuration" },
              idFactory.next(moduleActivationPersistenceDescriptor.domain),
              now,
            ),
          );
          const onboardingState = createOwnedVersionedDescriptor<TenantOnboardingState>(
            "tenant-onboarding-state",
          ).create(
            scope,
            {
              ownerUserId,
              workflowVersion: "1",
              status: "not-started",
              steps: [
                "profile",
                "regional-settings",
                "locations",
                "clinic-sessions",
                "service-catalogue",
                "team",
                "policies",
                "content",
                "review",
              ].map((code) => ({
                code: code as TenantOnboardingStepCode,
                status: "not-started" as const,
              })),
              updatedByUserId: input.actorUserId,
            },
            idFactory.next("tenant-onboarding-state"),
            now,
          );

          repositories.provisioningRequests.create(
            scope,
            provisioningRequest.id,
            provisioningRequest,
          );
          repositories.subscriptions.create(
            scope,
            subscription.id,
            subscription,
          );
          repositories.ownerInvitations.create(
            scope,
            ownerInvitation.id,
            ownerInvitation,
          );
          for (const entitlement of moduleEntitlements) {
            repositories.moduleEntitlements.create(
              scope,
              entitlement.id,
              entitlement,
            );
          }
          for (const activation of moduleActivations) {
            repositories.moduleActivations.create(
              scope,
              activation.id,
              activation,
            );
          }
          repositories.onboardingStates.create(
            scope,
            onboardingState.id,
            onboardingState,
          );
          return {
            scope,
            provisioningRequest,
            subscription,
            ownerInvitation,
            moduleEntitlements,
            moduleActivations,
            onboardingState,
          };
        },
        { signal, operationName },
      );
    },

    savePlatformTenantSubscription(
      scope,
      input: SavePlatformSubscriptionInput,
      signal,
    ) {
      const operationName = "savePlatformTenantSubscription";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const subscriptions = listAllRecords(
            repositories,
            "subscriptions",
            scope,
          );
          if (subscriptions.length !== 1) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The tenant must have exactly one subscription.",
              operationName,
            );
          }
          const current = subscriptions[0]!;
          const subscriptionChanged =
            current.planTierCode !==
              input.planTierCode ||
            current.seatCount !==
              input.seatCount ||
            current.billingStatus !==
              input.billingStatus ||
            current.trialStartsAt !==
              input.trialStartsAt ||
            current.trialEndsAt !==
              input.trialEndsAt ||
            current.currentBillingPeriodStartsAt !==
              input.currentBillingPeriodStartsAt ||
            current.currentBillingPeriodEndsAt !==
              input.currentBillingPeriodEndsAt ||
            current.expiresAt !==
              input.expiresAt;
          const update = subscriptionPersistenceDescriptor.update!;
          const replacement = update(
            current,
            {
              planTierCode: input.planTierCode,
              seatCount: input.seatCount,
              billingStatus: input.billingStatus,
              trialStartsAt: input.trialStartsAt,
              trialEndsAt: input.trialEndsAt,
              currentBillingPeriodStartsAt:
                input.currentBillingPeriodStartsAt,
              currentBillingPeriodEndsAt:
                input.currentBillingPeriodEndsAt,
              expiresAt: input.expiresAt,
            },
            now,
          );
          const saved = repositories.subscriptions.replace(
            scope,
            current.id,
            replacement,
          );
          if (subscriptionChanged) {
            appendPlatformControlAction(
              scope,
              {
                type: "update-subscription",
                actorUserId: input.actorUserId,
                reason,
                previousPlanTierCode: current.planTierCode,
                requestedPlanTierCode: input.planTierCode,
                effectiveAt: now,
              },
              now,
            );
          }
          return saved;
        },
        { signal, operationName },
      );
    },

    setPlatformTenantModuleEntitlement(
      scope,
      input: SetPlatformModuleEntitlementInput,
      signal,
    ) {
      const operationName = "setPlatformTenantModuleEntitlement";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const moduleDefinition =
            WONFLOW_MODULES.find(
              (candidate) =>
                candidate.code ===
                input.moduleCode,
            );

          if (
            moduleDefinition === undefined ||
            !moduleDefinition
              .supportedScopes
              .some(
                (scope) =>
                  scope ===
                  "organization",
              )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The selected module is not available at organization scope.",
              operationName,
            );
          }

          if (
            moduleDefinition.isCore &&
            (
              input.entitlementStatus !==
                "active" ||
              (
                input.activationStatus !==
                  "enabled" &&
                input.activationStatus !==
                  "pending-configuration"
              )
            )
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Core modules must retain an active entitlement and cannot be manually disabled.",
              operationName,
            );
          }

          if (
            input.entitlementStatus !== "active" &&
            input.activationStatus === "enabled"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A module cannot be enabled without an active entitlement.",
              operationName,
            );
          }
          const entitlements = listAllRecords(
            repositories,
            "moduleEntitlements",
            scope,
            (record) => record.moduleCode === input.moduleCode,
          );
          if (
            entitlements.filter((record) => record.status === "active").length > 1
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Duplicate active module entitlements must be resolved first.",
              operationName,
            );
          }
          const currentEntitlement = entitlements[0];
          const entitlement =
            currentEntitlement === undefined
              ? moduleEntitlementPersistenceDescriptor.create(
                  scope,
                  {
                    moduleCode: input.moduleCode,
                    status: input.entitlementStatus,
                    effectiveFrom: input.effectiveFrom,
                    effectiveTo: input.effectiveTo,
                    grantedByUserId: input.actorUserId,
                    notes: input.notes,
                  },
                  idFactory.next(moduleEntitlementPersistenceDescriptor.domain),
                  now,
                )
              : moduleEntitlementPersistenceDescriptor.update!(
                  currentEntitlement,
                  {
                    status: input.entitlementStatus,
                    effectiveFrom: input.effectiveFrom,
                    effectiveTo: input.effectiveTo,
                    grantedByUserId: input.actorUserId,
                    notes: input.notes,
                  },
                  now,
                );
          const activations = listAllRecords(
            repositories,
            "moduleActivations",
            scope,
            (record) => record.moduleCode === input.moduleCode,
          );
          if (activations.length > 1) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Duplicate module activations must be resolved first.",
              operationName,
            );
          }
          const currentActivation = activations[0];
          const activationPatch = {
            status: input.activationStatus,
            enabledAt:
              input.activationStatus === "enabled" ? now : undefined,
            enabledByUserId:
              input.activationStatus === "enabled"
                ? input.actorUserId
                : undefined,
            disabledAt:
              input.activationStatus === "disabled" ? now : undefined,
            disabledByUserId:
              input.activationStatus === "disabled"
                ? input.actorUserId
                : undefined,
            disabledReason:
              input.activationStatus === "disabled" ? reason : undefined,
            suspendedAt:
              input.activationStatus === "suspended" ? now : undefined,
            suspendedByUserId:
              input.activationStatus === "suspended"
                ? input.actorUserId
                : undefined,
            suspendedReason:
              input.activationStatus === "suspended" ? reason : undefined,
          };
          const activation =
            currentActivation === undefined
              ? moduleActivationPersistenceDescriptor.create(
                  scope,
                  { moduleCode: input.moduleCode, ...activationPatch },
                  idFactory.next(moduleActivationPersistenceDescriptor.domain),
                  now,
                )
              : moduleActivationPersistenceDescriptor.update!(
                  currentActivation,
                  activationPatch,
                  now,
                );
          const savedEntitlement =
            currentEntitlement === undefined
              ? repositories.moduleEntitlements.create(
                  scope,
                  entitlement.id,
                  entitlement,
                )
              : repositories.moduleEntitlements.replace(
                  scope,
                  entitlement.id,
                  entitlement,
                );
          const savedActivation =
            currentActivation === undefined
              ? repositories.moduleActivations.create(
                  scope,
                  activation.id,
                  activation,
                )
              : repositories.moduleActivations.replace(
                  scope,
                  activation.id,
                  activation,
                );
          const action = appendPlatformControlAction(
            scope,
            {
              type: "set-module-entitlement",
              actorUserId: input.actorUserId,
              reason,
              moduleCode: input.moduleCode,
              requestedEntitlementStatus: input.entitlementStatus,
              requestedActivationStatus: input.activationStatus,
              effectiveAt: input.effectiveFrom,
            },
            now,
          );
          return {
            entitlement: savedEntitlement,
            activation: savedActivation,
            action,
          };
        },
        { signal, operationName },
      );
    },

    executePlatformTenantLifecycleAction(
      scope,
      input: ExecutePlatformTenantLifecycleActionInput,
      signal,
    ) {
      const operationName = "executePlatformTenantLifecycleAction";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const request = listAllRecords(
            repositories,
            "provisioningRequests",
            scope,
          )[0];
          if (request === undefined) {
            throw new WonFlowMockServiceError(
              "not-found",
              "The tenant provisioning request was not found.",
              operationName,
            );
          }
          if (input.confirmation !== request.requestedOrganizationCode) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The confirmation must exactly match the organization code.",
              operationName,
            );
          }
          const subscription = listAllRecords(
            repositories,
            "subscriptions",
            scope,
          )[0];
          if (subscription === undefined) {
            throw new WonFlowMockServiceError(
              "not-found",
              "The tenant subscription was not found.",
              operationName,
            );
          }
          if (
            input.action === "reactivate" &&
            subscription.billingStatus === "cancelled"
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A terminated tenant cannot be reactivated.",
              operationName,
            );
          }
          const updateSubscription = subscriptionPersistenceDescriptor.update!;
          const latestLifecycleAction = listAllRecords(
            repositories,
            "platformControlActions",
            scope,
            (action) =>
              action.type === "suspend" ||
              action.type === "reactivate" ||
              action.type === "terminate",
          ).sort((left, right) =>
            right.requestedAt.localeCompare(left.requestedAt),
          )[0];
          const nextBillingStatus =
            input.action === "suspend"
              ? "suspended"
              : input.action === "terminate"
                ? "cancelled"
                : latestLifecycleAction?.type === "suspend"
                  ? "active"
                  : subscription.billingStatus;
          if (subscription.billingStatus !== nextBillingStatus) {
            repositories.subscriptions.replace(
              scope,
              subscription.id,
              updateSubscription(
                subscription,
                {
                  billingStatus: nextBillingStatus,
                  cancelledAt:
                    input.action === "terminate" ? now : undefined,
                  cancellationReason:
                    input.action === "terminate" ? reason : undefined,
                },
                now,
              ),
            );
          }

          for (const activation of listAllRecords(
            repositories,
            "moduleActivations",
            scope,
          )) {
            let patch: PracticeUpdateInput<OrganizationModuleActivation> | undefined;
            if (input.action === "suspend" && activation.status === "enabled") {
              patch = {
                status: "suspended",
                suspendedAt: now,
                suspendedByUserId: input.actorUserId,
                suspendedReason:
                  `${lifecycleSuspensionReasonPrefix}${reason}`,
              };
            } else if (
              input.action === "reactivate" &&
              activation.status === "suspended" &&
              activation.suspendedByUserId !== undefined &&
              activation.suspendedReason?.startsWith(
                lifecycleSuspensionReasonPrefix,
              ) === true
            ) {
              patch = {
                status: "enabled",
                enabledAt: now,
                enabledByUserId: input.actorUserId,
                suspendedAt: undefined,
                suspendedByUserId: undefined,
                suspendedReason: undefined,
              };
            } else if (
              input.action === "terminate" &&
              activation.status !== "disabled"
            ) {
              patch = {
                status: "disabled",
                disabledAt: now,
                disabledByUserId: input.actorUserId,
                disabledReason: reason,
              };
            }
            if (patch !== undefined) {
              repositories.moduleActivations.replace(
                scope,
                activation.id,
                moduleActivationPersistenceDescriptor.update!(
                  activation,
                  patch,
                  now,
                ),
              );
            }
          }

          for (const assignment of listAllRecords(
            repositories,
            "ownerAssignments",
            scope,
          )) {
            let patch: PracticeUpdateInput<OrganizationOwnerAssignment> | undefined;
            if (input.action === "suspend" && assignment.status === "active") {
              patch = {
                status: "suspended",
                suspendedByPlatformUserId: input.actorUserId,
                suspendedAt: now,
                suspensionReason:
                  `${lifecycleSuspensionReasonPrefix}${reason}`,
              };
            } else if (
              input.action === "reactivate" &&
              assignment.status === "suspended" &&
              assignment.suspendedByPlatformUserId !== undefined &&
              assignment.suspensionReason?.startsWith(
                lifecycleSuspensionReasonPrefix,
              ) === true
            ) {
              patch = {
                status: "active",
                suspendedByPlatformUserId: undefined,
                suspendedAt: undefined,
                suspensionReason: undefined,
              };
            } else if (
              input.action === "terminate" &&
              assignment.status !== "revoked"
            ) {
              patch = {
                status: "revoked",
                revokedByPlatformUserId: input.actorUserId,
                revokedAt: now,
                revocationReason: reason,
                effectiveTo: assignment.effectiveTo ?? now,
              };
            }
            if (patch !== undefined) {
              repositories.ownerAssignments.replace(
                scope,
                assignment.id,
                ownerAssignmentPersistenceDescriptor.update!(
                  assignment,
                  patch,
                  now,
                ),
              );
            }
          }

          if (input.action === "terminate") {
            for (const invitation of listAllRecords(
              repositories,
              "ownerInvitations",
              scope,
              (record) => record.status === "pending",
            )) {
              repositories.ownerInvitations.replace(
                scope,
                invitation.id,
                ownerInvitationPersistenceDescriptor.update!(
                  invitation,
                  {
                    status: "revoked",
                    revokedByPlatformUserId: input.actorUserId,
                    revokedAt: now,
                    revocationReason: reason,
                  },
                  now,
                ),
              );
            }
            for (const entitlement of listAllRecords(
              repositories,
              "moduleEntitlements",
              scope,
              (record) => record.status !== "revoked",
            )) {
              repositories.moduleEntitlements.replace(
                scope,
                entitlement.id,
                moduleEntitlementPersistenceDescriptor.update!(
                  entitlement,
                  { status: "revoked", effectiveTo: entitlement.effectiveTo ?? now },
                  now,
                ),
              );
            }
          }
          appendPlatformControlAction(
            scope,
            {
              type: input.action,
              actorUserId: input.actorUserId,
              reason,
              effectiveAt: now,
            },
            now,
          );
          return buildPlatformTenantOverview(scope);
        },
        { signal, operationName },
      );
    },

    requestPlatformSupportAccess(
      scope,
      input: RequestPlatformSupportAccessInput,
      signal,
    ) {
      const operationName = "requestPlatformSupportAccess";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(
            input.requestedReason,
            operationName,
          );
          if (
            input.allowedPermissionCodes.length === 0 ||
            new Set(input.allowedPermissionCodes).size !==
              input.allowedPermissionCodes.length
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Select at least one unique support permission.",
              operationName,
            );
          }
          if (input.requestedExpiresAt <= now) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Requested support access must expire in the future.",
              operationName,
            );
          }
          const session = supportAccessSessionPersistenceDescriptor.create(
            scope,
            {
              platformUserId: input.platformUserId,
              requestedReason: reason,
              status: "requested",
              requestedAt: now,
              expiresAt: input.requestedExpiresAt,
              allowedPermissionCodes: [...input.allowedPermissionCodes],
              allowedBranchIds: input.allowedBranchIds,
            },
            idFactory.next(supportAccessSessionPersistenceDescriptor.domain),
            now,
          );
          const saved = repositories.supportAccessSessions.create(
            scope,
            session.id,
            session,
          );
          appendSupportAccessAuditEvent(
            scope,
            {
              supportAccessSessionId: saved.id,
              platformUserId: input.platformUserId,
              type: "requested",
              reason,
            },
            now,
          );
          return saved;
        },
        { signal, operationName },
      );
    },

    decidePlatformSupportAccess(
      scope,
      input: DecidePlatformSupportAccessInput,
      signal,
    ) {
      const operationName = "decidePlatformSupportAccess";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const current = getRequiredRecord(
            repositories,
            "supportAccessSessions",
            scope,
            input.supportAccessSessionId,
            operationName,
          );
          if (current.status !== "requested") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only requested support access may be decided.",
              operationName,
            );
          }
          if (
            input.decision === "approve" &&
            current.platformUserId === input.decisionActorUserId
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A support requester cannot approve their own request.",
              operationName,
            );
          }
          if (
            input.decision === "approve" &&
            (input.expiresAt === undefined || input.expiresAt <= now)
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Approved support access requires a future expiry time.",
              operationName,
            );
          }
          const replacement = supportAccessSessionPersistenceDescriptor.update!(
            current,
            input.decision === "approve"
              ? {
                  status: "approved",
                  approvedByUserId: input.decisionActorUserId,
                  approvedReason: reason,
                  approvedAt: now,
                  expiresAt: input.expiresAt,
                }
              : {
                  status: "rejected",
                  rejectedByUserId: input.decisionActorUserId,
                  rejectedAt: now,
                  rejectionReason: reason,
                },
            now,
          );
          const saved = repositories.supportAccessSessions.replace(
            scope,
            current.id,
            replacement,
          );
          appendSupportAccessAuditEvent(
            scope,
            {
              supportAccessSessionId: saved.id,
              platformUserId: input.decisionActorUserId,
              type: input.decision === "approve" ? "approved" : "rejected",
              reason,
            },
            now,
          );
          return saved;
        },
        { signal, operationName },
      );
    },

    activatePlatformSupportAccess(
      scope,
      supportAccessSessionId,
      actorUserId,
      signal,
    ) {
      const operationName = "activatePlatformSupportAccess";
      return adapter.execute(
        () => {
          const now = clock.now();
          const current = getRequiredRecord(
            repositories,
            "supportAccessSessions",
            scope,
            supportAccessSessionId,
            operationName,
          );
          if (
            current.platformUserId !==
            actorUserId
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only the platform user who requested support access may activate it.",
              operationName,
            );
          }
          if (
            current.status !== "approved" ||
            current.expiresAt === undefined ||
            current.expiresAt <= now
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only approved, unexpired support access may be activated.",
              operationName,
            );
          }
          const saved = repositories.supportAccessSessions.replace(
            scope,
            current.id,
            supportAccessSessionPersistenceDescriptor.update!(
              current,
              {
                status: "active",
                activatedAt: now,
                activatedByUserId: actorUserId,
              },
              now,
            ),
          );
          appendSupportAccessAuditEvent(
            scope,
            {
              supportAccessSessionId: saved.id,
              platformUserId: actorUserId,
              type: "activated",
              reason: current.approvedReason,
            },
            now,
          );
          return saved;
        },
        { signal, operationName },
      );
    },

    revokePlatformSupportAccess(
      scope,
      input: RevokePlatformSupportAccessInput,
      signal,
    ) {
      const operationName = "revokePlatformSupportAccess";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const current = getRequiredRecord(
            repositories,
            "supportAccessSessions",
            scope,
            input.supportAccessSessionId,
            operationName,
          );
          if (input.confirmation !== current.id) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The confirmation must exactly match the support session ID.",
              operationName,
            );
          }
          if (current.status !== "active") {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "Only active support access may be revoked.",
              operationName,
            );
          }
          const saved = repositories.supportAccessSessions.replace(
            scope,
            current.id,
            supportAccessSessionPersistenceDescriptor.update!(
              current,
              {
                status: "revoked",
                revokedAt: now,
                revokedByUserId: input.actorUserId,
                revocationReason: reason,
              },
              now,
            ),
          );
          appendSupportAccessAuditEvent(
            scope,
            {
              supportAccessSessionId: saved.id,
              platformUserId: input.actorUserId,
              type: "revoked",
              reason,
            },
            now,
          );
          return saved;
        },
        { signal, operationName },
      );
    },

    recordPlatformSupportAccessUse(
      scope,
      input: RecordPlatformSupportAccessUseInput,
      signal,
    ) {
      const operationName = "recordPlatformSupportAccessUse";
      return adapter.execute(
        () => {
          const now = clock.now();
          const reason = requirePlatformReason(input.reason, operationName);
          const resourceType =
            input.resourceType.trim();

          if (resourceType.length === 0) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "A resource type is required when recording support access.",
              operationName,
            );
          }

          const session = getRequiredRecord(
            repositories,
            "supportAccessSessions",
            scope,
            input.supportAccessSessionId,
            operationName,
          );
          if (
            session.status === "active" &&
            session.expiresAt !== undefined &&
            session.expiresAt <= now
          ) {
            repositories.supportAccessSessions.replace(
              scope,
              session.id,
              supportAccessSessionPersistenceDescriptor.update!(
                session,
                { status: "expired" },
                now,
              ),
            );
            appendSupportAccessAuditEvent(
              scope,
              {
                supportAccessSessionId: session.id,
                platformUserId: input.platformUserId,
                type: "expired",
                reason: "The approved support-access window expired.",
              },
              now,
            );
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The support session has expired.",
              operationName,
            );
          }
          if (
            session.status !== "active" ||
            session.platformUserId !== input.platformUserId ||
            session.expiresAt === undefined ||
            session.expiresAt <= now ||
            !session.allowedPermissionCodes.includes(input.permissionCode)
          ) {
            throw new WonFlowMockServiceError(
              "invalid-query",
              "The support session does not authorize this resource access.",
              operationName,
            );
          }
          return appendSupportAccessAuditEvent(
            scope,
            {
              supportAccessSessionId: session.id,
              platformUserId: input.platformUserId,
              type: "resource-accessed",
              reason,
              permissionCode: input.permissionCode,
              resourceType,
              resourceId: input.resourceId,
            },
            now,
          );
        },
        { signal, operationName },
      );
    },

    getPlatformTenantOverview(
      scope,
      signal,
    ) {
      return adapter.execute(
        () => buildPlatformTenantOverview(scope),
        {
          signal,

          operationName:
            "getPlatformTenantOverview",
        },
      );
    },
  };

  const bootstrapService: EmptyTenantBootstrapService = {
    provisioningRequests: createInternalBootstrapCreateService(
      "provisioningRequests",
      provisioningRequestPersistenceDescriptor,
      repositories,
      adapter,
      clock,
      idFactory,
    ),
    subscriptions: createInternalBootstrapCreateService(
      "subscriptions",
      subscriptionPersistenceDescriptor,
      repositories,
      adapter,
      clock,
      idFactory,
    ),
    ownerAssignments: createInternalBootstrapCreateService(
      "ownerAssignments",
      ownerAssignmentPersistenceDescriptor,
      repositories,
      adapter,
      clock,
      idFactory,
    ),
    onboardingStates: createInternalBootstrapCreateService(
      "onboardingStates",
      createOwnedVersionedDescriptor<TenantOnboardingState>(
        "tenant-onboarding-state",
      ),
      repositories,
      adapter,
      clock,
      idFactory,
    ),
    moduleActivations: createInternalBootstrapCreateService(
      "moduleActivations",
      moduleActivationPersistenceDescriptor,
      repositories,
      adapter,
      clock,
      idFactory,
    ),
  };

  registerEmptyTenantBootstrapService(service, bootstrapService);
  return service;
}
