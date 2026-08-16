import { database } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";

import { WonFlowApiError } from "@/server/http/route-handler";

const SITTING_STATUSES = ["PLANNED", "AVAILABLE", "ON_BREAK", "FINISHED"] as const;
type SittingStatus = (typeof SITTING_STATUSES)[number];

async function resolveDoctor(contextInput: WonFlowRequestContext) {
  const context = requireTenantContext(contextInput);
  if (!context.membershipId) {
    throw new WonFlowApiError(403, "doctor-membership-required", "A doctor membership is required.");
  }
  const doctor = await database.doctorProfile.findFirst({
    where: {
      tenantId: context.tenantId,
      staffProfile: {
        membershipId: context.membershipId,
        status: "ACTIVE",
        membership: { organizationId: context.organizationId, archivedAt: null },
      },
    },
    include: { staffProfile: true },
  });
  if (!doctor) {
    throw new WonFlowApiError(403, "doctor-profile-required", "A valid doctor profile is required.");
  }
  return { context, doctor };
}

function parseBusinessDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new WonFlowApiError(400, "invalid-sitting-date", "Select a valid sitting date.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new WonFlowApiError(400, "invalid-sitting-date", "Select a valid sitting date.");
  }
  return date;
}

function assertMinutes(startsMinute: number, endsMinute: number) {
  if (!Number.isInteger(startsMinute) || !Number.isInteger(endsMinute) || startsMinute < 0 || endsMinute > 1440) {
    throw new WonFlowApiError(400, "invalid-sitting-time", "Enter a valid sitting start and end time.");
  }
  if (endsMinute <= startsMinute) {
    throw new WonFlowApiError(400, "invalid-sitting-time", "The sitting end time must be later than the start time.");
  }
}

export class DoctorSittingService {
  /**
   * The doctor's own sitting hours, alongside the hospital roster for the same
   * weekday so the doctor can see the arrival time they are expected to meet.
   */
  async listMySittings(requestContext: WonFlowRequestContext, fromDate?: string) {
    const { context, doctor } = await resolveDoctor(requestContext);
    const from = fromDate ? parseBusinessDate(fromDate) : new Date(new Date().toISOString().slice(0, 10));

    const [sittings, roster, branches] = await Promise.all([
      database.doctorSitting.findMany({
        where: { tenantId: context.tenantId, doctorId: doctor.id, businessDate: { gte: from } },
        include: { branch: { select: { id: true, name: true, timezone: true } } },
        orderBy: [{ businessDate: "asc" }, { startsMinute: "asc" }],
        take: 120,
      }),
      database.availabilityRule.findMany({
        where: { tenantId: context.tenantId, doctorId: doctor.id, isActive: true },
        include: { branch: { select: { id: true, name: true, timezone: true } } },
        orderBy: [{ weekday: "asc" }, { startsMinute: "asc" }],
      }),
      // Real branches, so a doctor can record a sitting on a fresh tenant that
      // has no demo practice locations configured.
      database.branch.findMany({
        where: { tenantId: context.tenantId, organizationId: context.organizationId, status: "ACTIVE", archivedAt: null },
        select: { id: true, name: true, timezone: true, isMainBranch: true },
        orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
      }),
    ]);

    return {
      doctorId: doctor.id,
      // The doctor's home branch, used as the default when recording a sitting.
      defaultBranchId: doctor.staffProfile.branchId ?? branches.find((branch) => branch.isMainBranch)?.id ?? branches[0]?.id ?? null,
      branches,
      sittings,
      // Expected arrival windows set by the hospital. Informational only —
      // a sitting on the same date overrides these.
      roster: roster.map((rule) => ({
        id: rule.id,
        branch: rule.branch,
        weekday: rule.weekday,
        startsMinute: rule.startsMinute,
        endsMinute: rule.endsMinute,
        capacity: rule.capacity,
        serviceId: rule.serviceId,
      })),
    };
  }

  /**
   * Sittings for one business date across the hospital, for reception.
   * Reception needs the doctor's real published hours, room and status so the
   * desk reflects who is actually sitting rather than browser-local demo data.
   */
  async listSittingsForDate(requestContext: WonFlowRequestContext, date: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "appointments.read");
    const businessDate = parseBusinessDate(date);

    const sittings = await database.doctorSitting.findMany({
      where: {
        tenantId: context.tenantId,
        businessDate,
        branch: { organizationId: context.organizationId, archivedAt: null },
      },
      include: {
        branch: { select: { id: true, name: true } },
        doctor: {
          select: {
            id: true,
            durationMinutes: true,
            staffProfile: { select: { membershipId: true, membership: { select: { displayName: true } } } },
          },
        },
      },
      orderBy: [{ startsMinute: "asc" }],
    });

    return {
      date,
      sittings: sittings.map((sitting) => ({
        id: sitting.id,
        doctorId: sitting.doctorId,
        membershipId: sitting.doctor.staffProfile.membershipId,
        doctorName: sitting.doctor.staffProfile.membership.displayName,
        branchId: sitting.branchId,
        branchName: sitting.branch.name,
        startsMinute: sitting.startsMinute,
        endsMinute: sitting.endsMinute,
        averageConsultationMinutes: sitting.averageConsultationMinutes,
        roomLabel: sitting.roomLabel,
        status: sitting.status,
      })),
    };
  }

  /** Creates or replaces the doctor's sitting for one branch and business date. */
  async saveMySitting(requestContext: WonFlowRequestContext, input: {
    branchId: string;
    businessDate: string;
    startsMinute: number;
    endsMinute: number;
    averageConsultationMinutes?: number;
    roomLabel?: string | null;
    status?: SittingStatus;
  }) {
    const { context, doctor } = await resolveDoctor(requestContext);
    const businessDate = parseBusinessDate(input.businessDate);
    assertMinutes(input.startsMinute, input.endsMinute);

    const averageConsultationMinutes = input.averageConsultationMinutes ?? doctor.durationMinutes;
    if (!Number.isInteger(averageConsultationMinutes) || averageConsultationMinutes < 5 || averageConsultationMinutes > 120) {
      throw new WonFlowApiError(400, "invalid-sitting-duration", "Average consultation time must be between 5 and 120 minutes.");
    }
    if (input.status !== undefined && !SITTING_STATUSES.includes(input.status)) {
      throw new WonFlowApiError(400, "invalid-sitting-status", "Select a valid sitting status.");
    }

    const branch = await database.branch.findFirst({
      where: { id: input.branchId, tenantId: context.tenantId, organizationId: context.organizationId, status: "ACTIVE", archivedAt: null },
    });
    if (!branch) {
      throw new WonFlowApiError(400, "invalid-sitting-branch", "Select a branch in this hospital.");
    }

    // Shrinking a sitting must not orphan appointments already booked outside it.
    const existing = await database.doctorSitting.findFirst({
      where: { tenantId: context.tenantId, doctorId: doctor.id, branchId: branch.id, businessDate },
    });
    const conflicting = await this.countAppointmentsOutside({
      tenantId: context.tenantId,
      doctorId: doctor.id,
      branchId: branch.id,
      businessDate: input.businessDate,
      timezone: branch.timezone,
      startsMinute: input.startsMinute,
      endsMinute: input.endsMinute,
    });
    if (conflicting > 0) {
      throw new WonFlowApiError(409, "sitting-conflicts-appointments", `${conflicting} booked ${conflicting === 1 ? "appointment falls" : "appointments fall"} outside these hours. Move or cancel them before changing your sitting.`);
    }

    const now = new Date();
    return database.$transaction(async (transaction) => {
      const sitting = existing
        ? await transaction.doctorSitting.update({
          where: { id: existing.id },
          data: {
            startsMinute: input.startsMinute,
            endsMinute: input.endsMinute,
            averageConsultationMinutes,
            roomLabel: input.roomLabel?.trim() || null,
            ...(input.status ? { status: input.status } : {}),
            ...(input.status === "AVAILABLE" ? { actualStartedAt: existing.actualStartedAt ?? now, actualEndedAt: null } : {}),
          },
        })
        : await transaction.doctorSitting.create({
          data: {
            tenantId: context.tenantId,
            doctorId: doctor.id,
            branchId: branch.id,
            businessDate,
            startsMinute: input.startsMinute,
            endsMinute: input.endsMinute,
            averageConsultationMinutes,
            roomLabel: input.roomLabel?.trim() || null,
            status: input.status ?? "PLANNED",
            actualStartedAt: input.status === "AVAILABLE" ? now : null,
          },
        });

      await transaction.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: branch.id,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: existing ? "doctor.sitting.updated" : "doctor.sitting.created",
          entityType: "doctor-sitting",
          entityId: sitting.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });

      return sitting;
    });
  }

  /** Marks the doctor as arrived, on break, or finished for the date. */
  async setMySittingStatus(requestContext: WonFlowRequestContext, sittingId: string, status: SittingStatus) {
    const { context, doctor } = await resolveDoctor(requestContext);
    if (!SITTING_STATUSES.includes(status)) {
      throw new WonFlowApiError(400, "invalid-sitting-status", "Select a valid sitting status.");
    }
    const sitting = await database.doctorSitting.findFirst({
      where: { id: sittingId, tenantId: context.tenantId, doctorId: doctor.id },
    });
    if (!sitting) {
      throw new WonFlowApiError(404, "sitting-not-found", "That sitting could not be found.");
    }

    const now = new Date();
    return database.$transaction(async (transaction) => {
      const updated = await transaction.doctorSitting.update({
        where: { id: sitting.id },
        data: {
          status,
          actualStartedAt: status === "AVAILABLE" && sitting.actualStartedAt === null ? now : sitting.actualStartedAt,
          actualEndedAt: status === "FINISHED" ? now : sitting.actualEndedAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: sitting.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "doctor.sitting.status-changed",
          entityType: "doctor-sitting",
          entityId: sitting.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
        },
      });
      return updated;
    });
  }

  private async countAppointmentsOutside(input: {
    tenantId: string;
    doctorId: string;
    branchId: string;
    businessDate: string;
    timezone: string;
    startsMinute: number;
    endsMinute: number;
  }): Promise<number> {
    const dayStart = new Date(`${input.businessDate}T00:00:00.000Z`);
    const dayEnd = new Date(`${input.businessDate}T23:59:59.999Z`);
    const appointments = await database.appointment.findMany({
      where: {
        tenantId: input.tenantId,
        doctorId: input.doctorId,
        branchId: input.branchId,
        startsAt: { lte: dayEnd },
        endsAt: { gte: dayStart },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_QUEUE", "IN_PROGRESS"] },
      },
      select: { startsAt: true, endsAt: true },
    });

    const minuteOfDay = (value: Date) => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: input.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(value);
      const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return Number(lookup.hour) * 60 + Number(lookup.minute);
    };

    return appointments.filter((appointment) =>
      minuteOfDay(appointment.startsAt) < input.startsMinute ||
      minuteOfDay(appointment.endsAt) > input.endsMinute,
    ).length;
  }
}

export const doctorSittingService = new DoctorSittingService();
