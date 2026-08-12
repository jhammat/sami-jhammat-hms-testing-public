export const PHASE_ONE_PERMISSIONS = [
  "platform.tenants.read",
  "platform.tenants.manage",
  "platform.entitlements.manage",
  "platform.subscriptions.manage",
  "platform.support-access.manage",
  "platform.audit.read",

  "organization.profile.read",
  "organization.profile.manage",
  "organization.branches.read",
  "organization.branches.manage",
  "organization.users.read",
  "organization.users.manage",
  "organization.roles.read",
  "organization.roles.manage",
  "organization.services.read",
  "organization.services.manage",
  "organization.schedules.read",
  "organization.schedules.manage",
  "organization.audit.read",

  "patients.read",
  "patients.manage",
  "appointments.read",
  "appointments.manage",
  "queues.read",
  "queues.manage",

  "encounters.read",
  "encounters.manage",
  "encounters.sign",

  "laboratory.orders.read",
  "laboratory.orders.manage",
  "laboratory.results.manage",
  "laboratory.results.release",

  "radiology.orders.read",
  "radiology.orders.manage",
  "radiology.reports.manage",
  "radiology.reports.release",

  "pharmacy.catalogue.read",
  "pharmacy.catalogue.manage",
  "pharmacy.inventory.read",
  "pharmacy.inventory.manage",
  "pharmacy.dispensing.manage",

  "billing.invoices.read",
  "billing.invoices.manage",
  "billing.payments.manage",
  "billing.refunds.manage",

  "management.dashboard.read",
] as const;

export type PhaseOnePermissionCode =
  typeof PHASE_ONE_PERMISSIONS[number];
