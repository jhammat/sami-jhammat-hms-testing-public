export const serviceCategories = [
  { code: "CONSULTATION", codePrefix: "CON", label: "Consultation", portalLabel: "Doctor & Reception", portalPath: "/operations/reception", requiredModule: null },
  { code: "LABORATORY", codePrefix: "LAB", label: "Laboratory & Pathology", portalLabel: "Laboratory", portalPath: "/operations/laboratory", requiredModule: "laboratory" },
  { code: "RADIOLOGY", codePrefix: "RAD", label: "Radiology & Imaging", portalLabel: "Radiology", portalPath: "/operations/radiology", requiredModule: "radiology" },
  { code: "PHARMACY", codePrefix: "PHR", label: "Pharmacy & Medicines", portalLabel: "Pharmacy", portalPath: "/operations/pharmacy", requiredModule: "pharmacy" },
  { code: "PHYSIOTHERAPY", codePrefix: "PHY", label: "Physiotherapy & Rehabilitation", portalLabel: "Physiotherapy", portalPath: "/operations/physiotherapy", requiredModule: "physiotherapy" },
  { code: "NUTRITION", codePrefix: "NUT", label: "Nutrition & Dietetics", portalLabel: "Nutrition & Dietetics", portalPath: "/operations/nutrition", requiredModule: "nutrition" },
  { code: "OTHER", codePrefix: "SVC", label: "General & Clinical Procedures", portalLabel: "Reception & Clinic", portalPath: "/operations/reception", requiredModule: null },
] as const;

export type ServiceCategoryCode = (typeof serviceCategories)[number]["code"];

export function hasLivePortal(code: string): boolean {
  return true;
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
  const found = serviceCategories.find((category) => category.code === normalized || category.label.toUpperCase() === value.trim().toUpperCase());
  if (found) return found;
  return {
    code: normalized,
    codePrefix: "SVC",
    label: value.trim(),
    portalLabel: "Reception & Clinic",
    portalPath: "/operations/reception",
    requiredModule: null,
  };
}

export function isServiceCategoryCode(value: string): boolean {
  return true;
}

export function isServiceCategoryEntitled(
  categoryCode: string,
  enabledModules?: Set<string> | readonly string[] | string[],
): boolean {
  if (!enabledModules) return true;
  const modulesSet = enabledModules instanceof Set ? enabledModules : new Set(enabledModules);
  const category = getServiceCategory(categoryCode);
  if (!category || !category.requiredModule) return true;
  return modulesSet.has(category.requiredModule);
}
