export const serviceCategories = [
  { code: "CONSULTATION", codePrefix: "CON", label: "Consultation", portalLabel: "Doctor & Reception", portalPath: "/operations/reception" },
  { code: "LABORATORY", codePrefix: "LAB", label: "Laboratory & Pathology", portalLabel: "Laboratory", portalPath: "/operations/laboratory" },
  { code: "RADIOLOGY", codePrefix: "RAD", label: "Radiology & Imaging", portalLabel: "Radiology", portalPath: "/operations/radiology" },
  { code: "PHARMACY", codePrefix: "PHR", label: "Pharmacy & Medicines", portalLabel: "Pharmacy", portalPath: "/operations/pharmacy" },
  { code: "SURGERY", codePrefix: "SUR", label: "Surgery & Procedures", portalLabel: "Surgery", portalPath: "/operations/surgery" },
  { code: "INPATIENT", codePrefix: "IPD", label: "Inpatient & Ward Care", portalLabel: "Inpatient", portalPath: "/operations/inpatient/wards" },
  { code: "EMERGENCY", codePrefix: "EMR", label: "Emergency & Urgent Care", portalLabel: "Reception", portalPath: "/operations/reception" },
  { code: "NURSING", codePrefix: "NRS", label: "Nursing Services", portalLabel: "Nursing", portalPath: "/operations/inpatient/nursing" },
  { code: "BLOOD_BANK", codePrefix: "BLD", label: "Blood Bank & Transfusion", portalLabel: "Blood Bank", portalPath: "/operations/blood-bank" },
  { code: "PHYSIOTHERAPY", codePrefix: "PHY", label: "Physiotherapy & Rehabilitation", portalLabel: "Reception", portalPath: "/operations/reception" },
  { code: "DENTAL", codePrefix: "DEN", label: "Dental Services", portalLabel: "Doctor & Reception", portalPath: "/operations/reception" },
  { code: "MATERNITY", codePrefix: "MAT", label: "Maternity & Obstetrics", portalLabel: "Inpatient", portalPath: "/operations/inpatient/wards" },
  { code: "VACCINATION", codePrefix: "VAC", label: "Vaccination & Immunization", portalLabel: "Reception", portalPath: "/operations/reception" },
  { code: "HEALTH_PACKAGE", codePrefix: "HPK", label: "Health Check & Packages", portalLabel: "Reception", portalPath: "/operations/reception" },
  { code: "AMBULANCE", codePrefix: "AMB", label: "Ambulance & Transport", portalLabel: "Reception", portalPath: "/operations/reception" },
  { code: "OTHER", codePrefix: "SVC", label: "Other Hospital Service", portalLabel: "Reception", portalPath: "/operations/reception" },
] as const;

export type ServiceCategoryCode = (typeof serviceCategories)[number]["code"];

/**
 * Categories whose portal is deferred to Phase 2 (see `deferred/phase-two`).
 *
 * The categories stay selectable so existing service records keep resolving,
 * but their `portalPath` currently resolves to a 404 and must not be linked.
 */
const deferredPortalCategoryCodes = new Set<string>([
  "SURGERY",
  "INPATIENT",
  "NURSING",
  "BLOOD_BANK",
  "MATERNITY",
]);

export function hasLivePortal(code: string): boolean {
  return !deferredPortalCategoryCodes.has(code);
}

/**
 * Categories grouped by the team that performs the service, so a category
 * picker can show both what the service is and who handles it.
 */
export function groupServiceCategoriesByHandler<T extends { portalLabel: string }>(categories: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const category of categories) {
    const existing = groups.get(category.portalLabel);
    if (existing) existing.push(category);
    else groups.set(category.portalLabel, [category]);
  }
  return [...groups].map(([handler, grouped]) => ({ handler, categories: grouped }));
}

export function getServiceCategory(value: string) {
  const normalized = value.trim().toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_");
  return serviceCategories.find((category) => category.code === normalized || category.label.toUpperCase() === value.trim().toUpperCase());
}

export function isServiceCategoryCode(value: string): value is ServiceCategoryCode {
  return serviceCategories.some((category) => category.code === value);
}
