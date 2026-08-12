import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import type {
  WonFlowLiveBranchDashboardSummary,
  WonFlowLiveOrganizationDashboardProjection,
} from "@/lib/dashboard/types";
import { WonFlowApiError } from "@/server/http/route-handler";

const BILLABLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;
const OPEN_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID"] as const;
const LIVE_QUEUE_STATUSES = ["WAITING", "CALLED", "IN_SERVICE"] as const;

interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

function localDateParts(value: Date, timezone: string): CalendarDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value);

  return { year: part("year"), month: part("month"), day: part("day") };
}

function timezoneOffsetMilliseconds(value: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((item) => item.type === type)?.value);
  const representedAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );

  return representedAsUtc - value.getTime();
}

function localMidnightToUtc(parts: CalendarDateParts, timezone: string): Date {
  const targetAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  let result = new Date(targetAsUtc);

  // Recalculate once to handle a daylight-saving transition near midnight.
  for (let pass = 0; pass < 2; pass += 1) {
    result = new Date(targetAsUtc - timezoneOffsetMilliseconds(result, timezone));
  }

  return result;
}

function nextCalendarDate(parts: CalendarDateParts): CalendarDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function dayBounds(now: Date, timezone: string): { start: Date; end: Date } {
  const today = localDateParts(now, timezone);
  return {
    start: localMidnightToUtc(today, timezone),
    end: localMidnightToUtc(nextCalendarDate(today), timezone),
  };
}

export async function getOrganizationAdminDashboard(
  requestContext: WonFlowRequestContext,
): Promise<WonFlowLiveOrganizationDashboardProjection> {
  const context = requireTenantContext(requestContext);
  requirePermission(context, "organization.profile.read");

  const organization = await database.organization.findFirst({
    where: {
      id: context.organizationId,
      tenantId: context.tenantId,
      archivedAt: null,
    },
    select: {
      id: true,
      displayName: true,
      branches: {
        where: {
          archivedAt: null,
          status: { not: "ARCHIVED" },
        },
        orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          isMainBranch: true,
          timezone: true,
          currencyCode: true,
        },
      },
    },
  });

  if (!organization) {
    throw new WonFlowApiError(
      404,
      "organization-not-found",
      "The hospital organization could not be found.",
    );
  }

  const now = new Date();
  const branches = organization.branches;
  const branchIds = branches.map((branch) => branch.id);
  const boundsByBranch = new Map(
    branches.map((branch) => [branch.id, dayBounds(now, branch.timezone)]),
  );
  const earliestStart = branches.length
    ? new Date(Math.min(...[...boundsByBranch.values()].map((bounds) => bounds.start.getTime())))
    : now;
  const latestEnd = branches.length
    ? new Date(Math.max(...[...boundsByBranch.values()].map((bounds) => bounds.end.getTime())))
    : now;

  const [patientCount, staff, appointments, queueEntries, invoices] = await Promise.all([
    database.patient.count({
      where: {
        tenantId: context.tenantId,
        archivedAt: null,
        status: { not: "ARCHIVED" },
      },
    }),
    database.staffProfile.findMany({
      where: {
        tenantId: context.tenantId,
        status: "ACTIVE",
        membership: {
          organizationId: context.organizationId,
          archivedAt: null,
          status: "ACTIVE",
        },
      },
      select: {
        branchId: true,
        doctor: { select: { id: true } },
      },
    }),
    branchIds.length
      ? database.appointment.findMany({
          where: {
            tenantId: context.tenantId,
            branchId: { in: branchIds },
            startsAt: { gte: earliestStart, lt: latestEnd },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          select: { branchId: true, startsAt: true },
        })
      : Promise.resolve([]),
    branchIds.length
      ? database.queueEntry.findMany({
          where: {
            tenantId: context.tenantId,
            status: { in: [...LIVE_QUEUE_STATUSES] },
            queue: { branchId: { in: branchIds } },
          },
          select: { queue: { select: { branchId: true } } },
        })
      : Promise.resolve([]),
    branchIds.length
      ? database.invoice.groupBy({
          by: ["branchId", "status"],
          where: {
            tenantId: context.tenantId,
            branchId: { in: branchIds },
            currencyCode: context.currencyCode,
            status: { in: [...BILLABLE_INVOICE_STATUSES] },
          },
          _count: { _all: true },
          _sum: { totalMinor: true, paidMinor: true },
        })
      : Promise.resolve([]),
  ]);

  const activeDoctors = staff.filter((member) => member.doctor !== null);
  const appointmentsToday = appointments.filter((appointment) => {
    const bounds = boundsByBranch.get(appointment.branchId);
    return Boolean(
      bounds && appointment.startsAt >= bounds.start && appointment.startsAt < bounds.end,
    );
  });
  const openInvoiceGroups = invoices.filter((invoice) =>
    OPEN_INVOICE_STATUSES.includes(invoice.status as (typeof OPEN_INVOICE_STATUSES)[number]),
  );
  const billedMinorUnits = invoices.reduce(
    (total, invoice) => total + (invoice._sum.totalMinor ?? 0),
    0,
  );
  const paidMinorUnits = invoices.reduce(
    (total, invoice) => total + (invoice._sum.paidMinor ?? 0),
    0,
  );

  const branchSummaries: WonFlowLiveBranchDashboardSummary[] = branches.map((branch) => {
    const branchInvoices = invoices.filter((invoice) => invoice.branchId === branch.id);
    return {
      branch,
      practitionerCount: activeDoctors.filter((member) => member.branchId === branch.id).length,
      todayAppointmentCount: appointmentsToday.filter(
        (appointment) => appointment.branchId === branch.id,
      ).length,
      liveQueueCount: queueEntries.filter(
        (entry) => entry.queue.branchId === branch.id,
      ).length,
      openInvoiceCount: openInvoiceGroups
        .filter((invoice) => invoice.branchId === branch.id)
        .reduce((total, invoice) => total + invoice._count._all, 0),
      outstandingInvoiceMinorUnits: branchInvoices.reduce(
        (total, invoice) =>
          total + Math.max(0, (invoice._sum.totalMinor ?? 0) - (invoice._sum.paidMinor ?? 0)),
        0,
      ),
    };
  });

  return {
    source: {
      kind: "live",
      generatedAt: now.toISOString(),
      timezone: context.timezone,
    },
    organization: {
      id: organization.id,
      name: organization.displayName,
    },
    branches,
    branchSummaries,
    totals: {
      patients: patientCount,
      practitioners: activeDoctors.length,
      todayAppointments: appointmentsToday.length,
      liveQueueEntries: queueEntries.length,
      activeBranches: branches.filter((branch) => branch.status === "ACTIVE").length,
      openInvoices: openInvoiceGroups.reduce(
        (total, invoice) => total + invoice._count._all,
        0,
      ),
    },
    financial: {
      currencyCode: context.currencyCode,
      totalBilledMinorUnits: billedMinorUnits,
      totalPaidMinorUnits: paidMinorUnits,
      outstandingMinorUnits: Math.max(0, billedMinorUnits - paidMinorUnits),
    },
  };
}
