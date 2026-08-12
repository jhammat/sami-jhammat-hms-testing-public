/**
 * Tenant-owned profile, policy, content, notification and terminology
 * settings.
 *
 * These contracts keep organization-specific configuration out of
 * application code. Branding, wording, policies, templates and labels
 * are created and edited by the tenant owner through management
 * workflows.
 *
 * Contracts contain types only. They do not provide defaults, runtime
 * validation, persistence or I/O.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

/**
 * Colours selected by a tenant for its public and authenticated
 * experiences.
 *
 * Runtime validation later checks accepted colour formats.
 */
export interface TenantColourPalette {
  primary: string;

  secondary?: string;

  accent?: string;

  background?: string;

  foreground?: string;
}

/**
 * Public contact information displayed for one tenant.
 *
 * Every field is optional because an organization may still be in
 * setup and zero public contact methods is a valid intermediate state.
 */
export interface TenantPublicContactDetails {
  email?: string;

  phoneNumber?: string;

  whatsappNumber?: string;

  addressLines: string[];

  city?: string;

  region?: string;

  postalCode?: string;

  countryCode?: string;

  mapUrl?: string;
}

/**
 * Tenant-controlled identity, regional configuration and public
 * contact information.
 *
 * logoReference is an opaque asset reference. It is not a public URL,
 * storage key or embedded image.
 */
export interface TenantProfile {
  id: WonFlowId;

  organizationId: WonFlowId;

  displayName: string;

  specialtyDescription?: string;

  logoReference?: string;

  colours: TenantColourPalette;

  publicContact:
    TenantPublicContactDetails;

  /**
   * Existing public or marketing website belonging to the tenant.
   *
   * WonFlow does not rebuild or assume ownership of this website.
   */
  publicSiteUrl?: string;

  /**
   * IANA time-zone identifier selected by the tenant.
   */
  timeZone: string;

  /**
   * ISO 4217 currency code used when creating new monetary records.
   *
   * Individual offerings and payments still carry their own explicit
   * currency.
   */
  defaultCurrencyCode: string;

  /**
   * BCP 47 language tags supported by the tenant.
   *
   * The first entry is not implicitly treated as the default. Product
   * workflows must use the tenant's explicitly selected language.
   */
  supportedLanguageCodes: string[];

  defaultLanguageCode: string;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Tenant-wide references and operational commitments.
 *
 * Detailed booking and cancellation thresholds live in the referenced
 * PracticeBookingPolicy. Patient-facing policy wording lives in
 * versioned TenantContentBlock records.
 *
 * All values are optional during setup. No policy default is baked into
 * the contract.
 */
export interface TenantPolicySettings {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * PracticeBookingPolicy used when no more specific location, service
   * or offering policy applies.
   */
  defaultBookingPolicyId?: WonFlowId;

  /**
   * Versioned patient-facing cancellation policy wording.
   */
  cancellationPolicyContentBlockId?: WonFlowId;

  /**
   * Versioned patient-facing refund policy wording.
   */
  refundPolicyContentBlockId?: WonFlowId;

  /**
   * Time the tenant publicly commits to for reviewing patient messages.
   *
   * It may remain undefined until the tenant owner makes that decision.
   */
  messageResponseCommitmentMinutes?: number;

  /**
   * Retention period selected by the tenant for documents.
   *
   * Legal and platform minimums are enforced later by policy and
   * validation layers rather than by a hardcoded contract default.
   */
  documentRetentionDays?: number;

  updatedByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Lifecycle of versioned tenant-authored content.
 */
export type TenantContentBlockStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "retired";

/**
 * Versioned tenant-authored wording.
 *
 * purpose is a stable application key selected by the workflow using
 * the content. Examples of product purposes include consent wording,
 * safety notices, booking terms, patient instructions and appointment
 * confirmations. The actual wording is always tenant data.
 *
 * Editing published content creates another record. Previously
 * effective records remain preserved so historic consent and
 * communication remain explainable.
 */
export interface TenantContentBlock {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Stable purpose consumed by the relevant workflow.
   */
  purpose: string;

  /**
   * BCP 47 language tag for this content version.
   */
  languageCode: string;

  version: string;

  title?: string;

  body: string;

  status: TenantContentBlockStatus;

  effectiveFrom?: IsoDateTime;

  effectiveTo?: IsoDateTime;

  /**
   * Previous version replaced by this content block.
   */
  supersedesContentBlockId?: WonFlowId;

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Notification delivery channel supported by the platform.
 *
 * Provider names and credentials are configuration and implementation
 * details. They must not become channel enum values.
 */
export type TenantNotificationChannel =
  | "email"
  | "sms"
  | "whatsapp"
  | "push";

/**
 * Named value accepted by a notification template.
 *
 * Variables are declared as data so the editor and runtime renderer can
 * validate template references without hardcoded event-specific
 * message bodies.
 */
export interface TenantNotificationTemplateVariable {
  name: string;

  description?: string;

  required: boolean;
}

/**
 * Lifecycle of a versioned notification template.
 */
export type TenantNotificationTemplateStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "retired";

/**
 * Versioned tenant-authored notification template for one event and
 * delivery channel.
 *
 * eventCode remains open so new notification events can be introduced
 * without embedding a tenant's wording in application code.
 */
export interface TenantNotificationTemplate {
  id: WonFlowId;

  organizationId: WonFlowId;

  eventCode: string;

  channel: TenantNotificationChannel;

  /**
   * BCP 47 language tag for this template.
   */
  languageCode: string;

  version: string;

  /**
   * Used by channels that support a subject.
   */
  subjectTemplate?: string;

  bodyTemplate: string;

  variables:
    TenantNotificationTemplateVariable[];

  status: TenantNotificationTemplateStatus;

  effectiveFrom?: IsoDateTime;

  effectiveTo?: IsoDateTime;

  /**
   * Previous version replaced by this template.
   */
  supersedesTemplateId?: WonFlowId;

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Lifecycle of a tenant terminology override.
 */
export type TenantTerminologyStatus =
  | "draft"
  | "active"
  | "retired";

/**
 * Tenant-controlled label override for one product term.
 *
 * termKey is a stable product key such as a navigation or workflow
 * concept. Labels are tenant data, allowing organizations to use their
 * own vocabulary without source-code changes.
 */
export interface TenantTerminology {
  id: WonFlowId;

  organizationId: WonFlowId;

  termKey: string;

  /**
   * BCP 47 language tag for this override.
   */
  languageCode: string;

  singularLabel: string;

  pluralLabel?: string;

  shortLabel?: string;

  status: TenantTerminologyStatus;

  effectiveFrom?: IsoDateTime;

  effectiveTo?: IsoDateTime;

  createdByUserId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Complete tenant-owned settings and content view.
 */
export interface TenantSettingsAggregate {
  profile?: TenantProfile;

  policySettings?:
    TenantPolicySettings;

  contentBlocks:
    TenantContentBlock[];

  notificationTemplates:
    TenantNotificationTemplate[];

  terminology:
    TenantTerminology[];
}
