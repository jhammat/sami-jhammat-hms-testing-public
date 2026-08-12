import {
  readDemoInpatientAdmissions,
} from "@/lib/inpatient";

export type DemoBloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export type DemoBloodDonorStatus =
  | "active"
  | "deferred"
  | "inactive";

export type DemoBloodDonationStatus =
  | "registered"
  | "screened"
  | "collected"
  | "components-prepared"
  | "cancelled";

export type DemoBloodScreeningDecision =
  | "pending"
  | "eligible"
  | "deferred";

export type DemoBloodComponentType =
  | "whole-blood"
  | "packed-red-cells"
  | "fresh-frozen-plasma"
  | "platelets";

export type DemoBloodComponentStatus =
  | "available"
  | "reserved"
  | "issued"
  | "transfused"
  | "quarantined"
  | "discarded"
  | "expired";

export type DemoBloodCrossmatchStatus =
  | "pending"
  | "compatible"
  | "incompatible"
  | "issued"
  | "cancelled";

export type DemoBloodTransfusionStatus =
  | "in-progress"
  | "completed"
  | "stopped";

export type DemoBloodReactionSeverity =
  | "none"
  | "mild"
  | "moderate"
  | "severe";

export type DemoBloodExpiryState =
  | "safe"
  | "expiring"
  | "critical"
  | "expired"
  | "unknown";

export interface DemoBloodDonor {
  id: string;

  donorNumber: string;

  branchId: string;

  fullName: string;
  nationalId: string;
  phone: string;

  dateOfBirth: string;

  gender:
    | "male"
    | "female"
    | "other";

  bloodGroup:
    DemoBloodGroup;

  address: string;
  emergencyContact: string;

  status:
    DemoBloodDonorStatus;

  deferralReason: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoBloodDonation {
  id: string;

  donationNumber: string;

  donorId: string;
  branchId: string;

  status:
    DemoBloodDonationStatus;

  plannedCollectionDate: string;

  screeningDecision:
    DemoBloodScreeningDecision;

  screeningNote: string;
  screenedBy: string;
  screenedAt: string;

  bloodBagNumber: string;
  volumeMillilitres: number;

  collectedBy: string;
  collectedAt: string;

  cancellationReason: string;
  cancelledBy: string;
  cancelledAt: string;

  createdBy: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoBloodComponent {
  id: string;

  unitNumber: string;

  donationId: string;
  donorId: string;

  branchId: string;

  componentType:
    DemoBloodComponentType;

  bloodGroup:
    DemoBloodGroup;

  volumeMillilitres: number;

  preparedAt: string;
  preparedBy: string;

  expiryDate: string;

  storageLocation: string;

  status:
    DemoBloodComponentStatus;

  reservedCrossmatchId: string;
  patientId: string;

  discardReason: string;
  discardedBy: string;
  discardedAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoBloodCrossmatch {
  id: string;

  crossmatchNumber: string;

  patientId: string;
  admissionId: string;

  branchId: string;
  componentId: string;

  requestedBy: string;
  clinicalIndication: string;

  status:
    DemoBloodCrossmatchStatus;

  testedBy: string;
  testedAt: string;

  compatibilityNote: string;

  issuedBy: string;
  issuedAt: string;

  cancellationReason: string;
  cancelledBy: string;
  cancelledAt: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoBloodTransfusion {
  id: string;

  transfusionNumber: string;

  crossmatchId: string;
  componentId: string;

  patientId: string;
  admissionId: string;
  branchId: string;

  status:
    DemoBloodTransfusionStatus;

  patientIdentityVerified:
    boolean;

  bloodUnitVerified:
    boolean;

  consentConfirmed:
    boolean;

  baselineVitals: string;

  startedBy: string;
  startedAt: string;

  endedBy: string;
  endedAt: string;

  reactionSeverity:
    DemoBloodReactionSeverity;

  reactionDescription: string;
  reactionAction: string;

  observationNote: string;

  createdAt: string;
  updatedAt: string;
}

export interface DemoBloodBankSummary {
  activeDonors: number;

  pendingScreenings: number;
  collectedDonations: number;

  availableComponents: number;
  reservedComponents: number;
  issuedComponents: number;

  expiringComponents: number;

  pendingCrossmatches: number;
  transfusionsInProgress: number;
}

const DONOR_STORAGE_KEY =
  "wonflow-demo-blood-bank-donors";

const DONATION_STORAGE_KEY =
  "wonflow-demo-blood-bank-donations";

const COMPONENT_STORAGE_KEY =
  "wonflow-demo-blood-bank-components";

const CROSSMATCH_STORAGE_KEY =
  "wonflow-demo-blood-bank-crossmatches";

const TRANSFUSION_STORAGE_KEY =
  "wonflow-demo-blood-bank-transfusions";

function createIdentifier(
  prefix: string,
): string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

function createDateCode(): string {
  const date =
    new Date();

  return [
    date.getFullYear(),

    padNumber(
      date.getMonth() + 1,
    ),

    padNumber(
      date.getDate(),
    ),
  ].join("");
}

function generateNumber(
  prefix: string,
): string {
  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  return `${prefix}-${createDateCode()}-${randomPart}`;
}

function readStoredArray<T>(
  key: string,
): T[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      key,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as T[]
      : [];
  } catch {
    return [];
  }
}

function writeStoredArray<T>(
  key: string,

  eventName: string,

  records:
    readonly T[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    key,

    JSON.stringify(
      records.slice(0, 10_000),
    ),
  );

  window.dispatchEvent(
    new Event(eventName),
  );
}

export function readDemoBloodDonors():
  DemoBloodDonor[] {
  return readStoredArray<
    DemoBloodDonor
  >(
    DONOR_STORAGE_KEY,
  );
}

export function writeDemoBloodDonors(
  donors:
    readonly DemoBloodDonor[],
): void {
  writeStoredArray(
    DONOR_STORAGE_KEY,

    "wonflow:demo-blood-donors-changed",

    donors,
  );
}

export function readDemoBloodDonations():
  DemoBloodDonation[] {
  return readStoredArray<
    DemoBloodDonation
  >(
    DONATION_STORAGE_KEY,
  );
}

export function writeDemoBloodDonations(
  donations:
    readonly DemoBloodDonation[],
): void {
  writeStoredArray(
    DONATION_STORAGE_KEY,

    "wonflow:demo-blood-donations-changed",

    donations,
  );
}

export function readDemoBloodComponents():
  DemoBloodComponent[] {
  return readStoredArray<
    DemoBloodComponent
  >(
    COMPONENT_STORAGE_KEY,
  );
}

export function writeDemoBloodComponents(
  components:
    readonly DemoBloodComponent[],
): void {
  writeStoredArray(
    COMPONENT_STORAGE_KEY,

    "wonflow:demo-blood-components-changed",

    components,
  );
}

export function readDemoBloodCrossmatches():
  DemoBloodCrossmatch[] {
  return readStoredArray<
    DemoBloodCrossmatch
  >(
    CROSSMATCH_STORAGE_KEY,
  );
}

export function writeDemoBloodCrossmatches(
  crossmatches:
    readonly DemoBloodCrossmatch[],
): void {
  writeStoredArray(
    CROSSMATCH_STORAGE_KEY,

    "wonflow:demo-blood-crossmatches-changed",

    crossmatches,
  );
}

export function readDemoBloodTransfusions():
  DemoBloodTransfusion[] {
  return readStoredArray<
    DemoBloodTransfusion
  >(
    TRANSFUSION_STORAGE_KEY,
  );
}

export function writeDemoBloodTransfusions(
  transfusions:
    readonly DemoBloodTransfusion[],
): void {
  writeStoredArray(
    TRANSFUSION_STORAGE_KEY,

    "wonflow:demo-blood-transfusions-changed",

    transfusions,
  );
}

export function validateDemoBloodDonor(
  input: {
    branchId: string;

    fullName: string;
    nationalId: string;
    phone: string;

    dateOfBirth: string;

    gender:
      | "male"
      | "female"
      | "other";

    bloodGroup:
      DemoBloodGroup;

    address: string;
    emergencyContact: string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the hospital branch.",
    );
  }

  if (
    input.fullName
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the donor’s full name.",
    );
  }

  if (
    input.nationalId
      .trim()
      .length < 5
  ) {
    errors.push(
      "Enter the donor’s national identification number.",
    );
  }

  if (
    input.phone
      .trim()
      .length < 7
  ) {
    errors.push(
      "Enter a valid donor phone number.",
    );
  }

  if (
    input.dateOfBirth ===
      "" ||
    Number.isNaN(
      new Date(
        `${input.dateOfBirth}T00:00:00`,
      ).getTime(),
    )
  ) {
    errors.push(
      "Enter a valid date of birth.",
    );
  }

  const duplicate =
    readDemoBloodDonors()
      .some(
        (donor) =>
          donor.branchId ===
            input.branchId &&
          donor.nationalId
            .trim()
            .toLocaleLowerCase() ===
            input.nationalId
              .trim()
              .toLocaleLowerCase(),
      );

  if (duplicate) {
    errors.push(
      "A donor with this identification number already exists in the selected branch.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function registerDemoBloodDonor(
  input: {
    branchId: string;

    fullName: string;
    nationalId: string;
    phone: string;

    dateOfBirth: string;

    gender:
      | "male"
      | "female"
      | "other";

    bloodGroup:
      DemoBloodGroup;

    address: string;
    emergencyContact: string;
  },
): DemoBloodDonor |
  undefined {
  const errors =
    validateDemoBloodDonor(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const donor:
    DemoBloodDonor = {
    id:
      createIdentifier(
        "blood-donor",
      ),

    donorNumber:
      generateNumber("DON"),

    branchId:
      input.branchId,

    fullName:
      input.fullName.trim(),

    nationalId:
      input.nationalId.trim(),

    phone:
      input.phone.trim(),

    dateOfBirth:
      input.dateOfBirth,

    gender:
      input.gender,

    bloodGroup:
      input.bloodGroup,

    address:
      input.address.trim(),

    emergencyContact:
      input.emergencyContact
        .trim(),

    status: "active",

    deferralReason: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoBloodDonors([
    donor,

    ...readDemoBloodDonors(),
  ]);

  return donor;
}

export function updateDemoBloodDonorStatus(
  input: {
    donorId: string;

    status:
      DemoBloodDonorStatus;

    reason: string;
  },
): DemoBloodDonor |
  undefined {
  const donors =
    readDemoBloodDonors();

  const donor =
    donors.find(
      (record) =>
        record.id ===
        input.donorId,
    );

  if (
    donor === undefined
  ) {
    return undefined;
  }

  if (
    input.status !==
      "active" &&
    input.reason
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const updated:
    DemoBloodDonor = {
    ...donor,

    status:
      input.status,

    deferralReason:
      input.status ===
      "active"
        ? ""
        : input.reason.trim(),

    updatedAt:
      new Date().toISOString(),
  };

  writeDemoBloodDonors(
    donors.map(
      (record) =>
        record.id ===
        donor.id
          ? updated
          : record,
    ),
  );

  return updated;
}

export function createDemoBloodDonation(
  input: {
    donorId: string;
    branchId: string;

    plannedCollectionDate:
      string;

    createdBy: string;
  },
): DemoBloodDonation |
  undefined {
  const donor =
    readDemoBloodDonors()
      .find(
        (record) =>
          record.id ===
          input.donorId,
      );

  if (
    donor === undefined ||
    donor.status !== "active" ||
    donor.branchId !==
      input.branchId ||
    input.plannedCollectionDate ===
      "" ||
    input.createdBy
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  const hasOpenDonation =
    readDemoBloodDonations()
      .some(
        (donation) =>
          donation.donorId ===
            donor.id &&
          donation.status !==
            "cancelled" &&
          donation.status !==
            "components-prepared",
      );

  if (hasOpenDonation) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const donation:
    DemoBloodDonation = {
    id:
      createIdentifier(
        "blood-donation",
      ),

    donationNumber:
      generateNumber("DNT"),

    donorId:
      donor.id,

    branchId:
      donor.branchId,

    status:
      "registered",

    plannedCollectionDate:
      input.plannedCollectionDate,

    screeningDecision:
      "pending",

    screeningNote: "",
    screenedBy: "",
    screenedAt: "",

    bloodBagNumber: "",
    volumeMillilitres: 0,

    collectedBy: "",
    collectedAt: "",

    cancellationReason: "",
    cancelledBy: "",
    cancelledAt: "",

    createdBy:
      input.createdBy.trim(),

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoBloodDonations([
    donation,

    ...readDemoBloodDonations(),
  ]);

  return donation;
}

export function screenDemoBloodDonation(
  input: {
    donationId: string;

    decision:
      Exclude<
        DemoBloodScreeningDecision,
        "pending"
      >;

    note: string;
    screenedBy: string;
  },
): DemoBloodDonation |
  undefined {
  const donations =
    readDemoBloodDonations();

  const donation =
    donations.find(
      (record) =>
        record.id ===
        input.donationId,
    );

  if (
    donation === undefined ||
    donation.status !==
      "registered" ||
    input.screenedBy
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  if (
    input.decision ===
      "deferred" &&
    input.note.trim().length <
      3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const screened:
    DemoBloodDonation = {
    ...donation,

    status:
      "screened",

    screeningDecision:
      input.decision,

    screeningNote:
      input.note.trim(),

    screenedBy:
      input.screenedBy.trim(),

    screenedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoBloodDonations(
    donations.map(
      (record) =>
        record.id ===
        donation.id
          ? screened
          : record,
    ),
  );

  if (
    input.decision ===
    "deferred"
  ) {
    updateDemoBloodDonorStatus({
      donorId:
        donation.donorId,

      status: "deferred",

      reason:
        input.note,
    });
  }

  return screened;
}

export function collectDemoBloodDonation(
  input: {
    donationId: string;

    bloodBagNumber: string;

    volumeMillilitres:
      number;

    collectedBy: string;
    collectedAt: string;
  },
): DemoBloodDonation |
  undefined {
  const donations =
    readDemoBloodDonations();

  const donation =
    donations.find(
      (record) =>
        record.id ===
        input.donationId,
    );

  if (
    donation === undefined ||
    donation.status !==
      "screened" ||
    donation.screeningDecision !==
      "eligible" ||
    input.bloodBagNumber
      .trim()
      .length < 3 ||
    input.collectedBy
      .trim()
      .length < 2 ||
    input.collectedAt ===
      "" ||
    !Number.isFinite(
      input.volumeMillilitres,
    ) ||
    input.volumeMillilitres <=
      0
  ) {
    return undefined;
  }

  const duplicateBag =
    donations.some(
      (record) =>
        record.id !==
          donation.id &&
        record.bloodBagNumber
          .trim()
          .toLocaleLowerCase() ===
          input.bloodBagNumber
            .trim()
            .toLocaleLowerCase(),
    );

  if (duplicateBag) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const collected:
    DemoBloodDonation = {
    ...donation,

    status: "collected",

    bloodBagNumber:
      input.bloodBagNumber
        .trim(),

    volumeMillilitres:
      Math.round(
        input.volumeMillilitres,
      ),

    collectedBy:
      input.collectedBy.trim(),

    collectedAt:
      new Date(
        input.collectedAt,
      ).toISOString(),

    updatedAt:
      timestamp,
  };

  writeDemoBloodDonations(
    donations.map(
      (record) =>
        record.id ===
        donation.id
          ? collected
          : record,
    ),
  );

  return collected;
}

export function prepareDemoBloodComponent(
  input: {
    donationId: string;

    componentType:
      DemoBloodComponentType;

    volumeMillilitres:
      number;

    expiryDate: string;
    storageLocation: string;

    preparedBy: string;
  },
): DemoBloodComponent |
  undefined {
  const donations =
    readDemoBloodDonations();

  const donation =
    donations.find(
      (record) =>
        record.id ===
        input.donationId,
    );

  const donor =
    donation === undefined
      ? undefined
      : readDemoBloodDonors()
          .find(
            (record) =>
              record.id ===
              donation.donorId,
          );

  if (
    donation === undefined ||
    donor === undefined ||
    (
      donation.status !==
        "collected" &&
      donation.status !==
        "components-prepared"
    ) ||
    !Number.isFinite(
      input.volumeMillilitres,
    ) ||
    input.volumeMillilitres <=
      0 ||
    input.expiryDate ===
      "" ||
    input.storageLocation
      .trim()
      .length < 2 ||
    input.preparedBy
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  const duplicateType =
    readDemoBloodComponents()
      .some(
        (component) =>
          component.donationId ===
            donation.id &&
          component.componentType ===
            input.componentType,
      );

  if (duplicateType) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const component:
    DemoBloodComponent = {
    id:
      createIdentifier(
        "blood-component",
      ),

    unitNumber:
      generateNumber("BCU"),

    donationId:
      donation.id,

    donorId:
      donor.id,

    branchId:
      donation.branchId,

    componentType:
      input.componentType,

    bloodGroup:
      donor.bloodGroup,

    volumeMillilitres:
      Math.round(
        input.volumeMillilitres,
      ),

    preparedAt:
      timestamp,

    preparedBy:
      input.preparedBy.trim(),

    expiryDate:
      input.expiryDate,

    storageLocation:
      input.storageLocation
        .trim(),

    status: "available",

    reservedCrossmatchId: "",
    patientId: "",

    discardReason: "",
    discardedBy: "",
    discardedAt: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoBloodComponents([
    component,

    ...readDemoBloodComponents(),
  ]);

  writeDemoBloodDonations(
    donations.map(
      (record) =>
        record.id ===
        donation.id
          ? {
              ...record,

              status:
                "components-prepared",

              updatedAt:
                timestamp,
            }
          : record,
    ),
  );

  return component;
}

export function classifyDemoBloodComponentExpiry(
  component:
    DemoBloodComponent,
): DemoBloodExpiryState {
  if (
    component.expiryDate ===
    ""
  ) {
    return "unknown";
  }

  const expiryTime =
    new Date(
      `${component.expiryDate}T23:59:59`,
    ).getTime();

  if (
    Number.isNaN(expiryTime)
  ) {
    return "unknown";
  }

  const daysRemaining =
    Math.ceil(
      (
        expiryTime -
        Date.now()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        ),
    );

  if (
    daysRemaining < 0
  ) {
    return "expired";
  }

  if (
    daysRemaining <= 3
  ) {
    return "critical";
  }

  if (
    daysRemaining <= 14
  ) {
    return "expiring";
  }

  return "safe";
}

export function discardDemoBloodComponent(
  input: {
    componentId: string;

    discardedBy: string;
    reason: string;
  },
): DemoBloodComponent |
  undefined {
  const components =
    readDemoBloodComponents();

  const component =
    components.find(
      (record) =>
        record.id ===
        input.componentId,
    );

  if (
    component === undefined ||
    (
      component.status !==
        "available" &&
      component.status !==
        "quarantined" &&
      component.status !==
        "expired"
    ) ||
    input.discardedBy
      .trim()
      .length < 2 ||
    input.reason
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const discarded:
    DemoBloodComponent = {
    ...component,

    status: "discarded",

    discardReason:
      input.reason.trim(),

    discardedBy:
      input.discardedBy
        .trim(),

    discardedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoBloodComponents(
    components.map(
      (record) =>
        record.id ===
        component.id
          ? discarded
          : record,
    ),
  );

  return discarded;
}

export function validateDemoBloodCrossmatch(
  input: {
    patientId: string;
    admissionId: string;

    branchId: string;
    componentId: string;

    requestedBy: string;
    clinicalIndication:
      string;
  },
): string[] {
  const errors:
    string[] = [];

  if (
    input.patientId.trim() ===
    ""
  ) {
    errors.push(
      "Select the patient requiring blood.",
    );
  }

  if (
    input.branchId.trim() ===
    ""
  ) {
    errors.push(
      "Select the hospital branch.",
    );
  }

  const component =
    readDemoBloodComponents()
      .find(
        (record) =>
          record.id ===
          input.componentId,
      );

  if (
    component === undefined
  ) {
    errors.push(
      "Select a blood component.",
    );
  } else {
    if (
      component.branchId !==
      input.branchId
    ) {
      errors.push(
        "The selected blood component belongs to another hospital branch.",
      );
    }

    if (
      component.status !==
      "available"
    ) {
      errors.push(
        "The selected blood component is not available.",
      );
    }

    if (
      classifyDemoBloodComponentExpiry(
        component,
      ) === "expired"
    ) {
      errors.push(
        "An expired blood component cannot be reserved.",
      );
    }
  }

  if (
    input.requestedBy
      .trim()
      .length < 2
  ) {
    errors.push(
      "Enter the clinician requesting the crossmatch.",
    );
  }

  if (
    input.clinicalIndication
      .trim()
      .length < 3
  ) {
    errors.push(
      "Enter the clinical indication for transfusion.",
    );
  }

  if (
    input.admissionId !==
    ""
  ) {
    const admission =
      readDemoInpatientAdmissions()
        .find(
          (record) =>
            record.id ===
            input.admissionId,
        );

    if (
      admission === undefined
    ) {
      errors.push(
        "The selected inpatient admission could not be found.",
      );
    } else {
      if (
        admission.patientId !==
        input.patientId
      ) {
        errors.push(
          "The inpatient admission belongs to another patient.",
        );
      }

      if (
        admission.branchId !==
        input.branchId
      ) {
        errors.push(
          "The inpatient admission belongs to another hospital branch.",
        );
      }
    }
  }

  const duplicateOpenRequest =
    readDemoBloodCrossmatches()
      .some(
        (crossmatch) =>
          crossmatch.componentId ===
            input.componentId &&
          (
            crossmatch.status ===
              "pending" ||
            crossmatch.status ===
              "compatible" ||
            crossmatch.status ===
              "issued"
          ),
      );

  if (duplicateOpenRequest) {
    errors.push(
      "The selected blood component already has an active crossmatch request.",
    );
  }

  return [
    ...new Set(errors),
  ];
}

export function createDemoBloodCrossmatch(
  input: {
    patientId: string;
    admissionId: string;

    branchId: string;
    componentId: string;

    requestedBy: string;
    clinicalIndication:
      string;
  },
): DemoBloodCrossmatch |
  undefined {
  const errors =
    validateDemoBloodCrossmatch(
      input,
    );

  if (
    errors.length > 0
  ) {
    return undefined;
  }

  const component =
    readDemoBloodComponents()
      .find(
        (record) =>
          record.id ===
          input.componentId,
      );

  if (
    component === undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const crossmatch:
    DemoBloodCrossmatch = {
    id:
      createIdentifier(
        "blood-crossmatch",
      ),

    crossmatchNumber:
      generateNumber("XM"),

    patientId:
      input.patientId,

    admissionId:
      input.admissionId,

    branchId:
      input.branchId,

    componentId:
      component.id,

    requestedBy:
      input.requestedBy.trim(),

    clinicalIndication:
      input.clinicalIndication
        .trim(),

    status: "pending",

    testedBy: "",
    testedAt: "",

    compatibilityNote: "",

    issuedBy: "",
    issuedAt: "",

    cancellationReason: "",
    cancelledBy: "",
    cancelledAt: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoBloodCrossmatches([
    crossmatch,

    ...readDemoBloodCrossmatches(),
  ]);

  writeDemoBloodComponents(
    readDemoBloodComponents()
      .map(
        (record) =>
          record.id ===
          component.id
            ? {
                ...record,

                status:
                  "reserved",

                reservedCrossmatchId:
                  crossmatch.id,

                patientId:
                  input.patientId,

                updatedAt:
                  timestamp,
              }
            : record,
      ),
  );

  return crossmatch;
}

export function recordDemoBloodCrossmatchResult(
  input: {
    crossmatchId: string;

    result:
      | "compatible"
      | "incompatible";

    testedBy: string;
    compatibilityNote:
      string;
  },
): DemoBloodCrossmatch |
  undefined {
  const crossmatches =
    readDemoBloodCrossmatches();

  const crossmatch =
    crossmatches.find(
      (record) =>
        record.id ===
        input.crossmatchId,
    );

  if (
    crossmatch === undefined ||
    crossmatch.status !==
      "pending" ||
    input.testedBy
      .trim()
      .length < 2 ||
    input.compatibilityNote
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updated:
    DemoBloodCrossmatch = {
    ...crossmatch,

    status:
      input.result,

    testedBy:
      input.testedBy.trim(),

    testedAt:
      timestamp,

    compatibilityNote:
      input.compatibilityNote
        .trim(),

    updatedAt:
      timestamp,
  };

  writeDemoBloodCrossmatches(
    crossmatches.map(
      (record) =>
        record.id ===
        crossmatch.id
          ? updated
          : record,
    ),
  );

  if (
    input.result ===
    "incompatible"
  ) {
    writeDemoBloodComponents(
      readDemoBloodComponents()
        .map(
          (component) =>
            component.id ===
            crossmatch.componentId
              ? {
                  ...component,

                  status:
                    "available",

                  reservedCrossmatchId:
                    "",

                  patientId: "",

                  updatedAt:
                    timestamp,
                }
              : component,
        ),
    );
  }

  return updated;
}

export function issueDemoBloodComponent(
  input: {
    crossmatchId: string;
    issuedBy: string;
  },
): DemoBloodCrossmatch |
  undefined {
  const crossmatches =
    readDemoBloodCrossmatches();

  const crossmatch =
    crossmatches.find(
      (record) =>
        record.id ===
        input.crossmatchId,
    );

  if (
    crossmatch === undefined ||
    crossmatch.status !==
      "compatible" ||
    input.issuedBy
      .trim()
      .length < 2
  ) {
    return undefined;
  }

  const component =
    readDemoBloodComponents()
      .find(
        (record) =>
          record.id ===
          crossmatch.componentId,
      );

  if (
    component === undefined ||
    component.status !==
      "reserved" ||
    component.reservedCrossmatchId !==
      crossmatch.id ||
    classifyDemoBloodComponentExpiry(
      component,
    ) === "expired"
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const issuedCrossmatch:
    DemoBloodCrossmatch = {
    ...crossmatch,

    status: "issued",

    issuedBy:
      input.issuedBy.trim(),

    issuedAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoBloodCrossmatches(
    crossmatches.map(
      (record) =>
        record.id ===
        crossmatch.id
          ? issuedCrossmatch
          : record,
    ),
  );

  writeDemoBloodComponents(
    readDemoBloodComponents()
      .map(
        (record) =>
          record.id ===
          component.id
            ? {
                ...record,

                status: "issued",

                updatedAt:
                  timestamp,
              }
            : record,
      ),
  );

  return issuedCrossmatch;
}

export function cancelDemoBloodCrossmatch(
  input: {
    crossmatchId: string;

    cancelledBy: string;
    reason: string;
  },
): DemoBloodCrossmatch |
  undefined {
  const crossmatches =
    readDemoBloodCrossmatches();

  const crossmatch =
    crossmatches.find(
      (record) =>
        record.id ===
        input.crossmatchId,
    );

  if (
    crossmatch === undefined ||
    (
      crossmatch.status !==
        "pending" &&
      crossmatch.status !==
        "compatible"
    ) ||
    input.cancelledBy
      .trim()
      .length < 2 ||
    input.reason
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const cancelled:
    DemoBloodCrossmatch = {
    ...crossmatch,

    status: "cancelled",

    cancelledBy:
      input.cancelledBy.trim(),

    cancellationReason:
      input.reason.trim(),

    cancelledAt:
      timestamp,

    updatedAt:
      timestamp,
  };

  writeDemoBloodCrossmatches(
    crossmatches.map(
      (record) =>
        record.id ===
        crossmatch.id
          ? cancelled
          : record,
    ),
  );

  writeDemoBloodComponents(
    readDemoBloodComponents()
      .map(
        (component) =>
          component.id ===
          crossmatch.componentId
            ? {
                ...component,

                status:
                  "available",

                reservedCrossmatchId:
                  "",

                patientId: "",

                updatedAt:
                  timestamp,
              }
            : component,
      ),
  );

  return cancelled;
}

export function startDemoBloodTransfusion(
  input: {
    crossmatchId: string;

    patientIdentityVerified:
      boolean;

    bloodUnitVerified:
      boolean;

    consentConfirmed:
      boolean;

    baselineVitals: string;

    startedBy: string;
    startedAt: string;
  },
): DemoBloodTransfusion |
  undefined {
  const crossmatch =
    readDemoBloodCrossmatches()
      .find(
        (record) =>
          record.id ===
          input.crossmatchId,
      );

  const component =
    crossmatch === undefined
      ? undefined
      : readDemoBloodComponents()
          .find(
            (record) =>
              record.id ===
              crossmatch.componentId,
          );

  if (
    crossmatch === undefined ||
    component === undefined ||
    crossmatch.status !==
      "issued" ||
    component.status !==
      "issued" ||
    !input.patientIdentityVerified ||
    !input.bloodUnitVerified ||
    !input.consentConfirmed ||
    input.baselineVitals
      .trim()
      .length < 3 ||
    input.startedBy
      .trim()
      .length < 2 ||
    input.startedAt ===
      ""
  ) {
    return undefined;
  }

  const existing =
    readDemoBloodTransfusions()
      .find(
        (record) =>
          record.crossmatchId ===
          crossmatch.id,
      );

  if (
    existing !== undefined
  ) {
    return existing;
  }

  const timestamp =
    new Date().toISOString();

  const transfusion:
    DemoBloodTransfusion = {
    id:
      createIdentifier(
        "blood-transfusion",
      ),

    transfusionNumber:
      generateNumber("TRF"),

    crossmatchId:
      crossmatch.id,

    componentId:
      component.id,

    patientId:
      crossmatch.patientId,

    admissionId:
      crossmatch.admissionId,

    branchId:
      crossmatch.branchId,

    status:
      "in-progress",

    patientIdentityVerified:
      true,

    bloodUnitVerified:
      true,

    consentConfirmed:
      true,

    baselineVitals:
      input.baselineVitals
        .trim(),

    startedBy:
      input.startedBy.trim(),

    startedAt:
      new Date(
        input.startedAt,
      ).toISOString(),

    endedBy: "",
    endedAt: "",

    reactionSeverity:
      "none",

    reactionDescription: "",
    reactionAction: "",

    observationNote: "",

    createdAt: timestamp,
    updatedAt: timestamp,
  };

  writeDemoBloodTransfusions([
    transfusion,

    ...readDemoBloodTransfusions(),
  ]);

  return transfusion;
}

export function completeDemoBloodTransfusion(
  input: {
    transfusionId: string;

    status:
      | "completed"
      | "stopped";

    endedBy: string;
    endedAt: string;

    reactionSeverity:
      DemoBloodReactionSeverity;

    reactionDescription:
      string;

    reactionAction: string;

    observationNote: string;
  },
): DemoBloodTransfusion |
  undefined {
  const transfusions =
    readDemoBloodTransfusions();

  const transfusion =
    transfusions.find(
      (record) =>
        record.id ===
        input.transfusionId,
    );

  if (
    transfusion === undefined ||
    transfusion.status !==
      "in-progress" ||
    input.endedBy
      .trim()
      .length < 2 ||
    input.endedAt ===
      "" ||
    input.observationNote
      .trim()
      .length < 3
  ) {
    return undefined;
  }

  const startTime =
    new Date(
      transfusion.startedAt,
    ).getTime();

  const endTime =
    new Date(
      input.endedAt,
    ).getTime();

  if (
    Number.isNaN(endTime) ||
    endTime < startTime
  ) {
    return undefined;
  }

  if (
    input.reactionSeverity !==
      "none" &&
    (
      input.reactionDescription
        .trim()
        .length < 3 ||
      input.reactionAction
        .trim()
        .length < 3
    )
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const completed:
    DemoBloodTransfusion = {
    ...transfusion,

    status:
      input.status,

    endedBy:
      input.endedBy.trim(),

    endedAt:
      new Date(
        input.endedAt,
      ).toISOString(),

    reactionSeverity:
      input.reactionSeverity,

    reactionDescription:
      input.reactionDescription
        .trim(),

    reactionAction:
      input.reactionAction
        .trim(),

    observationNote:
      input.observationNote
        .trim(),

    updatedAt:
      timestamp,
  };

  writeDemoBloodTransfusions(
    transfusions.map(
      (record) =>
        record.id ===
        transfusion.id
          ? completed
          : record,
    ),
  );

  writeDemoBloodComponents(
    readDemoBloodComponents()
      .map(
        (component) =>
          component.id ===
          transfusion.componentId
            ? {
                ...component,

                status:
                  "transfused",

                updatedAt:
                  timestamp,
              }
            : component,
      ),
  );

  return completed;
}

export function buildDemoBloodBankSummary(
  branchId = "",
): DemoBloodBankSummary {
  const donors =
    readDemoBloodDonors()
      .filter(
        (donor) =>
          branchId === "" ||
          donor.branchId ===
            branchId,
      );

  const donations =
    readDemoBloodDonations()
      .filter(
        (donation) =>
          branchId === "" ||
          donation.branchId ===
            branchId,
      );

  const components =
    readDemoBloodComponents()
      .filter(
        (component) =>
          branchId === "" ||
          component.branchId ===
            branchId,
      );

  const crossmatches =
    readDemoBloodCrossmatches()
      .filter(
        (crossmatch) =>
          branchId === "" ||
          crossmatch.branchId ===
            branchId,
      );

  const transfusions =
    readDemoBloodTransfusions()
      .filter(
        (transfusion) =>
          branchId === "" ||
          transfusion.branchId ===
            branchId,
      );

  return {
    activeDonors:
      donors.filter(
        (donor) =>
          donor.status ===
          "active",
      ).length,

    pendingScreenings:
      donations.filter(
        (donation) =>
          donation.status ===
            "registered",
      ).length,

    collectedDonations:
      donations.filter(
        (donation) =>
          donation.status ===
            "collected",
      ).length,

    availableComponents:
      components.filter(
        (component) =>
          component.status ===
            "available",
      ).length,

    reservedComponents:
      components.filter(
        (component) =>
          component.status ===
            "reserved",
      ).length,

    issuedComponents:
      components.filter(
        (component) =>
          component.status ===
            "issued",
      ).length,

    expiringComponents:
      components.filter(
        (component) => {
          const expiry =
            classifyDemoBloodComponentExpiry(
              component,
            );

          return (
            expiry ===
              "expiring" ||
            expiry ===
              "critical" ||
            expiry ===
              "expired"
          );
        },
      ).length,

    pendingCrossmatches:
      crossmatches.filter(
        (crossmatch) =>
          crossmatch.status ===
            "pending",
      ).length,

    transfusionsInProgress:
      transfusions.filter(
        (transfusion) =>
          transfusion.status ===
            "in-progress",
      ).length,
  };
}