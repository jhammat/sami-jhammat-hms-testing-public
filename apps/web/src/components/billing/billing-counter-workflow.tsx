"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MockBranch,
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
} from "@/components/feedback";

import {
  WonFlowActionBar,
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  BILLING_SERVICE_CATALOG,
  calculateBillingLineTotal,
  calculateBillingTotals,
  createBillingLineItem,
  createCustomBillingLineItem,
  createDemoBillingInvoice,
  formatMinorUnitsForInput,
  parsePkrInputToMinorUnits,
  persistDemoBillingInvoice,
} from "@/lib/billing";

import type {
  BillingDiscountMode,
  BillingLineItem,
  BillingPaymentMethod,
  BillingServiceCategory,
  DemoBillingInvoice,
} from "@/lib/billing";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardMoney,
} from "@/lib/dashboard";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3.5",
  "text-sm text-slate-900",
  "outline-none transition",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

const CATEGORIES:
  readonly {
    value:
      "all" |
      BillingServiceCategory;

    label: string;
  }[] = [
    {
      value: "all",
      label: "All Services",
    },
    {
      value: "consultation",
      label: "Consultation",
    },
    {
      value: "emergency",
      label: "Emergency",
    },
    {
      value: "laboratory",
      label: "Laboratory",
    },
    {
      value: "radiology",
      label: "Radiology",
    },
    {
      value: "procedure",
      label: "Procedure",
    },
    {
      value: "inpatient",
      label: "Inpatient",
    },
  ];

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

function BillingStatusBadge({
  status,
}: {
  status:
    DemoBillingInvoice["totals"]["paymentStatus"];
}) {
  const className = {
    paid:
      "bg-emerald-50 text-emerald-700 ring-emerald-100",

    "partially-paid":
      "bg-blue-50 text-blue-700 ring-blue-100",

    unpaid:
      "bg-rose-50 text-rose-700 ring-rose-100",
  }[status];

  return (
    <span
      className={[
        "inline-flex rounded-full",
        "px-3 py-1",
        "text-xs font-bold",
        "ring-1",
        className,
      ].join(" ")}
    >
      {humanizeValue(
        status,
      )}
    </span>
  );
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function printInvoice(
  invoice:
    DemoBillingInvoice,

  patient:
    DemoPatientRegistrationResult,

  branchName: string,

  practitionerName: string,
): void {
  const printWindow =
    window.open(
      "",
      "_blank",
      "width=900,height=760",
    );

  if (printWindow === null) {
    return;
  }

  const itemRows =
    invoice.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.serviceCode)}</td>
            <td>${escapeHtml(item.serviceName)}</td>
            <td style="text-align:right">${item.quantity}</td>
            <td style="text-align:right">${formatWonFlowDashboardMoney(
              item.unitPriceMinorUnits,
              "PKR",
            )}</td>
            <td style="text-align:right">${formatWonFlowDashboardMoney(
              calculateBillingLineTotal(
                item,
              ),
              "PKR",
            )}</td>
          </tr>
        `,
      )
      .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(invoice.invoiceNumber)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 32px;
            color: #172033;
          }

          h1, h2, p {
            margin: 0;
          }

          .header {
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }

          .meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
            margin: 20px 0;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }

          th, td {
            border-bottom: 1px solid #dbe2ea;
            padding: 10px 8px;
            text-align: left;
            font-size: 12px;
          }

          th {
            background: #f4f6fb;
          }

          .totals {
            margin-left: auto;
            margin-top: 22px;
            width: 340px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 0;
          }

          .payable {
            border-top: 2px solid #4f46e5;
            margin-top: 6px;
            padding-top: 12px;
            font-size: 17px;
            font-weight: bold;
          }

          .footer {
            margin-top: 34px;
            font-size: 11px;
            color: #667085;
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>WonFlow Hospital Invoice</h1>
          <p>${escapeHtml(branchName)}</p>
        </div>

        <div class="meta">
          <div><strong>Invoice:</strong> ${escapeHtml(invoice.invoiceNumber)}</div>
          <div><strong>Date:</strong> ${escapeHtml(
            new Date(
              invoice.issuedAt,
            ).toLocaleString(
              "en-PK",
            ),
          )}</div>

          <div><strong>Patient:</strong> ${escapeHtml(patient.displayName)}</div>
          <div><strong>MR Number:</strong> ${escapeHtml(patient.mrNumber)}</div>

          <div><strong>CNIC/B-Form:</strong> ${escapeHtml(patient.draft.cnicNumber)}</div>
          <div><strong>Doctor:</strong> ${escapeHtml(practitionerName)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Service</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Unit Price</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>

          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Gross</span>
            <strong>${formatWonFlowDashboardMoney(
              invoice.totals.grossMinorUnits,
              "PKR",
            )}</strong>
          </div>

          <div class="total-row">
            <span>Discount</span>
            <strong>${formatWonFlowDashboardMoney(
              invoice.totals.itemDiscountMinorUnits +
                invoice.totals.invoiceDiscountMinorUnits,
              "PKR",
            )}</strong>
          </div>

          <div class="total-row">
            <span>Insurance/Corporate</span>
            <strong>${formatWonFlowDashboardMoney(
              invoice.totals.insuranceContributionMinorUnits,
              "PKR",
            )}</strong>
          </div>

          <div class="total-row payable">
            <span>Patient Payable</span>
            <span>${formatWonFlowDashboardMoney(
              invoice.totals.patientPayableMinorUnits,
              "PKR",
            )}</span>
          </div>

          <div class="total-row">
            <span>Paid</span>
            <strong>${formatWonFlowDashboardMoney(
              invoice.totals.paidMinorUnits,
              "PKR",
            )}</strong>
          </div>

          <div class="total-row">
            <span>Balance</span>
            <strong>${formatWonFlowDashboardMoney(
              invoice.totals.balanceMinorUnits,
              "PKR",
            )}</strong>
          </div>
        </div>

        <div class="footer">
          This invoice was generated using fictional WonFlow demonstration data.
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

interface BillingCounterWorkflowProps {
  initialPatientId?: string;
}

export function BillingCounterWorkflow({
  initialPatientId,
}: BillingCounterWorkflowProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const [
    registrations,
    setRegistrations,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    selectedPatientId,
    setSelectedPatientId,
  ] = useState(
    initialPatientId ?? "",
  );

  const [
    selectedBranchId,
    setSelectedBranchId,
  ] = useState("");

  const [
    practitionerId,
    setPractitionerId,
  ] = useState("");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState<
    "all" |
    BillingServiceCategory
  >("all");

  const [
    lineItems,
    setLineItems,
  ] = useState<
    BillingLineItem[]
  >([]);

  const [
    customServiceName,
    setCustomServiceName,
  ] = useState("");

  const [
    customServicePrice,
    setCustomServicePrice,
  ] = useState("");

  const [
    discountMode,
    setDiscountMode,
  ] = useState<
    BillingDiscountMode
  >("none");

  const [
    discountValue,
    setDiscountValue,
  ] = useState("");

  const [
    insuranceContribution,
    setInsuranceContribution,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<
    BillingPaymentMethod
  >("unpaid");

  const [
    paidAmount,
    setPaidAmount,
  ] = useState("");

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string |
    undefined
  >();

  const [
    savedInvoice,
    setSavedInvoice,
  ] = useState<
    DemoBillingInvoice |
    undefined
  >();

  useEffect(() => {
    const reloadPatients = () => {
      setRegistrations(
        readDemoPatientRegistrations(),
      );
    };

    queueMicrotask(
      reloadPatients,
    );

    window.addEventListener(
      "wonflow:demo-patients-changed",
      reloadPatients,
    );

    window.addEventListener(
      "storage",
      reloadPatients,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-patients-changed",
        reloadPatients,
      );

      window.removeEventListener(
        "storage",
        reloadPatients,
      );
    };
  }, []);

  const directories =
    useWonFlowAsyncData({
      key:
        "billing-counter:directories",

      loader:
        async (
          signal,
        ) => {
          const [
            branches,
            practitioners,
          ] = await Promise.all([
            hospitalService
              .listBranches(
                signal,
              ),

            hospitalService
              .listPractitioners(
                {
                  limit: 100,
                },
                signal,
              ),
          ]);

          return {
            branches,

            practitioners:
              practitioners.items,
          };
        },

      isEmpty:
        (directory) =>
          directory
            .branches
            .length === 0,
    });

  const requestedPatientId =
    selectedPatientId ||
    initialPatientId;

  const selectedPatient =
    registrations.find(
      (registration) =>
        registration.id ===
        requestedPatientId,
    ) ??
    registrations[0];

  const activePatientId =
    selectedPatient?.id ?? "";

  const activeBranchId =
    selectedBranchId ||
    selectedPatient
      ?.draft
      .branchId ||
    directories.data
      ?.branches[0]
      ?.id ||
    "";

  const filteredServices =
    useMemo(() => {
      const normalizedSearch =
        searchText
          .trim()
          .toLocaleLowerCase();

      return BILLING_SERVICE_CATALOG.filter(
        (service) =>
          (
            category === "all" ||
            service.category ===
              category
          ) &&
          (
            normalizedSearch === "" ||
            [
              service.code,
              service.name,
              service.category,
            ].some(
              (value) =>
                value
                  .toLocaleLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
            )
          ),
      );
    }, [
      category,
      searchText,
    ]);

  const totals =
    useMemo(
      () =>
        calculateBillingTotals({
          items:
            lineItems,

          discountMode,

          discountValue:
            discountMode ===
            "percentage"
              ? Number(
                  discountValue,
                ) || 0
              : parsePkrInputToMinorUnits(
                  discountValue,
                ),

          insuranceContributionMinorUnits:
            parsePkrInputToMinorUnits(
              insuranceContribution,
            ),

          paidMinorUnits:
            paymentMethod ===
            "unpaid"
              ? 0
              : parsePkrInputToMinorUnits(
                  paidAmount,
                ),
        }),
      [
        discountMode,
        discountValue,
        insuranceContribution,
        lineItems,
        paidAmount,
        paymentMethod,
      ],
    );

  function addService(
    serviceId: string,
  ) {
    const service =
      BILLING_SERVICE_CATALOG.find(
        (record) =>
          record.id ===
          serviceId,
      );

    if (service === undefined) {
      return;
    }

    setLineItems(
      (currentItems) => {
        const existingItem =
          currentItems.find(
            (item) =>
              item.serviceId ===
              service.id,
          );

        if (
          existingItem ===
          undefined
        ) {
          return [
            ...currentItems,
            createBillingLineItem(
              service,
            ),
          ];
        }

        return currentItems.map(
          (item) =>
            item.id ===
            existingItem.id
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    1,
                }
              : item,
        );
      },
    );

    setErrorMessage(
      undefined,
    );
  }

  function addCustomService() {
    const priceMinorUnits =
      parsePkrInputToMinorUnits(
        customServicePrice,
      );

    if (
      customServiceName
        .trim()
        .length < 2 ||
      priceMinorUnits <= 0
    ) {
      setErrorMessage(
        "Enter a custom service name and a valid price.",
      );

      return;
    }

    setLineItems(
      (currentItems) => [
        ...currentItems,

        createCustomBillingLineItem(
          customServiceName,
          priceMinorUnits,
        ),
      ],
    );

    setCustomServiceName("");
    setCustomServicePrice("");
    setErrorMessage(
      undefined,
    );
  }

  function updateLineItem(
    lineItemId: string,
    updates:
      Partial<
        BillingLineItem
      >,
  ) {
    setLineItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id ===
            lineItemId
              ? {
                  ...item,
                  ...updates,
                }
              : item,
        ),
    );
  }

  function removeLineItem(
    lineItemId: string,
  ) {
    setLineItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            item.id !==
            lineItemId,
        ),
    );
  }

  function saveInvoice(
    printAfterSave: boolean,
    branches:
      readonly MockBranch[],
    practitioners:
      readonly MockPractitioner[],
  ) {
    if (
      selectedPatient ===
      undefined
    ) {
      setErrorMessage(
        "Select or register a patient before creating a bill.",
      );

      return;
    }

    if (activeBranchId === "") {
      setErrorMessage(
        "Select the billing branch.",
      );

      return;
    }

    if (
      lineItems.length === 0
    ) {
      setErrorMessage(
        "Add at least one hospital service.",
      );

      return;
    }

    if (
      paymentMethod !==
        "unpaid" &&
      totals.paidMinorUnits <= 0
    ) {
      setErrorMessage(
        "Enter the amount received or select Unpaid.",
      );

      return;
    }

    const invoice =
      createDemoBillingInvoice({
        patientId:
          selectedPatient.id,

        branchId:
          activeBranchId,

        practitionerId:
          practitionerId ||
          undefined,

        paymentMethod,

        notes,

        items:
          lineItems,

        totals,
      });

    persistDemoBillingInvoice(
      invoice,
    );

    setSavedInvoice(invoice);
    setErrorMessage(
      undefined,
    );

    const branchName =
      branches.find(
        (branch) =>
          branch.id ===
          activeBranchId,
      )?.name ??
      "Hospital Branch";

    const practitionerName =
      practitioners.find(
        (practitioner) =>
          practitioner.id ===
          practitionerId,
      )?.displayName ??
      "Not assigned";

    if (printAfterSave) {
      printInvoice(
        invoice,
        selectedPatient,
        branchName,
        practitionerName,
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetInvoice() {
    setLineItems([]);
    setDiscountMode("none");
    setDiscountValue("");
    setInsuranceContribution("");
    setPaymentMethod("unpaid");
    setPaidAmount("");
    setNotes("");
    setErrorMessage(
      undefined,
    );
    setSavedInvoice(
      undefined,
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href="/operations/billing/refunds"
            >
              Refunds and Credit Notes
            </Link>
            <Link
              className="wf-button-secondary"
              href="/operations/insurance"
            >
              Insurance Claims
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Hospital Operations",
            href: "/operations",
          },
          {
            label: "Billing",
          },
          {
            label:
              "New Invoice",
          },
        ]}
        description="Select a patient, add hospital services, calculate charges, receive payment and print the invoice."
        eyebrow="Billing and Cash Counter"
        metadata={
          <>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 ring-1 ring-emerald-100">
              Service-driven billing
            </span>

            <span>
              Fictional local invoices
            </span>
          </>
        }
        title="Create Patient Bill"
      />

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration mode:
        </strong>
        {" "}
        Invoices and payments are fictional and stored only in this browser.
      </div>

      <WonFlowAsyncDataBoundary
        emptyDescription="No hospital branches are available for billing."
        emptyTitle="Billing unavailable"
        loadingDescription="WonFlow is preparing branch and practitioner directories."
        loadingTitle="Preparing billing counter"
        onRetry={
          directories.reload
        }
        state={directories}
      >
        {(directory) => {
          if (
            registrations.length ===
            0
          ) {
            return (
              <WonFlowOperationalPanel
                description="At least one locally registered demonstration patient is required."
                title="No Registered Patients"
                tone="amber"
              >
                <WonFlowEmptyState
                  description="Register a patient first, then continue directly to billing."
                  title="Patient registration required"
                />

                <Link
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                  href="/operations/patients/register"
                >
                  Register Patient
                </Link>
              </WonFlowOperationalPanel>
            );
          }

          if (
            savedInvoice !==
              undefined &&
            selectedPatient !==
              undefined
          ) {
            const branchName =
              directory.branches.find(
                (branch) =>
                  branch.id ===
                  savedInvoice.branchId,
              )?.name ??
              "Hospital Branch";

            const practitionerName =
              directory.practitioners.find(
                (practitioner) =>
                  practitioner.id ===
                  savedInvoice
                    .practitionerId,
              )?.displayName ??
              "Not assigned";

            return (
              <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">
                    Invoice Saved
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    {
                      savedInvoice
                        .invoiceNumber
                    }
                  </h2>

                  <p className="mt-2 text-sm text-emerald-50">
                    The patient bill has been calculated and stored locally.
                  </p>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SummaryItem
                        label="Patient"
                        value={
                          selectedPatient
                            .displayName
                        }
                      />

                      <SummaryItem
                        label="MR Number"
                        value={
                          selectedPatient
                            .mrNumber
                        }
                      />

                      <SummaryItem
                        label="Branch"
                        value={
                          branchName
                        }
                      />

                      <SummaryItem
                        label="Doctor"
                        value={
                          practitionerName
                        }
                      />

                      <SummaryItem
                        label="Issued"
                        value={formatWonFlowDashboardDateTime(
                          savedInvoice
                            .issuedAt,
                        )}
                      />

                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Status
                        </div>

                        <div className="mt-2">
                          <BillingStatusBadge
                            status={
                              savedInvoice
                                .totals
                                .paymentStatus
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                      <TotalRow
                        label="Patient Payable"
                        value={
                          savedInvoice
                            .totals
                            .patientPayableMinorUnits
                        }
                      />

                      <TotalRow
                        label="Paid"
                        value={
                          savedInvoice
                            .totals
                            .paidMinorUnits
                        }
                      />

                      <TotalRow
                        important
                        label="Remaining Balance"
                        value={
                          savedInvoice
                            .totals
                            .balanceMinorUnits
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="text-sm font-black text-slate-900">
                      Invoice actions
                    </div>

                    <div className="mt-4 space-y-2">
                      <button
                        className="flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                        onClick={() => {
                          printInvoice(
                            savedInvoice,
                            selectedPatient,
                            branchName,
                            practitionerName,
                          );
                        }}
                        type="button"
                      >
                        Print Bill
                      </button>

                      <button
                        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={
                          resetInvoice
                        }
                        type="button"
                      >
                        Create Another Bill
                      </button>

                      <Link
                        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        href={`/operations/patients/${encodeURIComponent(
                          savedInvoice.patientId,
                        )}/billing`}
                      >
                        View Patient Billing Ledger
                      </Link>

                      <Link
                        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        href="/operations"
                      >
                        Return to Operations
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          return (
            <>
              <WonFlowActionBar
                description="Select patient, branch and optional practitioner before adding services."
                filters={
                  <div className="grid w-full gap-3 md:grid-cols-3">
                    <select
                      aria-label="Select patient"
                      className={
                        INPUT_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        const patientId =
                          event.target
                            .value;

                        const patient =
                          registrations.find(
                            (
                              registration,
                            ) =>
                              registration.id ===
                              patientId,
                          );

                        setSelectedPatientId(
                          patientId,
                        );

                        setSelectedBranchId(
                          patient
                            ?.draft
                            .branchId ??
                            "",
                        );
                      }}
                      value={
                        activePatientId
                      }
                    >
                      {registrations.map(
                        (
                          registration,
                        ) => (
                          <option
                            key={
                              registration.id
                            }
                            value={
                              registration.id
                            }
                          >
                            {
                              registration
                                .displayName
                            }
                            {" — "}
                            {
                              registration
                                .mrNumber
                            }
                          </option>
                        ),
                      )}
                    </select>

                    <select
                      aria-label="Select billing branch"
                      className={
                        INPUT_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        setSelectedBranchId(
                          event.target
                            .value,
                        );
                      }}
                      value={
                        activeBranchId
                      }
                    >
                      {directory.branches.map(
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

                    <select
                      aria-label="Select practitioner"
                      className={
                        INPUT_CLASS_NAME
                      }
                      onChange={(
                        event,
                      ) => {
                        setPractitionerId(
                          event.target
                            .value,
                        );
                      }}
                      value={
                        practitionerId
                      }
                    >
                      <option value="">
                        No doctor assigned
                      </option>

                      {directory
                        .practitioners
                        .map(
                          (
                            practitioner,
                          ) => (
                            <option
                              key={
                                practitioner.id
                              }
                              value={
                                practitioner.id
                              }
                            >
                              {
                                practitioner
                                  .displayName
                              }
                              {" — "}
                              {
                                practitioner
                                  .specialtyName
                              }
                            </option>
                          ),
                        )}
                    </select>
                  </div>
                }
                summary={
                  selectedPatient ===
                  undefined
                    ? "No patient selected"
                    : `${selectedPatient.displayName} · ${selectedPatient.mrNumber}`
                }
                title="Billing Counter Context"
              />

              {errorMessage !==
              undefined ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="wf-workflow-split">
                <div className="wf-workflow-main grid gap-6 lg:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.25fr)]">
                  <WonFlowOperationalPanel
                  description="Search the hospital service catalogue and add billable services."
                  title="Service Catalogue"
                  tone="blue"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    onChange={(
                      event,
                    ) => {
                      setSearchText(
                        event.target
                          .value,
                      );
                    }}
                    placeholder="Search service or code"
                    type="search"
                    value={
                      searchText
                    }
                  />

                  <select
                    className={[
                      INPUT_CLASS_NAME,
                      "mt-3",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setCategory(
                        event.target
                          .value as
                          "all" |
                          BillingServiceCategory,
                      );
                    }}
                    value={category}
                  >
                    {CATEGORIES.map(
                      (record) => (
                        <option
                          key={
                            record.value
                          }
                          value={
                            record.value
                          }
                        >
                          {record.label}
                        </option>
                      ),
                    )}
                  </select>

                  <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                    {filteredServices.map(
                      (service) => (
                        <button
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                          key={service.id}
                          onClick={() => {
                            addService(
                              service.id,
                            );
                          }}
                          type="button"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-900">
                              {
                                service.name
                              }
                            </span>

                            <span className="mt-1 block text-xs text-slate-500">
                              {
                                service.code
                              }
                              {" · "}
                              {humanizeValue(
                                service.category,
                              )}
                            </span>
                          </span>

                          <span className="shrink-0 text-sm font-black text-blue-700">
                            {formatWonFlowDashboardMoney(
                              service
                                .unitPriceMinorUnits,
                              "PKR",
                            )}
                          </span>
                        </button>
                      ),
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
                    <div className="text-sm font-black text-violet-900">
                      Add Custom Service
                    </div>

                    <input
                      className={[
                        INPUT_CLASS_NAME,
                        "mt-3",
                      ].join(" ")}
                      onChange={(
                        event,
                      ) => {
                        setCustomServiceName(
                          event.target
                            .value,
                        );
                      }}
                      placeholder="Custom service name"
                      value={
                        customServiceName
                      }
                    />

                    <input
                      className={[
                        INPUT_CLASS_NAME,
                        "mt-3",
                      ].join(" ")}
                      inputMode="decimal"
                      min="0"
                      onChange={(
                        event,
                      ) => {
                        setCustomServicePrice(
                          event.target
                            .value,
                        );
                      }}
                      placeholder="Price in PKR"
                      type="number"
                      value={
                        customServicePrice
                      }
                    />

                    <button
                      className="mt-3 min-h-10 w-full rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
                      onClick={
                        addCustomService
                      }
                      type="button"
                    >
                      Add Custom Service
                    </button>
                  </div>
                  </WonFlowOperationalPanel>

                <WonFlowOperationalPanel
                  description="Review quantities, unit prices and item-level discounts."
                  title="Invoice Services"
                  tone="violet"
                >
                  {lineItems.length ===
                  0 ? (
                    <WonFlowEmptyState
                      description="Select services from the catalogue to begin the invoice."
                      title="No services added"
                    />
                  ) : (
                    <div className="wf-content-scroll">
                      <table className="w-full min-w-[760px] text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                            <th className="pb-3">
                              Service
                            </th>

                            <th className="pb-3">
                              Qty
                            </th>

                            <th className="pb-3">
                              Unit Price
                            </th>

                            <th className="pb-3">
                              Discount
                            </th>

                            <th className="pb-3 text-right">
                              Total
                            </th>

                            <th />
                          </tr>
                        </thead>

                        <tbody>
                          {lineItems.map(
                            (item) => (
                              <tr
                                className="border-b border-slate-100"
                                key={
                                  item.id
                                }
                              >
                                <td className="py-4 pr-3">
                                  <div className="text-sm font-bold text-slate-900">
                                    {
                                      item.serviceName
                                    }
                                  </div>

                                  <div className="mt-1 text-xs text-slate-500">
                                    {
                                      item.serviceCode
                                    }
                                  </div>
                                </td>

                                <td className="py-4 pr-3">
                                  <input
                                    className="h-10 w-20 rounded-xl border border-slate-200 px-3 text-sm"
                                    min="1"
                                    onChange={(
                                      event,
                                    ) => {
                                      updateLineItem(
                                        item.id,
                                        {
                                          quantity:
                                            Math.max(
                                              1,
                                              Number(
                                                event
                                                  .target
                                                  .value,
                                              ) ||
                                                1,
                                            ),
                                        },
                                      );
                                    }}
                                    type="number"
                                    value={
                                      item.quantity
                                    }
                                  />
                                </td>

                                <td className="py-4 pr-3">
                                  <input
                                    className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm"
                                    min="0"
                                    onChange={(
                                      event,
                                    ) => {
                                      updateLineItem(
                                        item.id,
                                        {
                                          unitPriceMinorUnits:
                                            parsePkrInputToMinorUnits(
                                              event
                                                .target
                                                .value,
                                            ),
                                        },
                                      );
                                    }}
                                    type="number"
                                    value={formatMinorUnitsForInput(
                                      item.unitPriceMinorUnits,
                                    )}
                                  />
                                </td>

                                <td className="py-4 pr-3">
                                  <input
                                    className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-sm"
                                    min="0"
                                    onChange={(
                                      event,
                                    ) => {
                                      updateLineItem(
                                        item.id,
                                        {
                                          discountMinorUnits:
                                            parsePkrInputToMinorUnits(
                                              event
                                                .target
                                                .value,
                                            ),
                                        },
                                      );
                                    }}
                                    type="number"
                                    value={formatMinorUnitsForInput(
                                      item.discountMinorUnits,
                                    )}
                                  />
                                </td>

                                <td className="py-4 text-right text-sm font-black text-indigo-700">
                                  {formatWonFlowDashboardMoney(
                                    calculateBillingLineTotal(
                                      item,
                                    ),
                                    "PKR",
                                  )}
                                </td>

                                <td className="py-4 pl-3 text-right">
                                  <button
                                    className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                    onClick={() => {
                                      removeLineItem(
                                        item.id,
                                      );
                                    }}
                                    type="button"
                                  >
                                    Remove
                                  </button>
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

                <aside className="wf-workflow-aside">
                  <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-white">
                      <div className="text-xs font-bold uppercase tracking-[0.15em] text-blue-100">
                        Invoice Summary
                      </div>

                      <div className="mt-2 text-xl font-black">
                        {selectedPatient
                          ?.displayName ??
                          "No patient"}
                      </div>

                      <div className="mt-1 text-xs text-indigo-100">
                        {selectedPatient
                          ?.mrNumber ??
                          "Select patient"}
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          Invoice Discount
                        </span>

                        <select
                          className={[
                            INPUT_CLASS_NAME,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            setDiscountMode(
                              event.target
                                .value as
                                BillingDiscountMode,
                            );

                            setDiscountValue(
                              "",
                            );
                          }}
                          value={
                            discountMode
                          }
                        >
                          <option value="none">
                            No Discount
                          </option>

                          <option value="percentage">
                            Percentage
                          </option>

                          <option value="fixed">
                            Fixed PKR
                          </option>
                        </select>
                      </label>

                      {discountMode !==
                      "none" ? (
                        <input
                          className={
                            INPUT_CLASS_NAME
                          }
                          max={
                            discountMode ===
                            "percentage"
                              ? 100
                              : undefined
                          }
                          min="0"
                          onChange={(
                            event,
                          ) => {
                            setDiscountValue(
                              event.target
                                .value,
                            );
                          }}
                          placeholder={
                            discountMode ===
                            "percentage"
                              ? "Discount percentage"
                              : "Discount amount in PKR"
                          }
                          type="number"
                          value={
                            discountValue
                          }
                        />
                      ) : null}

                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          Insurance / Corporate Contribution
                        </span>

                        <input
                          className={[
                            INPUT_CLASS_NAME,
                            "mt-1.5",
                          ].join(" ")}
                          min="0"
                          onChange={(
                            event,
                          ) => {
                            setInsuranceContribution(
                              event.target
                                .value,
                            );
                          }}
                          placeholder="Amount in PKR"
                          type="number"
                          value={
                            insuranceContribution
                          }
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          Payment Method
                        </span>

                        <select
                          className={[
                            INPUT_CLASS_NAME,
                            "mt-1.5",
                          ].join(" ")}
                          onChange={(
                            event,
                          ) => {
                            const method =
                              event.target
                                .value as
                                BillingPaymentMethod;

                            setPaymentMethod(
                              method,
                            );

                            if (
                              method ===
                              "unpaid"
                            ) {
                              setPaidAmount(
                                "",
                              );
                            }
                          }}
                          value={
                            paymentMethod
                          }
                        >
                          <option value="unpaid">
                            Save Without Payment
                          </option>

                          <option value="cash">
                            Cash
                          </option>

                          <option value="card">
                            Card
                          </option>

                          <option value="bank-transfer">
                            Bank Transfer
                          </option>

                          <option value="mixed">
                            Mixed Payment
                          </option>
                        </select>
                      </label>

                      {paymentMethod !==
                      "unpaid" ? (
                        <label className="block">
                          <span className="text-xs font-bold text-slate-500">
                            Amount Received
                          </span>

                          <input
                            className={[
                              INPUT_CLASS_NAME,
                              "mt-1.5",
                            ].join(" ")}
                            min="0"
                            onChange={(
                              event,
                            ) => {
                              setPaidAmount(
                                event.target
                                  .value,
                              );
                            }}
                            placeholder="Amount in PKR"
                            type="number"
                            value={
                              paidAmount
                            }
                          />
                        </label>
                      ) : null}

                      <label className="block">
                        <span className="text-xs font-bold text-slate-500">
                          Billing Notes
                        </span>

                        <textarea
                          className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          onChange={(
                            event,
                          ) => {
                            setNotes(
                              event.target
                                .value,
                            );
                          }}
                          placeholder="Optional cashier notes"
                          value={notes}
                        />
                      </label>

                      <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <TotalRow
                          label="Gross"
                          value={
                            totals.grossMinorUnits
                          }
                        />

                        <TotalRow
                          label="Total Discount"
                          value={
                            totals.itemDiscountMinorUnits +
                            totals.invoiceDiscountMinorUnits
                          }
                        />

                        <TotalRow
                          label="Insurance / Corporate"
                          value={
                            totals.insuranceContributionMinorUnits
                          }
                        />

                        <TotalRow
                          important
                          label="Patient Payable"
                          value={
                            totals.patientPayableMinorUnits
                          }
                        />

                        <TotalRow
                          label="Paid"
                          value={
                            totals.paidMinorUnits
                          }
                        />

                        <TotalRow
                          important
                          label="Balance"
                          value={
                            totals.balanceMinorUnits
                          }
                        />
                      </div>

                      <div className="flex justify-end">
                        <BillingStatusBadge
                          status={
                            totals.paymentStatus
                          }
                        />
                      </div>

                      <WonFlowActionButton
                        className="w-full"
                        onClick={() => {
                          saveInvoice(
                            false,
                            directory.branches,
                            directory.practitioners,
                          );
                        }}
                        variant="primary"
                      >
                        Save Invoice
                      </WonFlowActionButton>

                      <button
                        className="min-h-11 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                        onClick={() => {
                          saveInvoice(
                            true,
                            directory.branches,
                            directory.practitioners,
                          );
                        }}
                        type="button"
                      >
                        Save and Print Bill
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          );
        }}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  important = false,
}: {
  label: string;
  value: number;
  important?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center",
        "justify-between gap-4",
        important
          ? "border-t border-slate-200 pt-3 text-slate-950"
          : "text-slate-600",
      ].join(" ")}
    >
      <span
        className={
          important
            ? "text-sm font-black"
            : "text-xs font-bold"
        }
      >
        {label}
      </span>

      <span
        className={
          important
            ? "text-base font-black"
            : "text-sm font-bold"
        }
      >
        {formatWonFlowDashboardMoney(
          value,
          "PKR",
        )}
      </span>
    </div>
  );
}
