/**
 * WonFlow deterministic fictional demonstration data.
 *
 * Never place real patient or hospital data in this package.
 */

export * from "./types";

export * from "./core/seeded-random";
export * from "./core/identifiers";
export * from "./core/demo-clock";

export * from "./data/dictionaries";

export * from "./generators/demo-dataset";

export * from "./scenario-registry";

// Repositories
export * from "./repositories/repository";
export * from "./repositories/demo-repositories";

// Asynchronous service adapters
export * from "./services/async-adapter";
export * from "./services/demo-hospital-service";

// Generic practice service boundary and mock implementation
export * from "./services/practice-service";
export * from "./services/in-memory-practice-service";
export * from "./services/practice-booking-engine";
export * from "./services/practice-booking-time";
export * from "./services/patient-document-workflow";
export * from "./services/practice-clinical-workflows";
export * from "./services/public-booking-service";

// Production-safe tenant bootstrap
export * from "./bootstrap/empty-tenant-bootstrap";

// Mock session and demo-only role switching
export * from "./session/practice-session";
export * from "./session/in-memory-practice-session";
export * from "./session/demo-role-switcher";
