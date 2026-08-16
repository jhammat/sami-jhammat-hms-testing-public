import type { DemoPharmacyDispensingCase, DemoPharmacyStockItem } from "./dispensing";
import type { DemoPharmacyReturnCase } from "./returns";

/**
 * Compatibility cache for screens not yet wired to the live pharmacy API
 * (the printable dispensing receipt and patient medicine history — tracked
 * separately). Real dispensing/stock/return data is server-held; this
 * in-memory cache is not localStorage and is never primed, so it always
 * starts (and stays) empty until those screens are wired to a real
 * endpoint. It exists only so they keep compiling and degrade to "no
 * data" instead of reintroducing localStorage.
 */

const dispensingCases: DemoPharmacyDispensingCase[] = [];
const stock: DemoPharmacyStockItem[] = [];
const returnCases: DemoPharmacyReturnCase[] = [];

export function readDemoPharmacyDispensingCases(): DemoPharmacyDispensingCase[] {
  return dispensingCases;
}

export function readDemoPharmacyStock(): DemoPharmacyStockItem[] {
  return stock;
}

export function getDemoPharmacyReturnsForPatient(_patientId: string): DemoPharmacyReturnCase[] {
  return returnCases;
}

export function getDemoPharmacyCompletedReturnedQuantity(_sourceDispensingCaseId: string, _sourceDispensingLineId: string, _excludedReturnCaseId?: string): number {
  return 0;
}
