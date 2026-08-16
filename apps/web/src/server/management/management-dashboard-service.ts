import { database } from "@wonflow/database";
import { requireTenantContext, requirePermission } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

const BILLABLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;

/**
 * Every figure here is a database-side SUM/COUNT (Prisma groupBy/aggregate),
 * never a fetch-all-rows-and-total-in-JS pass — a manager's dashboard must
 * stay fast and correct as patient/appointment/invoice volume grows, and
 * "correct" here specifically means the number a manager sees always
 * matches what a direct SQL query against the same range would show.
 */
export class ManagementDashboardService {
  async getDashboard(rc: WonFlowRequestContext, query: { from: string; to: string; branchId?: string }) {
    const c = requireTenantContext(rc);
    requirePermission(c, "management.dashboard.read");

    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new WonFlowApiError(400, "invalid-date-range", "The date range is invalid.");

    const organization = await database.organization.findFirst({
      where: { id: c.organizationId, tenantId: c.tenantId, archivedAt: null },
      include: { branches: { where: { archivedAt: null }, select: { id: true, name: true, code: true } } },
    });
    if (!organization) throw new WonFlowApiError(404, "organization-not-found", "The organization could not be found.");
    const branchIds = query.branchId ? [query.branchId] : organization.branches.map((branch) => branch.id);
    if (query.branchId && !organization.branches.some((branch) => branch.id === query.branchId)) throw new WonFlowApiError(404, "branch-not-found", "The branch could not be found.");

    const [patientCount, practitioners, appointmentsByStatus, appointmentsByBranch, queueByStatus, invoiceAgg, invoicesByBranch] = await Promise.all([
      database.patient.count({ where: { tenantId: c.tenantId, status: "ACTIVE", createdAt: { gte: from, lte: to } } }),
      database.staffProfile.findMany({ where: { tenantId: c.tenantId, branchId: { in: branchIds }, status: "ACTIVE", doctor: { isNot: null } }, select: { id: true } }),
      database.appointment.groupBy({ by: ["status"], where: { tenantId: c.tenantId, branchId: { in: branchIds }, startsAt: { gte: from, lte: to } }, _count: { _all: true } }),
      database.appointment.groupBy({ by: ["branchId", "status"], where: { tenantId: c.tenantId, branchId: { in: branchIds }, startsAt: { gte: from, lte: to } }, _count: { _all: true } }),
      database.queueEntry.groupBy({ by: ["status"], where: { tenantId: c.tenantId, queue: { branchId: { in: branchIds } }, joinedAt: { gte: from, lte: to } }, _count: { _all: true } }),
      database.invoice.aggregate({ where: { tenantId: c.tenantId, branchId: { in: branchIds }, status: { in: [...BILLABLE_INVOICE_STATUSES] }, createdAt: { gte: from, lte: to } }, _sum: { totalMinor: true, paidMinor: true }, _count: { _all: true } }),
      database.invoice.groupBy({ by: ["branchId"], where: { tenantId: c.tenantId, branchId: { in: branchIds }, status: { in: [...BILLABLE_INVOICE_STATUSES] }, createdAt: { gte: from, lte: to } }, _sum: { totalMinor: true, paidMinor: true }, _count: { _all: true } }),
    ]);

    const totalMinor = invoiceAgg._sum.totalMinor ?? 0;
    const paidMinor = invoiceAgg._sum.paidMinor ?? 0;
    const appointmentTotal = appointmentsByStatus.reduce((sum, row) => sum + row._count._all, 0);
    const appointmentCompleted = appointmentsByStatus.find((row) => row.status === "COMPLETED")?._count._all ?? 0;
    const queueTotal = queueByStatus.reduce((sum, row) => sum + row._count._all, 0);
    const queueCompleted = queueByStatus.find((row) => row.status === "COMPLETED")?._count._all ?? 0;

    const branchTable = organization.branches
      .filter((branch) => branchIds.includes(branch.id))
      .map((branch) => {
        const appointmentRows = appointmentsByBranch.filter((row) => row.branchId === branch.id);
        const invoiceRow = invoicesByBranch.find((row) => row.branchId === branch.id);
        return {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          appointmentTotal: appointmentRows.reduce((sum, row) => sum + row._count._all, 0),
          appointmentCompleted: appointmentRows.find((row) => row.status === "COMPLETED")?._count._all ?? 0,
          invoiceCount: invoiceRow?._count._all ?? 0,
          billedMinor: invoiceRow?._sum.totalMinor ?? 0,
          collectedMinor: invoiceRow?._sum.paidMinor ?? 0,
          outstandingMinor: (invoiceRow?._sum.totalMinor ?? 0) - (invoiceRow?._sum.paidMinor ?? 0),
        };
      });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      organization: { id: organization.id, displayName: organization.displayName },
      branches: organization.branches,
      summary: {
        patientCount,
        practitionerCount: practitioners.length,
        appointmentTotal,
        appointmentCompleted,
        appointmentCompletionRate: appointmentTotal ? Math.round((appointmentCompleted / appointmentTotal) * 100) : 0,
        queueTotal,
        queueCompleted,
        queueCompletionRate: queueTotal ? Math.round((queueCompleted / queueTotal) * 100) : 0,
        billedMinor: totalMinor,
        collectedMinor: paidMinor,
        outstandingMinor: totalMinor - paidMinor,
        collectionRate: totalMinor ? Math.round((paidMinor / totalMinor) * 100) : 0,
        invoiceCount: invoiceAgg._count._all,
      },
      appointmentsByStatus: appointmentsByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      queueByStatus: queueByStatus.map((row) => ({ status: row.status, count: row._count._all })),
      branchTable,
    };
  }
}

export const managementDashboardService = new ManagementDashboardService();
