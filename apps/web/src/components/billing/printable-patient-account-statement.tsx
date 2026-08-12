"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Printer,
} from "lucide-react";

import {
  WonFlowBrandMark,
} from "@/components/design";

import {
  WonFlowErrorState,
} from "@/components/feedback";

import {
  WonFlowActionButton,
} from "@/components/workspace";

import {
  buildDemoPatientBillingAccount,
} from "@/lib/billing";

import type {
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

interface PrintablePatientAccountStatementProps {
  patientId: string;
}

export function PrintablePatientAccountStatement({
  patientId,
}: PrintablePatientAccountStatementProps) {
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

  const loadStatement =
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
    }, [patientId]);

  useEffect(() => {
    queueMicrotask(
      loadStatement,
    );
  }, [loadStatement]);

  if (
    patient === undefined
  ) {
    return (
      <WonFlowErrorState
        description="The requested patient account could not be loaded."
        title="Account statement unavailable"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="wf-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Link
          className="wf-button-secondary"
          href={`/operations/patients/${encodeURIComponent(
            patient.id,
          )}/billing`}
        >
          Return to Billing Ledger
        </Link>

        <WonFlowActionButton
          icon={
            <Printer size={17} />
          }
          onClick={() => {
            window.print();
          }}
          variant="primary"
        >
          Print Account Statement
        </WonFlowActionButton>
      </div>

      <article className="wf-print-report mx-auto max-w-[1000px] bg-white p-8 text-slate-950 shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-blue-700 pb-5">
          <div className="flex items-center gap-4">
            <WonFlowBrandMark
              size={52}
            />

            <div>
              <h1 className="text-xl font-black tracking-[-0.04em]">
                WonFlow Central Demo Hospital
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Patient Account Statement
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Statement Generated
            </div>

            <div className="mt-1 text-xs font-bold">
              {formatWonFlowDashboardDateTime(
                new Date().toISOString(),
              )}
            </div>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 rounded-xl border border-slate-200 p-5 text-sm lg:grid-cols-4">
          <StatementField
            label="Patient"
            value={
              patient.displayName
            }
          />

          <StatementField
            label="MR Number"
            value={patient.mrNumber}
          />

          <StatementField
            label="CNIC / B-Form"
            value={
              patient.draft
                .cnicNumber
            }
          />

          <StatementField
            label="Mobile"
            value={
              patient.draft
                .mobileNumber
            }
          />

          <StatementField
            label="Total Billed"
            value={formatCurrency(
              account.totalBilled,
            )}
          />

          <StatementField
            label="Total Payments"
            value={formatCurrency(
              account.totalInvoicePayments +
                account.totalAccountPayments,
            )}
          />

          <StatementField
            label="Credit Notes"
            value={formatCurrency(
              account.totalCreditNotes,
            )}
          />

          <StatementField
            label="Outstanding Balance"
            value={formatCurrency(
              account.outstandingBalance,
            )}
          />
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
            Account Activity
          </h2>

          {account.entries.length ===
          0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              No account activity has been recorded.
            </div>
          ) : (
            <table className="mt-3 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-100">
                  <th className="px-3 py-3">
                    Date
                  </th>

                  <th className="px-3 py-3">
                    Reference
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
                      className="border-b border-slate-200"
                      key={entry.id}
                    >
                      <td className="px-3 py-3">
                        {formatWonFlowDashboardDateTime(
                          entry.occurredAt,
                        )}
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {
                          entry.referenceNumber
                        }
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-bold">
                          {humanizeValue(
                            entry.entryType,
                          )}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {
                            entry.description
                          }
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right">
                        {entry.debitAmount >
                        0
                          ? formatCurrency(
                              entry.debitAmount,
                            )
                          : "—"}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {entry.creditAmount >
                        0
                          ? formatCurrency(
                              entry.creditAmount,
                            )
                          : "—"}
                      </td>

                      <td className="px-3 py-3 text-right font-bold">
                        {formatCurrency(
                          entry.runningBalance,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-800">
                  <td
                    className="px-3 py-4 text-right font-black"
                    colSpan={5}
                  >
                    Outstanding Balance
                  </td>

                  <td className="px-3 py-4 text-right text-sm font-black">
                    {formatCurrency(
                      account.outstandingBalance,
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </section>

        {account.accountCredit >
        0 ? (
          <section className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
            <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Patient Account Credit
            </div>

            <div className="mt-2 text-xl font-black text-emerald-950">
              {formatCurrency(
                account.accountCredit,
              )}
            </div>
          </section>
        ) : null}

        <footer className="mt-12 grid grid-cols-2 gap-12 border-t border-slate-300 pt-8 text-xs">
          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Billing Officer
            </div>
          </div>

          <div>
            <div className="h-px bg-slate-400" />

            <div className="mt-2 font-bold">
              Patient / Representative
            </div>
          </div>
        </footer>

        <p className="mt-8 text-center text-[10px] leading-4 text-slate-500">
          Demonstration account statement only. Production statements require authenticated billing records, accounting reconciliation and approved hospital branding.
        </p>
      </article>
    </div>
  );
}

function StatementField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-bold">
        {value || "Not recorded"}
      </div>
    </div>
  );
}