"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeDollarSign,
  Banknote,
  CreditCard,
  FileText,
  ReceiptText,
  WalletCards,
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
  WonFlowErrorState,
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
  buildDemoPatientBillingAccount,
  createDemoBillingAccountPayment,
  humanizePaymentMethod,
  readDemoBillingAccountPayments,
  validateDemoBillingAccountPayment,
} from "@/lib/billing";

import type {
  DemoBillingAccountPayment,
  DemoBillingLedgerEntry,
  DemoBillingPaymentMethod,
  DemoPatientBillingAccountSummary,
} from "@/lib/billing";

import {
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  formatWonFlowDashboardDateTime,
} from "@/lib/dashboard";

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

function getEntryClassName(
  entry:
    DemoBillingLedgerEntry,
): string {
  switch (entry.entryType) {
    case "invoice":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "invoice-payment":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "account-payment":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "credit-note":
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

interface PatientBillingLedgerContentProps {
  patientId: string;

  branches:
    readonly MockBranch[];
}

function PatientBillingLedgerContent({
  patientId,
  branches,
}: PatientBillingLedgerContentProps) {
  const [
    patient,
    setPatient,
  ] = useState<
    DemoPatientRegistrationResult |
    undefined
  >();

  const [
    account,
    setAccount,
  ] = useState<
    DemoPatientBillingAccountSummary
  >(
    () =>
      buildDemoPatientBillingAccount(
        patientId,
      ),
  );

  const [
    accountPayments,
    setAccountPayments,
  ] = useState<
    DemoBillingAccountPayment[]
  >([]);

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    encounterId,
    setEncounterId,
  ] = useState("");

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<
    DemoBillingPaymentMethod
  >("cash");

  const [
    receivedBy,
    setReceivedBy,
  ] = useState("");

  const [
    transactionReference,
    setTransactionReference,
  ] = useState("");

  const [
    paymentNote,
    setPaymentNote,
  ] = useState("");

  const [
    validationErrors,
    setValidationErrors,
  ] = useState<string[]>([]);

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const reloadAccount =
    useCallback(() => {
      setPatient(
        readDemoPatientRegistrations()
          .find(
            (record) =>
              record.id ===
              patientId,
          ),
      );

      setAccount(
        buildDemoPatientBillingAccount(
          patientId,
        ),
      );

      setAccountPayments(
        readDemoBillingAccountPayments()
          .filter(
            (payment) =>
              payment.patientId ===
              patientId,
          )
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          ),
      );
    }, [patientId]);

  useEffect(() => {
    queueMicrotask(
      reloadAccount,
    );

    const eventNames = [
      "wonflow:demo-billing-invoices-changed",
      "wonflow:demo-billing-refunds-changed",
      "wonflow:demo-billing-account-payments-changed",
      "storage",
    ];

    eventNames.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          reloadAccount,
        );
      },
    );

    return () => {
      eventNames.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            reloadAccount,
          );
        },
      );
    };
  }, [reloadAccount]);

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

  if (
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The requested patient record could not be found."
        title="Patient not found"
      />
    );
  }

  async function recordPayment() {
    const numericAmount =
      Number(paymentAmount);

    const input = {
      patientId,

      branchId,

      encounterId,

      amount:
        numericAmount,

      paymentMethod,

      receivedBy,

      transactionReference,

      paymentNote,
    };

    const errors =
      validateDemoBillingAccountPayment(
        input,
      );

    setValidationErrors(
      errors,
    );

    if (
      errors.length > 0
    ) {
      setActionMessage(
        "Complete the required payment details.",
      );

      return;
    }

    const confirmed =
      await wonflowConfirm({
        title: "Record payment",
        message: `${formatCurrency(numericAmount)} is recorded against this patient's ledger.`,
        confirmLabel: "Record payment",
        tone: "primary",
      });

    if (!confirmed) {
      return;
    }

    const payment =
      createDemoBillingAccountPayment(
        input,
      );

    if (
      payment === undefined
    ) {
      setActionMessage(
        "The payment could not be recorded. Check the balance and transaction reference.",
      );

      return;
    }

    setPaymentAmount("");
    setEncounterId("");
    setReceivedBy("");
    setTransactionReference("");
    setPaymentNote("");
    setValidationErrors([]);

    reloadAccount();

    setActionMessage(
      `${payment.paymentNumber} recorded successfully.`,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="wf-button-secondary"
              href={`/operations/patients/${encodeURIComponent(
                patient.id,
              )}/billing/statement`}
            >
              Print Account Statement
            </Link>

            <Link
              className="wf-button-secondary"
              href={`/operations/billing/new?patientId=${encodeURIComponent(
                patient.id,
              )}`}
            >
              Create Invoice
            </Link>

            <Link
              className="wf-button-secondary"
              href="/operations/patients"
            >
              Patient Directory
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
            label:
              "Patient Directory",
            href:
              "/operations/patients",
          },
          {
            label:
              "Billing Ledger",
          },
        ]}
        description="Review invoices, payments, refunds, credit notes and the patient’s current account balance."
        eyebrow="Patient Financial Record"
        leading={
          <WalletCards
            size={20}
          />
        }
        metadata={
          <>
            <span className="wf-status wf-status-blue">
              {patient.mrNumber}
            </span>

            <span>
              {
                patient.draft
                  .cnicNumber
              }
            </span>
          </>
        }
        title={`${patient.displayName} — Billing Ledger`}
      />

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      {validationErrors.length >
      0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-black text-rose-800">
            Complete the payment
          </div>

          <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700">
            {validationErrors.map(
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
          helperText={`${account.invoiceCount} invoice(s)`}
          icon={
            <ReceiptText
              size={18}
            />
          }
          label="Total Billed"
          tone="blue"
          value={formatCurrency(
            account.totalBilled,
          )}
        />

        <WonFlowKpiCard
          helperText={`${account.paymentCount} recorded payment(s)`}
          icon={
            <Banknote size={18} />
          }
          label="Total Paid"
          tone="emerald"
          value={formatCurrency(
            account.totalInvoicePayments +
              account.totalAccountPayments,
          )}
        />

        <WonFlowKpiCard
          helperText={`${account.creditNoteCount} credit note(s)`}
          icon={
            <FileText size={18} />
          }
          label="Refunds and Credits"
          tone="violet"
          value={formatCurrency(
            account.totalCreditNotes,
          )}
        />

        <WonFlowKpiCard
          helperText={
            account.accountCredit >
            0
              ? `${formatCurrency(
                  account.accountCredit,
                )} account credit`
              : "Current patient liability"
          }
          icon={
            <BadgeDollarSign
              size={18}
            />
          }
          label="Outstanding"
          tone={
            account.outstandingBalance >
            0
              ? "amber"
              : "emerald"
          }
          value={formatCurrency(
            account.outstandingBalance,
          )}
        />
      </div>

      <div className="wf-workflow-split">
        <div className="wf-workflow-main">
          <WonFlowOperationalPanel
            description="Charges increase the balance. Payments and credit notes reduce the balance."
            status={
              <span className="wf-status wf-status-blue">
                {
                  account.entries.length
                }
                {" entries"}
              </span>
            }
            title="Patient Account Ledger"
            tone="blue"
          >
            {account.entries.length ===
            0 ? (
              <WonFlowEmptyState
                description="Invoices, payments and credit notes will appear here."
                title="No financial activity"
              />
            ) : (
              <div className="wf-content-scroll">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Date
                      </th>

                      <th className="px-3 py-3">
                        Reference
                      </th>

                      <th className="px-3 py-3">
                        Entry
                      </th>

                      <th className="px-3 py-3">
                        Description
                      </th>

                      <th className="px-3 py-3 text-right">
                        Debit
                      </th>

                      <th className="px-3 py-3 text-right">
                        Credit
                      </th>

                      <th className="px-3 py-3 text-right">
                        Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {account.entries.map(
                      (entry) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={entry.id}
                        >
                          <td className="px-3 py-3 text-xs">
                            {formatWonFlowDashboardDateTime(
                              entry.occurredAt,
                            )}
                          </td>

                          <td className="px-3 py-3 font-mono text-xs font-bold">
                            {
                              entry.referenceNumber
                            }
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={[
                                "rounded-full border px-2.5 py-1 text-[10px] font-black",
                                getEntryClassName(
                                  entry,
                                ),
                              ].join(" ")}
                            >
                              {humanizeValue(
                                entry.entryType,
                              )}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-600">
                            {
                              entry.description
                            }
                          </td>

                          <td className="px-3 py-3 text-right font-bold text-rose-700">
                            {entry.debitAmount >
                            0
                              ? formatCurrency(
                                  entry.debitAmount,
                                )
                              : "—"}
                          </td>

                          <td className="px-3 py-3 text-right font-bold text-emerald-700">
                            {entry.creditAmount >
                            0
                              ? formatCurrency(
                                  entry.creditAmount,
                                )
                              : "—"}
                          </td>

                          <td className="px-3 py-3 text-right font-black text-slate-950">
                            {formatCurrency(
                              entry.runningBalance,
                            )}
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
          <WonFlowOperationalPanel
            description="Record an additional payment against the patient’s outstanding account balance."
            icon={
              <CreditCard size={18} />
            }
            title="Receive Account Payment"
            tone="emerald"
          >
            {account.outstandingBalance <=
            0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-sm font-black text-emerald-950">
                  No payment is currently due
                </div>

                <p className="mt-2 text-xs leading-5 text-emerald-700">
                  This patient has no outstanding hospital balance.
                </p>

                {account.accountCredit >
                0 ? (
                  <p className="mt-2 text-xs font-bold text-emerald-800">
                    Account credit:
                    {" "}
                    {formatCurrency(
                      account.accountCredit,
                    )}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-amber-700">
                    Outstanding Balance
                  </div>

                  <div className="mt-2 text-2xl font-black text-amber-950">
                    {formatCurrency(
                      account.outstandingBalance,
                    )}
                  </div>
                </div>

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
                      setBranchId(
                        event.target.value,
                      );
                    }}
                    value={branchId}
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
                    Encounter Reference
                  </span>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setEncounterId(
                        event.target.value,
                      );
                    }}
                    placeholder="Optional encounter ID"
                    value={encounterId}
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Payment Amount
                  </span>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    inputMode="decimal"
                    max={
                      account.outstandingBalance
                    }
                    min={0}
                    onChange={(
                      event,
                    ) => {
                      setPaymentAmount(
                        event.target.value,
                      );
                    }}
                    placeholder="0"
                    type="number"
                    value={paymentAmount}
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Payment Method
                  </span>

                  <select
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setPaymentMethod(
                        event.target
                          .value as
                          DemoBillingPaymentMethod,
                      );
                    }}
                    value={paymentMethod}
                  >
                    <option value="cash">
                      Cash
                    </option>

                    <option value="card">
                      Card
                    </option>

                    <option value="bank-transfer">
                      Bank Transfer
                    </option>

                    <option value="mobile-wallet">
                      Mobile Wallet
                    </option>

                    <option value="insurance">
                      Insurance
                    </option>

                    <option value="corporate">
                      Corporate Account
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
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
                      setReceivedBy(
                        event.target.value,
                      );
                    }}
                    placeholder="Cashier or billing staff"
                    value={receivedBy}
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Transaction Reference
                  </span>

                  <input
                    className={[
                      wonFlowInputClassName,
                      "mt-1.5",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setTransactionReference(
                        event.target.value,
                      );
                    }}
                    placeholder={
                      paymentMethod ===
                      "cash"
                        ? "Optional cash voucher"
                        : "Required transaction reference"
                    }
                    value={
                      transactionReference
                    }
                  />
                </label>

                <label>
                  <span className="text-xs font-bold text-slate-600">
                    Payment Note
                  </span>

                  <textarea
                    className={[
                      wonFlowTextareaClassName,
                      "mt-1.5 min-h-24",
                    ].join(" ")}
                    onChange={(
                      event,
                    ) => {
                      setPaymentNote(
                        event.target.value,
                      );
                    }}
                    value={paymentNote}
                  />
                </label>

                <WonFlowActionButton
                  className="w-full"
                  onClick={recordPayment}
                  variant="primary"
                >
                  Record Payment
                </WonFlowActionButton>
              </div>
            )}
          </WonFlowOperationalPanel>
        </aside>
      </div>

      <WonFlowOperationalPanel
        description="Additional cashier payments recorded directly against the patient account."
        title="Account Payment History"
        tone="violet"
      >
        {accountPayments.length ===
        0 ? (
          <WonFlowEmptyState
            description="Additional patient-account payments will appear here."
            title="No account payments"
          />
        ) : (
          <div className="wf-content-scroll">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">
                    Payment
                  </th>

                  <th className="px-3 py-3">
                    Date
                  </th>

                  <th className="px-3 py-3">
                    Branch
                  </th>

                  <th className="px-3 py-3">
                    Method
                  </th>

                  <th className="px-3 py-3">
                    Received By
                  </th>

                  <th className="px-3 py-3">
                    Reference
                  </th>

                  <th className="px-3 py-3 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {accountPayments.map(
                  (payment) => (
                    <tr
                      className="border-b border-slate-100 last:border-0"
                      key={payment.id}
                    >
                      <td className="px-3 py-3 font-mono text-xs font-bold">
                        {
                          payment.paymentNumber
                        }
                      </td>

                      <td className="px-3 py-3 text-xs">
                        {formatWonFlowDashboardDateTime(
                          payment.createdAt,
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        {branchesById.get(
                          payment.branchId,
                        )?.name ??
                          "Unknown branch"}
                      </td>

                      <td className="px-3 py-3 text-xs font-bold">
                        {humanizePaymentMethod(
                          payment.paymentMethod,
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        {
                          payment.receivedBy
                        }
                      </td>

                      <td className="px-3 py-3 font-mono text-xs">
                        {payment.transactionReference ||
                          "—"}
                      </td>

                      <td className="px-3 py-3 text-right font-black text-emerald-700">
                        {formatCurrency(
                          payment.amount,
                        )}
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
  );
}

interface PatientBillingLedgerProps {
  patientId: string;
}

export function PatientBillingLedger({
  patientId,
}: PatientBillingLedgerProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const branches =
    useWonFlowAsyncData({
      key:
        `patient-billing-ledger:${patientId}`,

      loader:
        (
          signal,
        ) =>
          hospitalService.listBranches(
            signal,
          ),

      isEmpty:
        (records) =>
          records.length === 0,
    });

  return (
    <WonFlowAsyncDataBoundary
      emptyDescription="Hospital branch information is unavailable."
      emptyTitle="Patient billing unavailable"
      loadingDescription="WonFlow is preparing invoices, payments and credit notes."
      loadingTitle="Preparing patient billing ledger"
      onRetry={
        branches.reload
      }
      state={branches}
    >
      {(records) => (
        <PatientBillingLedgerContent
          branches={records}
          patientId={patientId}
        />
      )}
    </WonFlowAsyncDataBoundary>
  );
}