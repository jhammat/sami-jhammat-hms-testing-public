"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  PackagePlus,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
} from "lucide-react";

import type {
  MockBranch,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
  wonflowConfirm,
} from "@/components/feedback";

import {
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  wonFlowInputClassName,
  wonFlowTextareaClassName,
} from "@/components/workflow";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  applyDemoPharmacyStockAdjustment,
  calculateDemoPharmacyPurchaseSubtotal,
  createDemoPharmacySupplier,
  createEmptyDemoPharmacyPurchaseReceiptLine,
  createInitialDemoPharmacyPurchaseReceipt,
  getDemoPharmacyExpiryInformation,
  initializeDemoPharmacyStock,
  initializeDemoPharmacySuppliers,
  postDemoPharmacyPurchaseReceipt,
  readDemoPharmacyPurchaseReceipts,
  readDemoPharmacyStock,
  readDemoPharmacyStockMovements,
  readDemoPharmacySuppliers,
  saveDemoPharmacyPurchaseReceiptDraft,
  toggleDemoPharmacySupplierStatus,
  validateDemoPharmacyPurchaseReceipt,
} from "@/lib/pharmacy";

import type {
  DemoPharmacyExpiryState,
  DemoPharmacyPurchaseReceipt,
  DemoPharmacyPurchaseReceiptLine,
  DemoPharmacyStockItem,
  DemoPharmacyStockMovement,
  DemoPharmacySupplier,
} from "@/lib/pharmacy";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

type InventoryView =
  | "inventory"
  | "receive"
  | "suppliers"
  | "movements";

type InventoryFilter =
  | "all"
  | "low-stock"
  | "expiring"
  | "expired"
  | "inactive";

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function humanizeValue(
  value: string,
): string {
  return value
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getExpiryClassName(
  state:
    DemoPharmacyExpiryState,
): string {
  switch (state) {
    case "safe":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "expiring":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "critical":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "expired":
      return "border-rose-200 bg-rose-50 text-rose-700";

    case "unknown":
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function clonePurchaseReceipt(
  receipt:
    DemoPharmacyPurchaseReceipt,
): DemoPharmacyPurchaseReceipt {
  return {
    ...receipt,

    lines:
      receipt.lines.map(
        (line) => ({
          ...line,
        }),
      ),
  };
}

interface PharmacyInventoryContentProps {
  branches:
    readonly MockBranch[];
}

function PharmacyInventoryContent({
  branches,
}: PharmacyInventoryContentProps) {
  const [
    view,
    setView,
  ] = useState<InventoryView>(
    "inventory",
  );

  const [
    stock,
    setStock,
  ] = useState<
    DemoPharmacyStockItem[]
  >([]);

  const [
    suppliers,
    setSuppliers,
  ] = useState<
    DemoPharmacySupplier[]
  >([]);

  const [
    receipts,
    setReceipts,
  ] = useState<
    DemoPharmacyPurchaseReceipt[]
  >([]);

  const [
    movements,
    setMovements,
  ] = useState<
    DemoPharmacyStockMovement[]
  >([]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    inventoryFilter,
    setInventoryFilter,
  ] = useState<InventoryFilter>(
    "all",
  );

  const [
    selectedStockItemId,
    setSelectedStockItemId,
  ] = useState("");

  const [
    purchaseDraft,
    setPurchaseDraft,
  ] = useState<
    DemoPharmacyPurchaseReceipt
  >(
    createInitialDemoPharmacyPurchaseReceipt,
  );

  const [
    purchaseErrors,
    setPurchaseErrors,
  ] = useState<string[]>([]);

  const [
    adjustmentQuantity,
    setAdjustmentQuantity,
  ] = useState(0);

  const [
    adjustmentStaff,
    setAdjustmentStaff,
  ] = useState("");

  const [
    adjustmentNote,
    setAdjustmentNote,
  ] = useState("");

  const [
    supplierName,
    setSupplierName,
  ] = useState("");

  const [
    supplierContactPerson,
    setSupplierContactPerson,
  ] = useState("");

  const [
    supplierPhoneNumber,
    setSupplierPhoneNumber,
  ] = useState("");

  const [
    supplierEmailAddress,
    setSupplierEmailAddress,
  ] = useState("");

  const [
    supplierAddress,
    setSupplierAddress,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadLocalData =
    useCallback(() => {
      initializeDemoPharmacyStock();
      initializeDemoPharmacySuppliers();

      setStock(
        readDemoPharmacyStock(),
      );

      setSuppliers(
        readDemoPharmacySuppliers(),
      );

      setReceipts(
        readDemoPharmacyPurchaseReceipts(),
      );

      setMovements(
        readDemoPharmacyStockMovements(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    const eventNames = [
      "wonflow:demo-pharmacy-stock-changed",
      "wonflow:demo-pharmacy-suppliers-changed",
      "wonflow:demo-pharmacy-purchase-receipts-changed",
      "wonflow:demo-pharmacy-stock-movements-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadLocalData,
        );
      },
    );

    return () => {
      eventNames.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadLocalData,
          );
        },
      );
    };
  }, [reloadLocalData]);

  const suppliersById =
    useMemo(
      () =>
        new Map(
          suppliers.map(
            (supplier) => [
              supplier.id,
              supplier,
            ],
          ),
        ),
      [suppliers],
    );

  const branchesById =
    useMemo(
      () =>
        new Map(
          branches.map(
            (branch) => [
              branch.id,
              branch,
            ],
          ),
        ),
      [branches],
    );

  const stockById =
    useMemo(
      () =>
        new Map(
          stock.map(
            (item) => [
              item.id,
              item,
            ],
          ),
        ),
      [stock],
    );

  const normalizedSearch =
    searchValue
      .trim()
      .toLocaleLowerCase();

  const visibleStock =
    useMemo(
      () =>
        stock
          .filter(
            (item) => {
              const expiry =
                getDemoPharmacyExpiryInformation(
                  item.expiryDate,
                );

              if (
                inventoryFilter ===
                  "low-stock" &&
                item.availableQuantity >
                  item.reorderLevel
              ) {
                return false;
              }

              if (
                inventoryFilter ===
                  "expiring" &&
                ![
                  "expiring",
                  "critical",
                ].includes(
                  expiry.state,
                )
              ) {
                return false;
              }

              if (
                inventoryFilter ===
                  "expired" &&
                expiry.state !==
                  "expired"
              ) {
                return false;
              }

              if (
                inventoryFilter ===
                  "inactive" &&
                item.active
              ) {
                return false;
              }

              if (
                normalizedSearch ===
                ""
              ) {
                return true;
              }

              return [
                item.genericName,
                item.brandName,
                item.strength,
                item.dosageForm,
                item.batchNumber,
              ]
                .join(" ")
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch,
                );
            },
          )
          .sort(
            (
              left,
              right,
            ) =>
              left.genericName.localeCompare(
                right.genericName,
              ),
          ),
      [
        inventoryFilter,
        normalizedSearch,
        stock,
      ],
    );

  const selectedStockItem =
    stock.find(
      (item) =>
        item.id ===
        selectedStockItemId,
    ) ??
    visibleStock[0];

  const statistics =
    useMemo(
      () => {
        const expiryStates =
          stock.map(
            (item) =>
              getDemoPharmacyExpiryInformation(
                item.expiryDate,
              ).state,
          );

        return {
          batches:
            stock.length,

          units:
            stock.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.availableQuantity,

              0,
            ),

          lowStock:
            stock.filter(
              (item) =>
                item.availableQuantity <=
                item.reorderLevel,
            ).length,

          expiring:
            expiryStates.filter(
              (state) =>
                state ===
                  "expiring" ||
                state ===
                  "critical",
            ).length,

          expired:
            expiryStates.filter(
              (state) =>
                state ===
                "expired",
            ).length,

          activeSuppliers:
            suppliers.filter(
              (supplier) =>
                supplier.status ===
                "active",
            ).length,
        };
      },
      [
        stock,
        suppliers,
      ],
    );

  function updatePurchaseDraft(
    changes:
      Partial<
        DemoPharmacyPurchaseReceipt
      >,
  ) {
    setPurchaseDraft(
      (currentDraft) => ({
        ...currentDraft,
        ...changes,
      }),
    );

    setPurchaseErrors([]);
  }

  function updatePurchaseLine(
    lineId: string,

    changes:
      Partial<
        DemoPharmacyPurchaseReceiptLine
      >,
  ) {
    setPurchaseDraft(
      (currentDraft) => ({
        ...currentDraft,

        lines:
          currentDraft.lines.map(
            (line) =>
              line.id === lineId
                ? {
                    ...line,
                    ...changes,
                  }
                : line,
          ),
      }),
    );

    setPurchaseErrors([]);
  }

  function populatePurchaseLineFromStockItem(
    lineId: string,
    stockItemId: string,
  ) {
    const stockItem =
      stockById.get(
        stockItemId,
      );

    if (
      stockItem === undefined
    ) {
      updatePurchaseLine(
        lineId,
        {
          existingStockItemId:
            "",
        },
      );

      return;
    }

    updatePurchaseLine(
      lineId,
      {
        existingStockItemId:
          stockItem.id,

        genericName:
          stockItem.genericName,

        brandName:
          stockItem.brandName,

        strength:
          stockItem.strength,

        dosageForm:
          stockItem.dosageForm,

        batchNumber:
          stockItem.batchNumber,

        expiryDate:
          stockItem.expiryDate,

        reorderLevel:
          stockItem.reorderLevel,

        sellingPrice:
          stockItem.unitPrice,
      },
    );
  }

  function savePurchaseDraft() {
    const savedReceipt =
      saveDemoPharmacyPurchaseReceiptDraft(
        purchaseDraft,
      );

    setPurchaseDraft(
      clonePurchaseReceipt(
        savedReceipt,
      ),
    );

    reloadLocalData();

    setActionMessage(
      "Purchase-receipt draft saved.",
    );
  }

  async function postPurchaseReceipt() {
    const errors =
      validateDemoPharmacyPurchaseReceipt(
        purchaseDraft,
        suppliers,
      );

    setPurchaseErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required purchase-receiving details.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Post purchase receipt",
        message: "Pharmacy stock quantities are increased for every received batch.",
        confirmLabel: "Post receipt",
        tone: "primary",
      });

    if (!confirmed) {
      return;
    }

    const posted =
      postDemoPharmacyPurchaseReceipt(
        purchaseDraft,
      );

    if (
      posted === undefined
    ) {
      setActionMessage(
        "The purchase receipt could not be posted.",
      );

      return;
    }

    reloadLocalData();

    setPurchaseDraft(
      createInitialDemoPharmacyPurchaseReceipt(),
    );

    setPurchaseErrors([]);

    setActionMessage(
      `${posted.receipt.receiptNumber} posted successfully. Pharmacy stock has been updated.`,
    );

    setView("inventory");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function addSupplier() {
    const supplier =
      createDemoPharmacySupplier({
        supplierName,

        contactPerson:
          supplierContactPerson,

        phoneNumber:
          supplierPhoneNumber,

        emailAddress:
          supplierEmailAddress,

        address:
          supplierAddress,
      });

    if (
      supplier === undefined
    ) {
      setActionMessage(
        "Enter a unique supplier name before saving.",
      );

      return;
    }

    setSupplierName("");
    setSupplierContactPerson("");
    setSupplierPhoneNumber("");
    setSupplierEmailAddress("");
    setSupplierAddress("");

    reloadLocalData();

    setActionMessage(
      `${supplier.supplierName} added successfully.`,
    );
  }

  function applyAdjustment(
    mode:
      | "increase"
      | "decrease"
      | "expiry",
  ) {
    if (
      selectedStockItem ===
      undefined
    ) {
      return;
    }

    const absoluteQuantity =
      Math.abs(
        adjustmentQuantity,
      );

    const quantityDelta =
      mode === "increase"
        ? absoluteQuantity
        : -absoluteQuantity;

    const result =
      applyDemoPharmacyStockAdjustment({
        stockItemId:
          selectedStockItem.id,

        quantityDelta:
          mode === "expiry"
            ? absoluteQuantity
            : quantityDelta,

        performedBy:
          adjustmentStaff,

        note:
          adjustmentNote,

        movementType:
          mode === "increase"
            ? "manual-increase"
            : mode === "decrease"
              ? "manual-decrease"
              : "expiry-write-off",
      });

    if (
      result === undefined
    ) {
      setActionMessage(
        "Enter a valid quantity, responsible staff member and adjustment reason. The resulting stock cannot be negative.",
      );

      return;
    }

    setAdjustmentQuantity(0);
    setAdjustmentStaff("");
    setAdjustmentNote("");

    reloadLocalData();

    setActionMessage(
      "Pharmacy stock adjustment recorded.",
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <Link
            className="wf-button-secondary"
            href="/operations/pharmacy"
          >
            Pharmacy Dispensing
          </Link>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label: "Pharmacy",
            href:
              "/operations/pharmacy",
          },
          {
            label:
              "Inventory Management",
          },
        ]}
        description="Manage medicine batches, suppliers, purchase receiving, stock levels and expiry alerts."
        eyebrow="Pharmacy Inventory"
        leading={
          <Boxes size={20} />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              Fictional stock data
            </span>

            <span>
              Browser-local inventory
            </span>
          </>
        }
        title="Pharmacy Inventory Management"
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {purchaseErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-rose-800">
            <AlertTriangle
              size={18}
            />

            Complete the purchase receipt
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {purchaseErrors.map(
              (error) => (
                <li key={error}>
                  • {error}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WonFlowKpiCard
          helperText="Medicine batches currently recorded"
          icon={
            <Boxes size={18} />
          }
          label="Stock Batches"
          tone="blue"
          value={
            statistics.batches
          }
        />

        <WonFlowKpiCard
          helperText="Total units across all batches"
          icon={
            <Store size={18} />
          }
          label="Available Units"
          tone="emerald"
          value={
            statistics.units
          }
        />

        <WonFlowKpiCard
          helperText="Batches at or below reorder level"
          icon={
            <AlertTriangle
              size={18}
            />
          }
          label="Low Stock"
          tone="amber"
          value={
            statistics.lowStock
          }
        />

        <WonFlowKpiCard
          helperText={`${statistics.expired} expired batch(es)`}
          icon={
            <AlertTriangle
              size={18}
            />
          }
          label="Expiring Soon"
          tone="rose"
          value={
            statistics.expiring
          }
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
        <WonFlowActionButton
          onClick={() => {
            setView("inventory");
          }}
          variant={
            view === "inventory"
              ? "primary"
              : "secondary"
          }
        >
          Inventory
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <PackagePlus
              size={16}
            />
          }
          onClick={() => {
            setView("receive");
          }}
          variant={
            view === "receive"
              ? "primary"
              : "secondary"
          }
        >
          Receive Stock
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <Truck size={16} />
          }
          onClick={() => {
            setView("suppliers");
          }}
          variant={
            view === "suppliers"
              ? "primary"
              : "secondary"
          }
        >
          Suppliers
        </WonFlowActionButton>

        <WonFlowActionButton
          icon={
            <ClipboardList
              size={16}
            />
          }
          onClick={() => {
            setView("movements");
          }}
          variant={
            view === "movements"
              ? "primary"
              : "secondary"
          }
        >
          Stock Movements
        </WonFlowActionButton>
      </div>

      {view === "inventory" ? (
        <div className="space-y-6">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />

                <input
                  className={[
                    wonFlowInputClassName,
                    "pl-10",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    setSearchValue(
                      event.target.value,
                    );
                  }}
                  placeholder="Search generic name, brand, strength or batch"
                  type="search"
                  value={searchValue}
                />
              </label>

              <select
                className={
                  wonFlowInputClassName
                }
                onChange={(
                  event,
                ) => {
                  setInventoryFilter(
                    event.target
                      .value as
                      InventoryFilter,
                  );
                }}
                value={
                  inventoryFilter
                }
              >
                <option value="all">
                  All Inventory
                </option>

                <option value="low-stock">
                  Low Stock
                </option>

                <option value="expiring">
                  Expiring Soon
                </option>

                <option value="expired">
                  Expired
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>
          </section>

          <div className="wf-workflow-split">
            <div className="wf-workflow-main">
              <WonFlowOperationalPanel
                description="Select a medicine batch to review or adjust its stock."
                status={
                  <span className="wf-status wf-status-blue">
                    {
                      visibleStock.length
                    }
                    {" batches"}
                  </span>
                }
                title="Medicine Batches"
                tone="blue"
              >
                {visibleStock.length ===
                0 ? (
                  <WonFlowEmptyState
                    description="No medicine batch matches the selected search and filters."
                    title="No inventory records"
                  />
                ) : (
                  <div className="wf-content-scroll">
                    <table className="w-full min-w-[1100px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">
                            Medicine
                          </th>

                          <th className="px-3 py-3">
                            Batch
                          </th>

                          <th className="px-3 py-3">
                            Expiry
                          </th>

                          <th className="px-3 py-3 text-right">
                            Available
                          </th>

                          <th className="px-3 py-3 text-right">
                            Reorder
                          </th>

                          <th className="px-3 py-3 text-right">
                            Price
                          </th>

                          <th className="px-3 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleStock.map(
                          (item) => {
                            const expiry =
                              getDemoPharmacyExpiryInformation(
                                item.expiryDate,
                              );

                            const selected =
                              selectedStockItem
                                ?.id ===
                              item.id;

                            return (
                              <tr
                                className={[
                                  "cursor-pointer border-b border-slate-100 last:border-0",
                                  selected
                                    ? "bg-blue-50"
                                    : "hover:bg-slate-50",
                                ].join(" ")}
                                key={item.id}
                                onClick={() => {
                                  setSelectedStockItemId(
                                    item.id,
                                  );
                                }}
                              >
                                <td className="px-3 py-3">
                                  <div className="font-black text-slate-950">
                                    {
                                      item.genericName
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {
                                      item.brandName
                                    }
                                    {" · "}
                                    {
                                      item.strength
                                    }
                                    {" · "}
                                    {
                                      item.dosageForm
                                    }
                                  </div>
                                </td>

                                <td className="px-3 py-3 font-mono text-xs font-bold">
                                  {
                                    item.batchNumber
                                  }
                                </td>

                                <td className="px-3 py-3">
                                  <div className="text-xs font-bold">
                                    {
                                      item.expiryDate
                                    }
                                  </div>

                                  <span
                                    className={[
                                      "mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-black",
                                      getExpiryClassName(
                                        expiry.state,
                                      ),
                                    ].join(" ")}
                                  >
                                    {humanizeValue(
                                      expiry.state,
                                    )}
                                  </span>
                                </td>

                                <td className="px-3 py-3 text-right text-sm font-black">
                                  {
                                    item.availableQuantity
                                  }
                                </td>

                                <td className="px-3 py-3 text-right text-sm font-bold text-slate-500">
                                  {
                                    item.reorderLevel
                                  }
                                </td>

                                <td className="px-3 py-3 text-right font-bold">
                                  {formatCurrency(
                                    item.unitPrice,
                                  )}
                                </td>

                                <td className="px-3 py-3">
                                  <span
                                    className={[
                                      "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                      item.active
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-slate-100 text-slate-600",
                                    ].join(" ")}
                                  >
                                    {item.active
                                      ? "Active"
                                      : "Inactive"}
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </div>

            <aside className="wf-workflow-aside">
              <WonFlowOperationalPanel
                description="Record corrections, damages, losses or expiry write-offs."
                title="Stock Adjustment"
                tone="amber"
              >
                {selectedStockItem ===
                undefined ? (
                  <WonFlowEmptyState
                    description="Select a medicine batch from the inventory table."
                    title="Select stock"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                      <div className="text-sm font-black text-blue-950">
                        {
                          selectedStockItem.genericName
                        }
                      </div>

                      <div className="mt-1 text-xs text-blue-700">
                        {
                          selectedStockItem.brandName
                        }
                        {" · "}
                        {
                          selectedStockItem.strength
                        }
                      </div>

                      <div className="mt-3 text-2xl font-black text-blue-950">
                        {
                          selectedStockItem.availableQuantity
                        }
                        {" units"}
                      </div>
                    </div>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Adjustment Quantity
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        min={0}
                        onChange={(
                          event,
                        ) => {
                          const value =
                            Number(
                              event.target.value,
                            );

                          setAdjustmentQuantity(
                            Number.isFinite(
                              value,
                            )
                              ? Math.max(
                                  0,
                                  value,
                                )
                              : 0,
                          );
                        }}
                        type="number"
                        value={
                          adjustmentQuantity
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Responsible Staff
                      </span>

                      <input
                        className={[
                          wonFlowInputClassName,
                          "mt-1.5",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setAdjustmentStaff(
                            event.target.value,
                          );
                        }}
                        placeholder="Staff member name"
                        value={
                          adjustmentStaff
                        }
                      />
                    </label>

                    <label>
                      <span className="text-xs font-bold text-slate-600">
                        Adjustment Reason
                      </span>

                      <textarea
                        className={[
                          wonFlowTextareaClassName,
                          "mt-1.5 min-h-24",
                        ].join(" ")}
                        onChange={(
                          event,
                        ) => {
                          setAdjustmentNote(
                            event.target.value,
                          );
                        }}
                        placeholder="Correction, damaged stock, loss or expiry reason"
                        value={
                          adjustmentNote
                        }
                      />
                    </label>

                    <div className="grid gap-2">
                      <WonFlowActionButton
                        onClick={() => {
                          applyAdjustment(
                            "increase",
                          );
                        }}
                        variant="primary"
                      >
                        Increase Stock
                      </WonFlowActionButton>

                      <WonFlowActionButton
                        onClick={() => {
                          applyAdjustment(
                            "decrease",
                          );
                        }}
                        variant="secondary"
                      >
                        Decrease Stock
                      </WonFlowActionButton>

                      <WonFlowActionButton
                        disabled={
                          getDemoPharmacyExpiryInformation(
                            selectedStockItem.expiryDate,
                          ).state !==
                          "expired"
                        }
                        onClick={() => {
                          applyAdjustment(
                            "expiry",
                          );
                        }}
                        variant="danger"
                      >
                        Write Off Expired Stock
                      </WonFlowActionButton>
                    </div>
                  </div>
                )}
              </WonFlowOperationalPanel>
            </aside>
          </div>
        </div>
      ) : null}

      {view === "receive" ? (
        <div className="space-y-6">
          <WonFlowOperationalPanel
            description="Record a supplier delivery and increase the available stock for each received batch."
            icon={
              <PackagePlus
                size={18}
              />
            }
            title="Receive Pharmacy Stock"
            tone="emerald"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="text-xs font-bold text-slate-600">
                  Receipt Number
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  disabled
                  value={
                    purchaseDraft.receiptNumber
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Supplier
                </span>

                <select
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updatePurchaseDraft({
                      supplierId:
                        event.target.value,
                    });
                  }}
                  value={
                    purchaseDraft.supplierId
                  }
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers
                    .filter(
                      (supplier) =>
                        supplier.status ===
                        "active",
                    )
                    .map(
                      (supplier) => (
                        <option
                          key={
                            supplier.id
                          }
                          value={
                            supplier.id
                          }
                        >
                          {
                            supplier.supplierName
                          }
                        </option>
                      ),
                    )}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Receiving Branch
                </span>

                <select
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updatePurchaseDraft({
                      branchId:
                        event.target.value,
                    });
                  }}
                  value={
                    purchaseDraft.branchId
                  }
                >
                  <option value="">
                    Select branch
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Supplier Invoice
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updatePurchaseDraft({
                      supplierInvoiceNumber:
                        event.target.value,
                    });
                  }}
                  placeholder="Supplier invoice number"
                  value={
                    purchaseDraft.supplierInvoiceNumber
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Received By
                </span>

                <input
                  className={[
                    wonFlowInputClassName,
                    "mt-1.5",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updatePurchaseDraft({
                      receivedBy:
                        event.target.value,
                    });
                  }}
                  placeholder="Receiving staff member"
                  value={
                    purchaseDraft.receivedBy
                  }
                />
              </label>

              <label className="md:col-span-2 xl:col-span-3">
                <span className="text-xs font-bold text-slate-600">
                  Delivery Notes
                </span>

                <textarea
                  className={[
                    wonFlowTextareaClassName,
                    "mt-1.5 min-h-20",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    updatePurchaseDraft({
                      notes:
                        event.target.value,
                    });
                  }}
                  placeholder="Delivery condition, discrepancies or receiving notes"
                  value={
                    purchaseDraft.notes
                  }
                />
              </label>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Each row represents one medicine batch received from the supplier."
            status={
              <span className="wf-status wf-status-blue">
                {
                  purchaseDraft.lines.length
                }
                {" batches"}
              </span>
            }
            title="Purchase Receipt Lines"
            tone="blue"
          >
            <div className="space-y-4">
              {purchaseDraft.lines.map(
                (
                  line,
                  index,
                ) => (
                  <article
                    className="rounded-[18px] border border-slate-200 bg-slate-50/60 p-4"
                    key={line.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black text-slate-900">
                        Batch Line
                        {" "}
                        {index + 1}
                      </h3>

                      <button
                        aria-label="Remove purchase line"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                        disabled={
                          purchaseDraft.lines.length ===
                          1
                        }
                        onClick={() => {
                          updatePurchaseDraft({
                            lines:
                              purchaseDraft.lines.filter(
                                (
                                  record,
                                ) =>
                                  record.id !==
                                  line.id,
                              ),
                          });
                        }}
                        type="button"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="md:col-span-2 xl:col-span-4">
                        <span className="text-xs font-bold text-slate-600">
                          Copy Existing Medicine Batch
                        </span>

                        <select
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            populatePurchaseLineFromStockItem(
                              line.id,
                              event.target.value,
                            );
                          }}
                          value={
                            line.existingStockItemId
                          }
                        >
                          <option value="">
                            Create a new stock batch
                          </option>

                          {stock.map(
                            (item) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                {
                                  item.genericName
                                }
                                {" — "}
                                {
                                  item.brandName
                                }
                                {" — "}
                                {
                                  item.strength
                                }
                                {" — Batch "}
                                {
                                  item.batchNumber
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <PurchaseTextField
                        label="Generic Name"
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              genericName:
                                value,
                            },
                          );
                        }}
                        value={
                          line.genericName
                        }
                      />

                      <PurchaseTextField
                        label="Brand Name"
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              brandName:
                                value,
                            },
                          );
                        }}
                        value={
                          line.brandName
                        }
                      />

                      <PurchaseTextField
                        label="Strength"
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              strength:
                                value,
                            },
                          );
                        }}
                        value={
                          line.strength
                        }
                      />

                      <PurchaseTextField
                        label="Dosage Form"
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              dosageForm:
                                value,
                            },
                          );
                        }}
                        value={
                          line.dosageForm
                        }
                      />

                      <PurchaseTextField
                        label="Batch Number"
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              batchNumber:
                                value,
                            },
                          );
                        }}
                        value={
                          line.batchNumber
                        }
                      />

                      <label>
                        <span className="text-xs font-bold text-slate-600">
                          Expiry Date
                        </span>

                        <input
                          className={[
                            wonFlowInputClassName,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            updatePurchaseLine(
                              line.id,
                              {
                                expiryDate:
                                  event.target.value,
                              },
                            );
                          }}
                          type="date"
                          value={
                            line.expiryDate
                          }
                        />
                      </label>

                      <PurchaseNumberField
                        label="Received Quantity"
                        minimum={1}
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              receivedQuantity:
                                value,
                            },
                          );
                        }}
                        value={
                          line.receivedQuantity
                        }
                      />

                      <PurchaseNumberField
                        label="Reorder Level"
                        minimum={0}
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              reorderLevel:
                                value,
                            },
                          );
                        }}
                        value={
                          line.reorderLevel
                        }
                      />

                      <PurchaseNumberField
                        label="Unit Purchase Cost"
                        minimum={0}
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              unitCost:
                                value,
                            },
                          );
                        }}
                        value={
                          line.unitCost
                        }
                      />

                      <PurchaseNumberField
                        label="Selling Price"
                        minimum={0}
                        onChange={(
                          value,
                        ) => {
                          updatePurchaseLine(
                            line.id,
                            {
                              sellingPrice:
                                value,
                            },
                          );
                        }}
                        value={
                          line.sellingPrice
                        }
                      />
                    </div>

                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">
                      Line total:
                      {" "}
                      {formatCurrency(
                        line.receivedQuantity *
                          line.unitCost,
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>

            <button
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700"
              onClick={() => {
                updatePurchaseDraft({
                  lines: [
                    ...purchaseDraft.lines,

                    createEmptyDemoPharmacyPurchaseReceiptLine(),
                  ],
                });
              }}
              type="button"
            >
              <Plus size={16} />
              Add Batch Line
            </button>

            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Purchase Subtotal
                </div>

                <div className="mt-1 text-2xl font-black text-emerald-950">
                  {formatCurrency(
                    calculateDemoPharmacyPurchaseSubtotal(
                      purchaseDraft,
                    ),
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <WonFlowActionButton
                  onClick={
                    savePurchaseDraft
                  }
                  variant="secondary"
                >
                  Save Draft
                </WonFlowActionButton>

                <WonFlowActionButton
                  onClick={
                    postPurchaseReceipt
                  }
                  variant="primary"
                >
                  Post and Receive Stock
                </WonFlowActionButton>
              </div>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description="Previously saved and posted pharmacy purchase receipts."
            title="Recent Purchase Receipts"
            tone="slate"
          >
            {receipts.length ===
            0 ? (
              <WonFlowEmptyState
                description="Purchase receipts will appear here after they are saved."
                title="No purchase receipts"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Receipt
                      </th>

                      <th className="px-3 py-3">
                        Supplier
                      </th>

                      <th className="px-3 py-3">
                        Branch
                      </th>

                      <th className="px-3 py-3">
                        Invoice
                      </th>

                      <th className="px-3 py-3 text-right">
                        Batches
                      </th>

                      <th className="px-3 py-3 text-right">
                        Total
                      </th>

                      <th className="px-3 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {receipts.map(
                      (receipt) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={receipt.id}
                        >
                          <td className="px-3 py-3">
                            <div className="font-black text-slate-900">
                              {
                                receipt.receiptNumber
                              }
                            </div>

                            <div className="mt-1 text-[11px] text-slate-500">
                              {formatWonFlowDashboardDateTime(
                                receipt.postedAt ||
                                  receipt.createdAt,
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            {suppliersById.get(
                              receipt.supplierId,
                            )?.supplierName ??
                              "Unknown supplier"}
                          </td>

                          <td className="px-3 py-3">
                            {branchesById.get(
                              receipt.branchId,
                            )?.name ??
                              "Unknown branch"}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs">
                            {
                              receipt.supplierInvoiceNumber
                            }
                          </td>

                          <td className="px-3 py-3 text-right font-bold">
                            {
                              receipt.lines.length
                            }
                          </td>

                          <td className="px-3 py-3 text-right font-black">
                            {formatCurrency(
                              receipt.subtotal,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <span className="wf-status wf-status-neutral">
                              {humanizeValue(
                                receipt.status,
                              )}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </WonFlowOperationalPanel>
        </div>
      ) : null}

      {view === "suppliers" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <WonFlowOperationalPanel
            description="Add a medicine or medical-supply vendor."
            icon={
              <Truck size={18} />
            }
            title="Add Supplier"
            tone="blue"
          >
            <div className="space-y-4">
              <SupplierField
                label="Supplier Name"
                onChange={
                  setSupplierName
                }
                value={
                  supplierName
                }
              />

              <SupplierField
                label="Contact Person"
                onChange={
                  setSupplierContactPerson
                }
                value={
                  supplierContactPerson
                }
              />

              <SupplierField
                label="Phone Number"
                onChange={
                  setSupplierPhoneNumber
                }
                value={
                  supplierPhoneNumber
                }
              />

              <SupplierField
                label="Email Address"
                onChange={
                  setSupplierEmailAddress
                }
                value={
                  supplierEmailAddress
                }
              />

              <label>
                <span className="text-xs font-bold text-slate-600">
                  Address
                </span>

                <textarea
                  className={[
                    wonFlowTextareaClassName,
                    "mt-1.5 min-h-24",
                  ].join(" ")}
                  onChange={(
                    event,
                  ) => {
                    setSupplierAddress(
                      event.target.value,
                    );
                  }}
                  value={
                    supplierAddress
                  }
                />
              </label>

              <WonFlowActionButton
                className="w-full"
                onClick={addSupplier}
                variant="primary"
              >
                Add Supplier
              </WonFlowActionButton>
            </div>
          </WonFlowOperationalPanel>

          <WonFlowOperationalPanel
            description={`${statistics.activeSuppliers} active supplier(s)`}
            title="Pharmacy Suppliers"
            tone="violet"
          >
            <div className="space-y-3">
              {suppliers.map(
                (supplier) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                    key={supplier.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-950">
                          {
                            supplier.supplierName
                          }
                        </div>

                        <div className="mt-1 text-xs font-bold text-violet-700">
                          {
                            supplier.supplierCode
                          }
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          <div>
                            {
                              supplier.contactPerson ||
                              "No contact person"
                            }
                          </div>

                          <div>
                            {
                              supplier.phoneNumber ||
                              "No phone number"
                            }
                          </div>

                          <div>
                            {
                              supplier.emailAddress ||
                              "No email address"
                            }
                          </div>

                          <div>
                            {
                              supplier.address ||
                              "No address"
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[10px] font-black",
                            supplier.status ===
                            "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {humanizeValue(
                            supplier.status,
                          )}
                        </span>

                        <WonFlowActionButton
                          onClick={() => {
                            toggleDemoPharmacySupplierStatus(
                              supplier.id,
                            );

                            reloadLocalData();
                          }}
                          variant="secondary"
                        >
                          {supplier.status ===
                          "active"
                            ? "Deactivate"
                            : "Activate"}
                        </WonFlowActionButton>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </WonFlowOperationalPanel>
        </div>
      ) : null}

      {view === "movements" ? (
        <WonFlowOperationalPanel
          description="Chronological history of purchase receipts, corrections and expiry write-offs."
          status={
            <span className="wf-status wf-status-blue">
              {
                movements.length
              }
              {" movements"}
            </span>
          }
          title="Pharmacy Stock Movement History"
          tone="slate"
        >
          {movements.length ===
          0 ? (
            <WonFlowEmptyState
              description="Stock movements will appear after receiving or adjusting inventory."
              title="No stock movements"
            />
          ) : (
            <div className="wf-content-scroll">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">
                      Date
                    </th>

                    <th className="px-3 py-3">
                      Medicine
                    </th>

                    <th className="px-3 py-3">
                      Movement
                    </th>

                    <th className="px-3 py-3 text-right">
                      Quantity
                    </th>

                    <th className="px-3 py-3 text-right">
                      Balance
                    </th>

                    <th className="px-3 py-3">
                      Performed By
                    </th>

                    <th className="px-3 py-3">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map(
                    (movement) => {
                      const item =
                        stockById.get(
                          movement.stockItemId,
                        );

                      return (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={movement.id}
                        >
                          <td className="px-3 py-3 text-xs">
                            {formatWonFlowDashboardDateTime(
                              movement.createdAt,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <div className="font-black text-slate-900">
                              {item?.genericName ??
                                "Unknown medicine"}
                            </div>

                            <div className="mt-1 text-[11px] text-slate-500">
                              {item?.batchNumber ??
                                "Unknown batch"}
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <span className="wf-status wf-status-neutral">
                              {humanizeValue(
                                movement.movementType,
                              )}
                            </span>
                          </td>

                          <td
                            className={[
                              "px-3 py-3 text-right font-black",
                              movement.quantityDelta >
                              0
                                ? "text-emerald-700"
                                : "text-rose-700",
                            ].join(" ")}
                          >
                            {movement.quantityDelta >
                            0
                              ? "+"
                              : ""}
                            {
                              movement.quantityDelta
                            }
                          </td>

                          <td className="px-3 py-3 text-right font-bold">
                            {
                              movement.balanceAfter
                            }
                          </td>

                          <td className="px-3 py-3">
                            {
                              movement.performedBy
                            }
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-500">
                            {
                              movement.note
                            }
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </WonFlowOperationalPanel>
      ) : null}
    </div>
  );
}

function PurchaseTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        value={value}
      />
    </label>
  );
}

function PurchaseNumberField({
  label,
  value,
  minimum,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;

  onChange:
    (value: number) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        min={minimum}
        onChange={(
          event,
        ) => {
          const parsedValue =
            Number(
              event.target.value,
            );

          onChange(
            Number.isFinite(
              parsedValue,
            )
              ? Math.max(
                  minimum,
                  parsedValue,
                )
              : minimum,
          );
        }}
        type="number"
        value={value}
      />
    </label>
  );
}

function SupplierField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;

  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        className={[
          wonFlowInputClassName,
          "mt-1.5",
        ].join(" ")}
        onChange={(
          event,
        ) => {
          onChange(
            event.target.value,
          );
        }}
        value={value}
      />
    </label>
  );
}

export function PharmacyInventoryManagement() {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "pharmacy-inventory:directories",

      loader:
        (
          signal,
        ) =>
          hospitalService.listBranches(
            signal,
          ),

      isEmpty:
        (branches) =>
          branches.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Pharmacy inventory unavailable"
      loadingDescription="WonFlow is preparing medicine batches, suppliers and stock movements."
      loadingTitle="Preparing pharmacy inventory"
      onRetry={
        directories.reload
      }
      state={directories}
    >
      {(branches) => (
        <PharmacyInventoryContent
          branches={branches}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}
