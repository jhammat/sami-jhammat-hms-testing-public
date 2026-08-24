/**
 * WonFlow shared public contract entry point.
 *
 * Applications should normally import from:
 *
 * @wonflow/contracts
 *
 * Avoid importing internal files through long relative paths.
 */

// Package metadata
export * from "./package-metadata";

// Organization and platform structure
export * from "./organization/hierarchy";
export * from "./access/authorization";
export * from "./access/request-context";
export * from "./access/phase-1-permissions";
export * from "./platform/modules";

// Patient identity and journeys
export * from "./patient/identity";
export * from "./patient/encounter";
export * from "./patient/journey";
export * from "./patient/caregiver";

// Independent practice and patient portal
export * from "./practice/practice-location";
export * from "./practice/service-catalogue";
export * from "./practice/practice-document";
export * from "./practice/care-team";
export * from "./practice/tenancy";
export * from "./practice/patient-account";
export * from "./practice/practice-booking";
export * from "./practice/practice-payment";
export * from "./practice/practice-message";
export * from "./practice/patient-sharing";
export * from "./practice/tenant-settings";
export * from "./practice/practice-booking-time";

// Scheduling and hospital operations
export * from "./scheduling/doctor-availability";
export * from "./appointments/appointment";
export * from "./operations/check-in-queue";

// Clinical care
export * from "./clinical/consultation";
export * from "./clinical/medication";
export * from "./clinical/referral";
export * from "./clinical/observation";
export * from "./clinical/careplan";
export * from "./clinical/drain";
export * from "./clinical/symptom";
export * from "./clinical/education";
export * from "./clinical/physiotherapy";
export * from "./clinical/nutrition";
export * from "./offline/sync";




// Diagnostics
export * from "./diagnostics/laboratory";
export * from "./diagnostics/radiology";

// Pharmacy
export * from "./pharmacy/dispensing";

// Finance and insurance
export * from "./finance/billing";
export * from "./insurance/claims";

// Inpatient care
export * from "./inpatient/admission";
export * from "./inpatient/nursing";

// Surgery and operation theatre
export * from "./surgery/operation-theatre";