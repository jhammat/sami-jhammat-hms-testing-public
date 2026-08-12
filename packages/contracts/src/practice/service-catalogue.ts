/**
 * Independent-practice service catalogue and location offerings.
 *
 * A service describes what the practice provides. An offering describes
 * where that service is available, its fee and how payment is collected.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import type {
  DoctorConsultationMode,
} from "../scheduling/doctor-availability";

export type PracticeServiceCategory =
  | "initial-consultation"
  | "follow-up-consultation"
  | "dietitian-consultation"
  | "teleconsultation"
  | "report-review"
  | "procedure"
  | "post-operative-review"
  | "multidisciplinary-review"
  | "home-visit"
  | "other";

export type PracticeServiceEligibility =
  | "new-patient"
  | "existing-patient"
  | "post-operative-patient"
  | "referred-patient"
  | "adult"
  | "child"
  | "all-patients";

/**
 * Determines how clinicians are selected for a service.
 *
 * "unassigned" allows catalogue setup before the care team exists.
 * It cannot be publicly booked.
 */
export type PracticeServiceDeliveryScope =
  | "unassigned"
  | "any-active-clinician"
  | "selected-clinicians";

export type PracticeFeeCollector =
  | "practice"
  | "hospital";

export type PracticePaymentTiming =
  | "not-required"
  | "at-booking"
  | "before-appointment"
  | "at-location"
  | "after-service";

export interface PracticeMoney {
  /**
   * Integer minor units.
   *
   * PKR 2,500.00 is represented as 250000 paisa.
   */
  amountMinorUnits: number;

  currencyCode: string;
}

/**
 * A service offered by the independent practice.
 */
export interface PracticeService {
  id: WonFlowId;

  /**
   * Tenant organization that owns this service.
   */
  organizationId: WonFlowId;

  /**
   * Specific clinician this service concerns, when applicable.
   *
   * This field identifies a clinically specific service. It does not
   * represent organization ownership.
   */
  practitionerId?: WonFlowId;

  /**
   * Controls whether this service is unassigned, available to any active
   * clinician, or limited to selected clinicians.
   */
  deliveryScope:
    PracticeServiceDeliveryScope;

  /**
   * Practitioner IDs permitted to deliver the service when deliveryScope
   * is "selected-clinicians".
   *
   * This is intentionally empty for the other delivery scopes.
   */
  eligiblePractitionerIds:
    WonFlowId[];

  code: string;

  name: string;

  description?: string;

  category: PracticeServiceCategory;

  defaultDurationMinutes: number;

  consultationModes: DoctorConsultationMode[];

  eligibility: PracticeServiceEligibility[];

  preparationInstructions?: string;

  requiresDocumentUpload: boolean;

  /**
   * Whether the service may be displayed on tenant-controlled public
   * pages.
   */
  publicVisible: boolean;

  publiclyBookable: boolean;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Makes a service available at a particular practice location.
 */
export interface PracticeServiceOffering {
  id: WonFlowId;

  /**
   * Tenant organization that owns this location-specific offering.
   */
  organizationId: WonFlowId;

  practiceServiceId: WonFlowId;

  practiceLocationId: WonFlowId;

  fee: PracticeMoney;

  feeCollector: PracticeFeeCollector;

  paymentTiming: PracticePaymentTiming;

  /**
   * Overrides the service's default duration at this location.
   */
  durationOverrideMinutes?: number;

  locationInstructions?: string;

  publiclyBookable: boolean;

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Append-only explanation of a fee change.
 *
 * Historical appointments and receipts keep the quoted amount that was
 * valid when they were created.
 */
export interface PracticeServiceFeeChange {
  id: WonFlowId;

  /**
   * Tenant organization that owns this fee-history record.
   */
  organizationId: WonFlowId;

  practiceServiceOfferingId: WonFlowId;

  previousFee?: PracticeMoney;

  newFee: PracticeMoney;

  effectiveFrom: IsoDateTime;

  changedByUserId: WonFlowId;

  reason: string;

  createdAt: IsoDateTime;
}

export interface PracticeServiceCatalogue {
  services: PracticeService[];

  offerings: PracticeServiceOffering[];

  feeHistory: PracticeServiceFeeChange[];
}

/**
 * Returns services owned by a tenant organization.
 */
export function getPracticeServicesForOrganization(
  services: readonly PracticeService[],
  organizationId: WonFlowId,
): PracticeService[] {
  return services.filter(
    (service) =>
      service.organizationId ===
      organizationId,
  );
}

/**
 * Returns service offerings owned by a tenant organization.
 */
export function getPracticeServiceOfferingsForOrganization(
  offerings: readonly PracticeServiceOffering[],
  organizationId: WonFlowId,
): PracticeServiceOffering[] {
  return offerings.filter(
    (offering) =>
      offering.organizationId ===
      organizationId,
  );
}

/**
 * Returns active offerings available at one practice location.
 */
export function getActivePracticeOfferingsForLocation(
  offerings: readonly PracticeServiceOffering[],
  practiceLocationId: WonFlowId,
  now: IsoDateTime,
): PracticeServiceOffering[] {
  return offerings.filter(
    (offering) => {
      if (
        offering.practiceLocationId !==
        practiceLocationId
      ) {
        return false;
      }

      if (offering.status !== "active") {
        return false;
      }

      if (offering.effectiveFrom > now) {
        return false;
      }

      if (
        offering.effectiveTo !== undefined &&
        offering.effectiveTo < now
      ) {
        return false;
      }

      return true;
    },
  );
}

/**
 * Returns the location-specific duration when configured, otherwise the
 * service's standard duration.
 */
export function resolvePracticeOfferingDurationMinutes(
  service: PracticeService,
  offering: PracticeServiceOffering,
): number {
  return (
    offering.durationOverrideMinutes ??
    service.defaultDurationMinutes
  );
}

/**
 * Compares monetary values without converting to floating-point units.
 */
export function arePracticeMoneyValuesEqual(
  left: PracticeMoney,
  right: PracticeMoney,
): boolean {
  return (
    left.amountMinorUnits ===
      right.amountMinorUnits &&
    left.currencyCode ===
      right.currencyCode
  );
}
