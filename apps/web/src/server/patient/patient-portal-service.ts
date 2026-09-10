import { database } from "@wonflow/database";
import { requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { attachmentInclude, serializeAttachments } from "@/server/diagnostics/diagnostics-service";

export class PatientPortalService {
  private async resolvePatient(rc: WonFlowRequestContext) {
    const context = requireTenantContext(rc);
    const now = new Date();

    let access = await database.patientAccess.findFirst({
      where: {
        identityId: context.identityId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        patient: { tenantId: context.tenantId, status: "ACTIVE" },
      },
      include: { patient: { include: { identifiers: true } } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    if (!access) {
      // Fallback: auto-link if identity email or phone matches a patient in this tenant
      const identity = await database.identity.findUnique({
        where: { id: context.identityId },
        select: { email: true, normalizedEmail: true, phone: true },
      });

      if (identity) {
        const matchingPatient = await database.patient.findFirst({
          where: {
            tenantId: context.tenantId,
            status: "ACTIVE",
            OR: [
              ...(identity.normalizedEmail ? [{ normalizedEmail: identity.normalizedEmail }] : []),
              ...(identity.email ? [{ email: identity.email }] : []),
              ...(identity.phone ? [{ phone: identity.phone }, { normalizedPhone: identity.phone }] : []),
            ],
          },
          include: { identifiers: true },
          orderBy: { createdAt: "desc" },
        });

        if (matchingPatient) {
          access = await database.patientAccess.create({
            data: {
              identityId: context.identityId,
              patientId: matchingPatient.id,
              isPrimary: true,
              isActive: true,
              relationship: "self",
            },
            include: { patient: { include: { identifiers: true } } },
          });
        }
      }
    }

    if (!access) {
      throw new WonFlowApiError(403, "patient-access-required", "This account is not linked to an active patient record.");
    }

    return { context, patient: access.patient, access };
  }

  async getHome(rc: WonFlowRequestContext) {
    const { context: c, patient } = await this.resolvePatient(rc);

    const [
      appointments,
      prescriptions,
      diagnosticOrders,
      encounters,
      diagnoses,
      clinicalNotes,
      observations,
      documents,
      notifications,
      invoices,
    ] = await Promise.all([
      // All patient appointments including active and completed visits with encounter link
      database.appointment.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        include: {
          service: true,
          doctor: { include: { staffProfile: { include: { membership: true } } } },
          branch: true,
          queueEntry: true,
          encounter: {
            include: {
              notes: { where: { status: { in: ["SIGNED", "RELEASED", "AMENDED"] } } },
              diagnoses: true,
            },
          },
        },
        orderBy: { startsAt: "desc" },
        take: 50,
      }),

      // Prescriptions with medication details and prescriber info
      database.prescription.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id, status: { in: ["ACTIVE", "PARTIALLY_DISPENSED", "DISPENSED", "DRAFT"] } },
        include: { items: { include: { medication: true } }, doctor: { include: { staffProfile: { include: { membership: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // All diagnostic orders (including pending/in-progress and released)
      database.diagnosticOrder.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        include: {
          results: { where: { status: { in: ["FINAL", "AMENDED", "CORRECTED"] } } },
          attachments: attachmentInclude,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // Full clinical consultations / encounters timeline (Patient care journey)
      database.encounter.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        include: {
          doctor: { include: { staffProfile: { include: { membership: true } } } },
          branch: true,
          appointment: true,
          diagnoses: true,
          notes: { where: { status: { in: ["SIGNED", "RELEASED", "AMENDED"] } } },
          diagnosticOrders: true,
          prescriptions: { include: { items: { include: { medication: true } } } },
        },
        orderBy: { startedAt: "desc" },
        take: 30,
      }),

      // Doctor-assigned diagnoses
      database.encounterDiagnosis.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        include: {
          encounter: {
            include: {
              doctor: { include: { staffProfile: { include: { membership: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),

      // Signed and released doctor clinical notes
      database.encounterNote.findMany({
        where: {
          tenantId: c.tenantId,
          status: { in: ["SIGNED", "RELEASED", "AMENDED"] },
          encounter: { patientId: patient.id },
        },
        include: {
          encounter: {
            select: {
              id: true,
              reason: true,
              startedAt: true,
              doctor: { select: { staffProfile: { select: { membership: { select: { displayName: true } } } } } },
            },
          },
        },
        orderBy: { releasedAt: "desc" },
        take: 30,
      }),

      // Clinical vitals and measurements
      database.clinicalObservation.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        orderBy: { observedAt: "desc" },
        take: 40,
      }),

      // Released medical documents
      database.documentRecord.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id, status: "RELEASED" },
        orderBy: { releasedAt: "desc" },
        take: 30,
      }),

      // Notifications
      database.notification.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),

      // Invoices
      database.invoice.findMany({
        where: { tenantId: c.tenantId, patientId: patient.id, status: { not: "DRAFT" } },
        include: { lines: true, payments: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return {
      patient,
      appointments,
      prescriptions,
      diagnosticOrders: diagnosticOrders.map(serializeAttachments),
      encounters,
      diagnoses,
      clinicalNotes,
      observations,
      documents,
      notifications,
      invoices,
    };
  }

  /** Signed (countersigned, where required) clinical notes only — a DRAFT note is never visible to the patient it is about. */
  async listClinicalNotes(rc: WonFlowRequestContext) {
    const { context: c, patient } = await this.resolvePatient(rc);
    return database.encounterNote.findMany({
      where: {
        tenantId: c.tenantId,
        status: { in: ["SIGNED", "RELEASED", "AMENDED"] },
        releasedAt: { not: null },
        encounter: { patientId: patient.id },
      },
      include: {
        encounter: {
          select: {
            id: true,
            reason: true,
            startedAt: true,
            doctor: { select: { staffProfile: { select: { membership: { select: { displayName: true } } } } } },
          },
        },
      },
      orderBy: { releasedAt: "desc" },
    });
  }

  async cancelAppointment(rc: WonFlowRequestContext, id: string, reason: string) {
    const { context: c, patient } = await this.resolvePatient(rc);
    if (!reason.trim()) throw new WonFlowApiError(400, "cancellation-reason-required", "Enter a cancellation reason.");
    const a = await database.appointment.findFirst({
      where: { id, tenantId: c.tenantId, patientId: patient.id, status: { in: ["PENDING", "CONFIRMED"] } },
    });

    if (!a) {
      const exists = await database.appointment.findFirst({ where: { id, tenantId: c.tenantId }, select: { id: true } });
      if (exists) {
        await database.auditEvent.create({
          data: {
            tenantId: c.tenantId,
            branchId: c.branchId,
            actorMembershipId: c.membershipId,
            sessionId: c.sessionId,
            requestId: c.requestId,
            action: "patient.appointment.access_denied",
            entityType: "appointment",
            entityId: id,
            severity: "WARNING",
            sourceApplication: c.sourceApplication,
          },
        });
      }
      throw new WonFlowApiError(404, "appointment-not-cancellable", "The appointment cannot be cancelled.");
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: a.id },
        data: { status: "CANCELLED", cancellationReason: reason.trim(), cancelledAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: c.tenantId,
          branchId: a.branchId,
          actorMembershipId: c.membershipId,
          sessionId: c.sessionId,
          requestId: c.requestId,
          action: "patient.appointment.cancelled",
          entityType: "appointment",
          entityId: a.id,
          severity: "INFORMATION",
          reason: reason.trim(),
          sourceApplication: c.sourceApplication,
        },
      });
      await tx.outboxEvent.create({
        data: {
          tenantId: c.tenantId,
          type: "appointment.cancelled",
          aggregateType: "appointment",
          aggregateId: a.id,
          payload: { appointmentId: a.id, patientId: patient.id },
        },
      });
      return updated;
    });
  }
}

export const patientPortalService = new PatientPortalService();
