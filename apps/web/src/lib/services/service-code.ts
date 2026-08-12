import { getServiceCategory } from "./service-categories";

const fallbackPrefix = "SVC";
const generatedCodePattern = /^([A-Z]+)-(\d+)$/;

/** Code prefix reserved for a service category, e.g. `LABORATORY` -> `LAB`. */
export function serviceCodePrefix(category: string): string {
  return getServiceCategory(category)?.codePrefix ?? fallbackPrefix;
}

/**
 * Next free sequential code for a category, e.g. `LAB-003`.
 *
 * `existingCodes` may hold custom codes too; anything that is not a generated
 * `PREFIX-NUMBER` code for this category is ignored.
 */
export function nextServiceCode(category: string, existingCodes: Iterable<string>): string {
  return nextSequentialCode(serviceCodePrefix(category), existingCodes);
}

/** Next free `PREFIX-NNN` code for any record type that uses this scheme. */
export function nextSequentialCode(prefix: string, existingCodes: Iterable<string>): string {
  let highest = 0;
  for (const existing of existingCodes) {
    const match = generatedCodePattern.exec(existing.trim().toUpperCase());
    if (match && match[1] === prefix) highest = Math.max(highest, Number(match[2]));
  }
  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/** Normalises a code typed by an administrator into the stored format. */
export function normalizeServiceCode(value: string): string {
  return value.trim().toUpperCase().replaceAll(/[^A-Z0-9-]+/g, "-").replaceAll(/-{2,}/g, "-");
}
