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

// Scheduling and hospital operations
export * from "./scheduling/doctor-availability";
export * from "./appointments/appointment";
export * from "./operations/check-in-queue";

// Clinical care
export * from "./clinical/consultation";
export * from "./clinical/medication";

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