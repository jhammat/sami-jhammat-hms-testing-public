import { apiGet, apiPatch, apiPost } from "./client";
import { resourceTags } from "./cache";
import { useApiMutation } from "./use-api-mutation";
import { useApiResource } from "./use-api-resource";
import type { UseApiResourceResult } from "./use-api-resource";
import type { UseApiMutationResult } from "./use-api-mutation";

/**
 * Pharmacy data-access layer: inventory, batches, movements, suppliers,
 * purchase receipts, dispensing, and returns. Stock figures always come
 * fresh from the server on every load (no client cache holds a stale
 * count across renders) — a mutation only ever invalidates and refetches,
 * it never patches a local quantity by hand.
 */

export type ExpiryState = "expired" | "critical" | "expiring" | "safe" | null;

export interface InventoryItem {
  id: string;
  code: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  dosageForm: string | null;
  unit: string;
  reorderLevel: string;
  isActive: boolean;
  availableQuantity: number;
  isLowStock: boolean;
  nearestExpiry: string | null;
  nearestExpiryState: ExpiryState;
}

export interface BatchRecord {
  id: string;
  medicationId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  status: string;
  version: number;
  expiryState?: ExpiryState;
}

export interface InventoryItemDetail {
  medication: InventoryItem;
  batches: BatchRecord[];
  availableQuantity: number;
  isLowStock: boolean;
}

export interface StockMovementRecord {
  id: string;
  medicationId: string;
  inventoryBatchId: string | null;
  type: string;
  quantityDelta: string;
  unit: string;
  referenceType: string | null;
  referenceId: string | null;
  occurredAt: string;
  medication: { genericName: string; brandName: string | null; code: string };
}

export interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export interface PurchaseReceiptLineRecord {
  id: string;
  medicationId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  unitCostMinor: number;
}

export interface PurchaseReceiptRecord {
  id: string;
  supplierId: string;
  supplier: SupplierRecord;
  supplierInvoiceNumber: string;
  status: "DRAFT" | "POSTED";
  postedAt: string | null;
  createdAt: string;
  lines: PurchaseReceiptLineRecord[];
}

export interface DispenseItemRecord {
  id: string;
  medicationId: string;
  inventoryBatchId: string;
  quantity: string;
  unit: string;
  medication: { genericName: string; brandName: string | null };
}

export interface DispenseRecord {
  id: string;
  patientId: string;
  status: string;
  completedAt: string | null;
  patient: { id: string; givenName: string; familyName: string; patientNumber: string };
  items: DispenseItemRecord[];
}

export type PharmacyReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
export type ReturnDisposition = "RESTOCK" | "QUARANTINE" | "DESTROY";
export type PackageCondition = "SEALED" | "OPENED" | "DAMAGED" | "EXPIRED";

export interface PharmacyReturnLineRecord {
  id: string;
  dispenseItemId: string;
  medicationId: string;
  quantity: string;
  disposition: ReturnDisposition;
  packageCondition: PackageCondition;
}

export interface PharmacyReturnRecord {
  id: string;
  dispenseId: string;
  patientId: string;
  status: PharmacyReturnStatus;
  reason: string;
  requestedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  lines: PharmacyReturnLineRecord[];
}

const INVENTORY_TAG = "pharmacy-inventory";
const MOVEMENTS_TAG = "pharmacy-movements";
const SUPPLIERS_TAG = "pharmacy-suppliers";
const RECEIPTS_TAG = "pharmacy-purchase-receipts";
const DISPENSES_TAG = "pharmacy-dispenses";
const RETURNS_TAG = "pharmacy-returns";
const ALERTS_TAG = "pharmacy-stock-alerts";

const itemTag = (id: string) => resourceTags(INVENTORY_TAG, id)[1];

export function listInventory(query: { lowStockOnly?: boolean } = {}, signal?: AbortSignal): Promise<{ items: InventoryItem[] }> {
  const params = new URLSearchParams();
  if (query.lowStockOnly) params.set("lowStockOnly", "true");
  return apiGet<{ items: InventoryItem[] }>(`/api/v1/pharmacy/inventory${params.size ? `?${params}` : ""}`, { signal });
}

export function useInventory(query: { lowStockOnly?: boolean } = {}): UseApiResourceResult<{ items: InventoryItem[] }> {
  return useApiResource<{ items: InventoryItem[] }>({
    key: `pharmacy-inventory:${query.lowStockOnly ?? false}`,
    tags: [INVENTORY_TAG],
    fetcher: (signal) => listInventory(query, signal),
    isEmpty: (data) => data.items.length === 0,
  });
}

export interface CreateMedicationInput { code: string; genericName: string; brandName?: string; strength?: string; dosageForm?: string; unit: string; reorderLevel?: number }

export function createMedication(input: CreateMedicationInput): Promise<{ item: InventoryItem }> {
  return apiPost<{ item: InventoryItem }, CreateMedicationInput>("/api/v1/pharmacy/inventory", input);
}

export function useCreateMedication(): UseApiMutationResult<{ item: InventoryItem }, CreateMedicationInput> {
  return useApiMutation((input: CreateMedicationInput) => createMedication(input), { invalidates: [INVENTORY_TAG] });
}

export function getInventoryItem(itemId: string, signal?: AbortSignal): Promise<InventoryItemDetail> {
  return apiGet<InventoryItemDetail>(`/api/v1/pharmacy/inventory/${itemId}`, { signal });
}

export function useInventoryItem(itemId: string): UseApiResourceResult<InventoryItemDetail> {
  return useApiResource<InventoryItemDetail>({
    key: `pharmacy-inventory-item:${itemId}`,
    tags: [INVENTORY_TAG, itemTag(itemId), MOVEMENTS_TAG],
    fetcher: (signal) => getInventoryItem(itemId, signal),
    isEmpty: () => false,
  });
}

export interface UpdateInventoryItemInput { reorderLevel?: number; isActive?: boolean; reason?: string }

export function updateInventoryItem(itemId: string, input: UpdateInventoryItemInput): Promise<{ item: InventoryItem }> {
  return apiPatch<{ item: InventoryItem }, UpdateInventoryItemInput>(`/api/v1/pharmacy/inventory/${itemId}`, input);
}

export function useUpdateInventoryItem(itemId: string): UseApiMutationResult<{ item: InventoryItem }, UpdateInventoryItemInput> {
  return useApiMutation((input: UpdateInventoryItemInput) => updateInventoryItem(itemId, input), { invalidates: [INVENTORY_TAG, itemTag(itemId)] });
}

export interface CreateBatchInput { medicationId: string; batchNumber: string; expiryDate: string; quantity: number; unitCostMinor?: number; reason?: string }

export function createBatch(input: CreateBatchInput): Promise<{ batch: BatchRecord }> {
  return apiPost<{ batch: BatchRecord }, CreateBatchInput>("/api/v1/pharmacy/inventory/batches", input);
}

export function useCreateBatch(): UseApiMutationResult<{ batch: BatchRecord }, CreateBatchInput> {
  return useApiMutation((input: CreateBatchInput) => createBatch(input), {
    invalidates: (vars) => [INVENTORY_TAG, itemTag(vars.medicationId), MOVEMENTS_TAG],
  });
}

export function listMovements(query: { medicationId?: string } = {}, signal?: AbortSignal): Promise<{ movements: StockMovementRecord[] }> {
  const params = new URLSearchParams();
  if (query.medicationId) params.set("medicationId", query.medicationId);
  return apiGet<{ movements: StockMovementRecord[] }>(`/api/v1/pharmacy/inventory/movements${params.size ? `?${params}` : ""}`, { signal });
}

export function useMovements(query: { medicationId?: string } = {}): UseApiResourceResult<{ movements: StockMovementRecord[] }> {
  return useApiResource<{ movements: StockMovementRecord[] }>({
    key: `pharmacy-movements:${query.medicationId ?? ""}`,
    tags: [MOVEMENTS_TAG],
    fetcher: (signal) => listMovements(query, signal),
    isEmpty: (data) => data.movements.length === 0,
  });
}

export function listSuppliers(signal?: AbortSignal): Promise<{ suppliers: SupplierRecord[] }> {
  return apiGet<{ suppliers: SupplierRecord[] }>("/api/v1/pharmacy/suppliers", { signal });
}

export function useSuppliers(): UseApiResourceResult<{ suppliers: SupplierRecord[] }> {
  return useApiResource<{ suppliers: SupplierRecord[] }>({ key: "pharmacy-suppliers", tags: [SUPPLIERS_TAG], fetcher: (signal) => listSuppliers(signal), isEmpty: (data) => data.suppliers.length === 0 });
}

export interface CreateSupplierInput { code: string; name: string; contactPerson?: string; phone?: string; email?: string; address?: string }

export function createSupplier(input: CreateSupplierInput): Promise<{ supplier: SupplierRecord }> {
  return apiPost<{ supplier: SupplierRecord }, CreateSupplierInput>("/api/v1/pharmacy/suppliers", input);
}

export function useCreateSupplier(): UseApiMutationResult<{ supplier: SupplierRecord }, CreateSupplierInput> {
  return useApiMutation((input: CreateSupplierInput) => createSupplier(input), { invalidates: [SUPPLIERS_TAG] });
}

export function listPurchaseReceipts(signal?: AbortSignal): Promise<{ receipts: PurchaseReceiptRecord[] }> {
  return apiGet<{ receipts: PurchaseReceiptRecord[] }>("/api/v1/pharmacy/purchase-receipts", { signal });
}

export function usePurchaseReceipts(): UseApiResourceResult<{ receipts: PurchaseReceiptRecord[] }> {
  return useApiResource<{ receipts: PurchaseReceiptRecord[] }>({ key: "pharmacy-purchase-receipts", tags: [RECEIPTS_TAG], fetcher: (signal) => listPurchaseReceipts(signal), isEmpty: (data) => data.receipts.length === 0 });
}

export interface CreatePurchaseReceiptInput {
  supplierId: string;
  supplierInvoiceNumber: string;
  lines: { medicationId: string; batchNumber: string; expiryDate: string; quantity: number; unitCostMinor: number }[];
}

export function createPurchaseReceipt(input: CreatePurchaseReceiptInput): Promise<{ receipt: PurchaseReceiptRecord }> {
  return apiPost<{ receipt: PurchaseReceiptRecord }, CreatePurchaseReceiptInput>("/api/v1/pharmacy/purchase-receipts", input);
}

export function useCreatePurchaseReceipt(): UseApiMutationResult<{ receipt: PurchaseReceiptRecord }, CreatePurchaseReceiptInput> {
  return useApiMutation((input: CreatePurchaseReceiptInput) => createPurchaseReceipt(input), { invalidates: [RECEIPTS_TAG, INVENTORY_TAG, MOVEMENTS_TAG] });
}

export function listDispenses(query: { patientId?: string } = {}, signal?: AbortSignal): Promise<{ dispenses: DispenseRecord[] }> {
  const params = new URLSearchParams();
  if (query.patientId) params.set("patientId", query.patientId);
  return apiGet<{ dispenses: DispenseRecord[] }>(`/api/v1/pharmacy/dispenses${params.size ? `?${params}` : ""}`, { signal });
}

export function useDispenses(query: { patientId?: string } = {}): UseApiResourceResult<{ dispenses: DispenseRecord[] }> {
  return useApiResource<{ dispenses: DispenseRecord[] }>({
    key: `pharmacy-dispenses:${query.patientId ?? ""}`,
    tags: [DISPENSES_TAG],
    fetcher: (signal) => listDispenses(query, signal),
    isEmpty: (data) => data.dispenses.length === 0,
  });
}

export interface DispensePrescriptionInput {
  prescriptionId: string;
  notes?: string;
  complete: boolean;
  items: { prescriptionItemId: string; inventoryBatchId: string; quantity: string }[];
}

export function dispensePrescription(input: DispensePrescriptionInput): Promise<{ dispense: DispenseRecord }> {
  return apiPost<{ dispense: DispenseRecord }, DispensePrescriptionInput>("/api/v1/pharmacy/dispenses", input);
}

export function useDispensePrescription(): UseApiMutationResult<{ dispense: DispenseRecord }, DispensePrescriptionInput> {
  return useApiMutation((input: DispensePrescriptionInput) => dispensePrescription(input), {
    invalidates: [DISPENSES_TAG, INVENTORY_TAG, MOVEMENTS_TAG, "pharmacy-prescriptions"],
  });
}

export interface PrescriptionQueueRecord {
  id: string;
  status: string;
  patient: { id: string; givenName: string; familyName: string; patientNumber: string };
  doctor: { staffProfile: { membership: { displayName: string } } } | null;
  items: { id: string; medicationId: string; dose: string; frequency: string; quantity: string | null; medication: { genericName: string; brandName: string | null }; dispenseItems: { quantity: string }[] }[];
}

export function listPrescriptionQueue(signal?: AbortSignal): Promise<{ prescriptions: PrescriptionQueueRecord[] }> {
  return apiGet<{ prescriptions: PrescriptionQueueRecord[] }>("/api/v1/pharmacy/prescriptions", { signal });
}

export function usePrescriptionQueue(): UseApiResourceResult<{ prescriptions: PrescriptionQueueRecord[] }> {
  return useApiResource<{ prescriptions: PrescriptionQueueRecord[] }>({
    key: "pharmacy-prescriptions",
    tags: ["pharmacy-prescriptions", DISPENSES_TAG],
    fetcher: (signal) => listPrescriptionQueue(signal),
    isEmpty: (data) => data.prescriptions.length === 0,
  });
}

export function listReturns(query: { status?: string; dispenseId?: string } = {}, signal?: AbortSignal): Promise<{ returns: PharmacyReturnRecord[] }> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.dispenseId) params.set("dispenseId", query.dispenseId);
  return apiGet<{ returns: PharmacyReturnRecord[] }>(`/api/v1/pharmacy/returns${params.size ? `?${params}` : ""}`, { signal });
}

export function useReturns(query: { status?: string; dispenseId?: string } = {}): UseApiResourceResult<{ returns: PharmacyReturnRecord[] }> {
  return useApiResource<{ returns: PharmacyReturnRecord[] }>({
    key: `pharmacy-returns:${query.status ?? ""}:${query.dispenseId ?? ""}`,
    tags: [RETURNS_TAG],
    fetcher: (signal) => listReturns(query, signal),
    isEmpty: (data) => data.returns.length === 0,
  });
}

export interface CreateReturnInput {
  dispenseId: string;
  reason: string;
  lines: { dispenseItemId: string; quantity: number; disposition: ReturnDisposition; packageCondition: PackageCondition }[];
}

export function createReturn(input: CreateReturnInput): Promise<{ return: PharmacyReturnRecord }> {
  return apiPost<{ return: PharmacyReturnRecord }, CreateReturnInput>("/api/v1/pharmacy/returns", input);
}

export function useCreateReturn(): UseApiMutationResult<{ return: PharmacyReturnRecord }, CreateReturnInput> {
  return useApiMutation((input: CreateReturnInput) => createReturn(input), { invalidates: [RETURNS_TAG] });
}

export function updateReturn(returnId: string, input: { action: "approve" | "reject" | "complete"; reason: string }): Promise<{ return: PharmacyReturnRecord }> {
  return apiPatch<{ return: PharmacyReturnRecord }, { action: "approve" | "reject" | "complete"; reason: string }>(`/api/v1/pharmacy/returns/${returnId}`, input);
}

export function useUpdateReturn(): UseApiMutationResult<{ return: PharmacyReturnRecord }, { returnId: string; action: "approve" | "reject" | "complete"; reason: string }> {
  return useApiMutation(({ returnId, action, reason }) => updateReturn(returnId, { action, reason }), {
    invalidates: [RETURNS_TAG, INVENTORY_TAG, MOVEMENTS_TAG],
  });
}

export interface StockAlerts {
  lowStock: { medication: InventoryItem; availableQuantity: number; reorderLevel: number }[];
  expiring: { batch: BatchRecord & { medication: { genericName: string; brandName: string | null; code: string } }; state: ExpiryState }[];
}

export function getStockAlerts(signal?: AbortSignal): Promise<StockAlerts> {
  return apiGet<StockAlerts>("/api/v1/pharmacy/stock-alerts", { signal });
}

export function useStockAlerts(): UseApiResourceResult<StockAlerts> {
  return useApiResource<StockAlerts>({ key: "pharmacy-stock-alerts", tags: [ALERTS_TAG, INVENTORY_TAG], fetcher: (signal) => getStockAlerts(signal), isEmpty: (data) => data.lowStock.length === 0 && data.expiring.length === 0 });
}

export interface PosSaleInput {
  patientId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    medicationId: string;
    inventoryBatchId: string;
    quantity: number;
    unitPricePkr: number;
    instructions?: string;
  }>;
  paymentMethod?: "CASH" | "CARD" | "ONLINE" | "UNPAID";
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

export interface PosSaleReceipt {
  dispenseId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  patientId: string;
  dispensedAt: string;
  paymentMethod: string;
  isPaid: boolean;
  subtotalPkr: number;
  discountPercent: number;
  discountPkr: number;
  taxPercent: number;
  taxPkr: number;
  netTotalPkr: number;
  items: Array<{
    medicationId: string;
    inventoryBatchId: string;
    batchNumber: string;
    medicationName: string;
    strength: string | null;
    unit: string;
    quantity: number;
    unitPricePkr: number;
    lineTotalPkr: number;
    instructions: string | null;
  }>;
  notes: string | null;
}

export function executePosSale(input: PosSaleInput): Promise<{ receipt: PosSaleReceipt }> {
  return apiPost<{ receipt: PosSaleReceipt }, PosSaleInput>("/api/v1/pharmacy/pos-sale", input);
}

export function usePosSale(): UseApiMutationResult<{ receipt: PosSaleReceipt }, PosSaleInput> {
  return useApiMutation((input: PosSaleInput) => executePosSale(input), {
    invalidates: [INVENTORY_TAG, DISPENSES_TAG, MOVEMENTS_TAG, "pharmacy-prescriptions"],
  });
}
