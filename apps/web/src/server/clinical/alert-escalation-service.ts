import { database, Prisma } from "@wonflow/database";
import type {
  AlertEventStatus,
  AlertSeverity,
} from "@wonflow/database";

import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import type {
  AcknowledgeAlertEventInput,
  AlertVolumeStats,
  CreateAlertRotaInput,
  ResolveAlertEventInput,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";

export class AlertEscalationService {
  /**
   * Schedule Step 1 escalation immediately upon alert trigger
   */
  async scheduleInitialEscalation(alertEventId: string, tenantId: string, severity: AlertSeverity) {
    const alert = await database.alertEvent.findFirst({
      where: { id: alertEventId, tenantId },
    });
    if (!alert) return;

    // 1. Resolve on-call clinician from AlertRota
    const onCallTarget = await this.resolveOnCallClinician(tenantId, severity);
    if (!onCallTarget) return;

    // 2. Create Step 1 escalation (PUSH notification)
    const escalation = await database.alertEscalation.create({
      data: {
        tenantId,
        alertEventId: alert.id,
        step: 1,
        channel: "PUSH",
        targetMembershipId: onCallTarget.primaryMembershipId,
        scheduledFor: new Date(),
      },
    });

    // 3. Dispatch Step 1 notification immediately
    await this.dispatchEscalationStep(escalation.id);

    // 4. Pre-schedule Step 2 (SMS) if CRITICAL or WARNING
    const intervalMinutes = severity === "CRITICAL" ? 15 : 45;
    const step2Schedule = new Date(Date.now() + intervalMinutes * 60 * 1000);

    await database.alertEscalation.create({
      data: {
        tenantId,
        alertEventId: alert.id,
        step: 2,
        channel: "SMS",
        targetMembershipId: onCallTarget.primaryMembershipId,
        scheduledFor: step2Schedule,
      },
    });
  }

  /**
   * Resolve who is on call for this hour & day
   */
  async resolveOnCallClinician(tenantId: string, severity: AlertSeverity) {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const currentMinute = now.getUTCHours() * 60 + now.getUTCMinutes();

    // Check rota matching current day, minute, and severity
    const rota = await database.alertRota.findFirst({
      where: {
        tenantId,
        dayOfWeek,
        startMinute: { lte: currentMinute },
        endMinute: { gte: currentMinute },
        severity,
      },
    });

    if (rota) {
      return {
        primaryMembershipId: rota.primaryMembershipId,
        escalationMembershipId: rota.escalationMembershipId,
      };
    }

    // Fallback: look for any active doctor or staff membership in the tenant
    const fallbackMembership = await database.tenantMembership.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        staffProfile: { isNot: null },
      },
      select: { id: true },
    });

    if (fallbackMembership) {
      return {
        primaryMembershipId: fallbackMembership.id,
        escalationMembershipId: fallbackMembership.id,
      };
    }

    return null;
  }

  /**
   * Dispatches a single escalation step to the Notification worker
   */
  async dispatchEscalationStep(escalationId: string) {
    const escalation = await database.alertEscalation.findUnique({
      where: { id: escalationId },
      include: {
        AlertEvent: true,
      },
    });

    if (!escalation || !escalation.AlertEvent) return;
    if (escalation.sentAt) return; // already sent

    // If alert has been acknowledged or resolved, cancel escalation
    if (["ACKNOWLEDGED", "RESOLVED"].includes(escalation.AlertEvent.status)) {
      await database.alertEscalation.update({
        where: { id: escalationId },
        data: {
          failedAt: new Date(),
          failureReason: "Alert already acknowledged or resolved by clinician.",
        },
      });
      return;
    }

    const alert = escalation.AlertEvent;

    // Spec requirement (E-02): notifications MUST NOT carry any clinical detail, patient
    // identifiers, values, or diagnoses. Generic message + secure portal link only.
    const message = `A post-op patient under your care requires urgent clinical review. Please log in to the portal to respond.`;

    try {
      // Create system Notification record
      await database.notification.create({
        data: {
          tenantId: escalation.tenantId,
          patientId: alert.patientId,
          channel: escalation.channel === "SMS" ? "SMS" : "IN_APP",
          templateCode: "CLINICAL_ALERT_ESCALATION",
          status: "DELIVERED",
          sentAt: new Date(),
          destination: escalation.targetMembershipId,
          payload: {
            alertEventId: alert.id,
            severity: alert.severity,
            step: escalation.step,
            message,
            link: `/operations/alerts?alertId=${alert.id}`,
          },
        },
      });


      await database.alertEscalation.update({
        where: { id: escalationId },
        data: {
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // If this was Step 2, schedule Step 3 to escalation target
      if (escalation.step === 2) {
        const onCall = await this.resolveOnCallClinician(escalation.tenantId, alert.severity);
        if (onCall) {
          const step3IntervalMinutes = alert.severity === "CRITICAL" ? 15 : 45;
          await database.alertEscalation.create({
            data: {
              tenantId: escalation.tenantId,
              alertEventId: alert.id,
              step: 3,
              channel: "SMS",
              targetMembershipId: onCall.escalationMembershipId,
              scheduledFor: new Date(Date.now() + step3IntervalMinutes * 60 * 1000),
            },
          });
        }
      }
    } catch (err: unknown) {
      await database.alertEscalation.update({
        where: { id: escalationId },
        data: {
          failedAt: new Date(),
          failureReason: err instanceof Error ? err.message : "Notification dispatch failed",
        },
      });
    }
  }

  /**
   * Worker job processor: finds and sends all due escalations
   */
  async processPendingEscalations(tenantId?: string) {
    const where: Prisma.AlertEscalationWhereInput = {
      scheduledFor: { lte: new Date() },
      sentAt: null,
      failedAt: null,
    };
    if (tenantId) where.tenantId = tenantId;

    const dueEscalations = await database.alertEscalation.findMany({
      where,
      take: 50,
      orderBy: { scheduledFor: "asc" },
    });

    for (const esc of dueEscalations) {
      await this.dispatchEscalationStep(esc.id);
    }

    return { processed: dueEscalations.length };
  }

  /**
   * Acknowledge an open alert (stops escalation)
   */
  async acknowledgeAlert(
    requestContext: WonFlowRequestContext,
    alertId: string,
    input: AcknowledgeAlertEventInput = {},
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    const alert = await database.alertEvent.findFirst({
      where: { id: alertId, tenantId: context.tenantId },
    });

    if (!alert) {
      throw new WonFlowApiError(404, "alert-not-found", "Clinical alert not found.");
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.alertEvent.update({
        where: { id: alertId },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedByMembershipId: context.membershipId || null,
          acknowledgedAt: new Date(),
        },
      });

      // Mark un-sent escalations as acknowledged
      await tx.alertEscalation.updateMany({
        where: {
          alertEventId: alertId,
          sentAt: null,
        },
        data: {
          acknowledgedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.alert.acknowledged",
          entityType: "alert-event",
          entityId: alert.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            notes: input.notes || null,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Resolve an alert with required clinical resolution note
   */
  async resolveAlert(
    requestContext: WonFlowRequestContext,
    alertId: string,
    input: ResolveAlertEventInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    if (!input.resolutionNotes?.trim()) {
      throw new WonFlowApiError(
        400,
        "missing-resolution-notes",
        "Clinical resolution notes are mandatory when resolving an alert.",
      );
    }

    const alert = await database.alertEvent.findFirst({
      where: { id: alertId, tenantId: context.tenantId },
    });

    if (!alert) {
      throw new WonFlowApiError(404, "alert-not-found", "Clinical alert not found.");
    }

    return database.$transaction(async (tx) => {
      const updated = await tx.alertEvent.update({
        where: { id: alertId },
        data: {
          status: "RESOLVED",
          resolvedByMembershipId: context.membershipId || null,
          resolvedAt: new Date(),
          resolutionNotes: input.resolutionNotes.trim(),
        },
      });

      // Clear any pending escalations
      await tx.alertEscalation.updateMany({
        where: {
          alertEventId: alertId,
          sentAt: null,
        },
        data: {
          acknowledgedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: context.tenantId,
          branchId: context.branchId,
          actorMembershipId: context.membershipId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          action: "clinical.alert.resolved",
          entityType: "alert-event",
          entityId: alert.id,
          severity: "INFORMATION",
          sourceApplication: context.sourceApplication,
          metadata: {
            resolutionNotes: input.resolutionNotes.trim(),
          },
        },
      });

      return updated;
    });
  }

  /**
   * List alerts with filtering and pagination
   */
  async listAlerts(
    requestContext: WonFlowRequestContext,
    query: {
      status?: AlertEventStatus | "ACTIVE";
      severity?: AlertSeverity;
      patientId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    const where: Prisma.AlertEventWhereInput = {
      tenantId: context.tenantId,
    };

    if (query.status === "ACTIVE") {
      where.status = { in: ["OPEN", "ACKNOWLEDGED"] };
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    const [alerts, total] = await Promise.all([
      database.alertEvent.findMany({
        where,
        include: {
          Patient: {
            select: {
              givenName: true,
              familyName: true,
              patientNumber: true,
            },
          },
          AlertRule: {
            select: { name: true },
          },
          AcknowledgedBy: {
            select: { displayName: true },
          },
          ResolvedBy: {
            select: { displayName: true },
          },
          Escalations: true,
        },
        orderBy: [
          { status: "asc" },
          { severity: "desc" },
          { triggeredAt: "desc" },
        ],
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      database.alertEvent.count({ where }),
    ]);

    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        patientId: a.patientId,
        patientName: `${a.Patient.givenName} ${a.Patient.familyName}`,
        patientNumber: a.Patient.patientNumber,
        ruleId: a.ruleId,
        ruleName: a.AlertRule?.name || null,
        title: a.title,
        description: a.description,
        metricType: a.metricType,
        metricCode: a.metricCode,
        metricValue: a.metricValue,
        sourceRecordType: a.sourceRecordType,
        sourceRecordId: a.sourceRecordId,
        severity: a.severity,
        status: a.status,
        deviceRecordedAt: a.deviceRecordedAt ? a.deviceRecordedAt.toISOString() : null,
        triggeredAt: a.triggeredAt.toISOString(),
        acknowledgedByMembershipId: a.acknowledgedByMembershipId,
        acknowledgedByName: a.AcknowledgedBy?.displayName || null,
        acknowledgedAt: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
        resolvedByMembershipId: a.resolvedByMembershipId,
        resolvedByName: a.ResolvedBy?.displayName || null,
        resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
        resolutionNotes: a.resolutionNotes,
        escalations: a.Escalations.map((e) => ({
          id: e.id,
          tenantId: e.tenantId,
          alertEventId: e.alertEventId,
          step: e.step,
          channel: e.channel,
          targetMembershipId: e.targetMembershipId,
          scheduledFor: e.scheduledFor.toISOString(),
          sentAt: e.sentAt ? e.sentAt.toISOString() : null,
          deliveredAt: e.deliveredAt ? e.deliveredAt.toISOString() : null,
          acknowledgedAt: e.acknowledgedAt ? e.acknowledgedAt.toISOString() : null,
          failedAt: e.failedAt ? e.failedAt.toISOString() : null,
          failureReason: e.failureReason,
        })),
      })),
      total,
    };
  }

  /**
   * Get detail of a specific alert including clinical trends
   */
  async getAlertDetail(requestContext: WonFlowRequestContext, alertId: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    const alert = await database.alertEvent.findFirst({
      where: { id: alertId, tenantId: context.tenantId },
      include: {
        Patient: {
          include: {
            allergies: { where: { status: "ACTIVE" } },
            CarePlan: {
              where: { status: "ACTIVE" },
              select: { title: true },
              take: 1,
            },
          },
        },
        AlertRule: true,
        AcknowledgedBy: { select: { displayName: true } },
        ResolvedBy: { select: { displayName: true } },
        Escalations: true,
      },
    });

    if (!alert) {
      throw new WonFlowApiError(404, "alert-not-found", "Clinical alert not found.");
    }

    // Fetch recent observations for this patient's metricCode if applicable
    const recentObs = await database.clinicalObservation.findMany({
      where: {
        tenantId: context.tenantId,
        patientId: alert.patientId,
        code: alert.metricCode,
      },
      orderBy: { observedAt: "desc" },
      take: 10,
    });

    return {
      id: alert.id,
      tenantId: alert.tenantId,
      patientId: alert.patientId,
      patientName: `${alert.Patient.givenName} ${alert.Patient.familyName}`,
      patientNumber: alert.Patient.patientNumber,
      ruleId: alert.ruleId,
      ruleName: alert.AlertRule?.name || null,
      title: alert.title,
      description: alert.description,
      metricType: alert.metricType,
      metricCode: alert.metricCode,
      metricValue: alert.metricValue,
      sourceRecordType: alert.sourceRecordType,
      sourceRecordId: alert.sourceRecordId,
      severity: alert.severity,
      status: alert.status,
      deviceRecordedAt: alert.deviceRecordedAt ? alert.deviceRecordedAt.toISOString() : null,
      triggeredAt: alert.triggeredAt.toISOString(),
      acknowledgedByMembershipId: alert.acknowledgedByMembershipId,
      acknowledgedByName: alert.AcknowledgedBy?.displayName || null,
      acknowledgedAt: alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
      resolvedByMembershipId: alert.resolvedByMembershipId,
      resolvedByName: alert.ResolvedBy?.displayName || null,
      resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
      resolutionNotes: alert.resolutionNotes,
      activeCarePlanTitle: alert.Patient.CarePlan[0]?.title || null,
      patientAllergies: alert.Patient.allergies.map((a) => a.allergen),
      recentTrends: recentObs.map((o) => ({
        observedAt: o.observedAt.toISOString(),
        value: o.valueNumber !== null ? Number(o.valueNumber) : o.valueText || "",
        unit: o.unit || undefined,
      })),

      escalations: alert.Escalations.map((e) => ({
        id: e.id,
        tenantId: e.tenantId,
        alertEventId: e.alertEventId,
        step: e.step,
        channel: e.channel,
        targetMembershipId: e.targetMembershipId,
        scheduledFor: e.scheduledFor.toISOString(),
        sentAt: e.sentAt ? e.sentAt.toISOString() : null,
        deliveredAt: e.deliveredAt ? e.deliveredAt.toISOString() : null,
        acknowledgedAt: e.acknowledgedAt ? e.acknowledgedAt.toISOString() : null,
        failedAt: e.failedAt ? e.failedAt.toISOString() : null,
        failureReason: e.failureReason,
      })),
    };
  }

  /**
   * Alert Volume & Signal-to-Noise Analytics
   */
  async getAlertStats(requestContext: WonFlowRequestContext): Promise<AlertVolumeStats> {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [openAlerts, resolved24h] = await Promise.all([
      database.alertEvent.findMany({
        where: {
          tenantId: context.tenantId,
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
        },
        select: { severity: true, status: true },
      }),
      database.alertEvent.findMany({
        where: {
          tenantId: context.tenantId,
          status: "RESOLVED",
          resolvedAt: { gte: oneDayAgo },
        },
        select: { triggeredAt: true, resolvedAt: true },
      }),
    ]);

    let totalDurationMinutes = 0;
    for (const r of resolved24h) {
      if (r.resolvedAt) {
        totalDurationMinutes += (r.resolvedAt.getTime() - r.triggeredAt.getTime()) / (1000 * 60);
      }
    }

    const averageResolutionMinutes =
      resolved24h.length > 0 ? Math.round(totalDurationMinutes / resolved24h.length) : 0;

    return {
      totalOpen: openAlerts.length,
      criticalCount: openAlerts.filter((a) => a.severity === "CRITICAL").length,
      warningCount: openAlerts.filter((a) => a.severity === "WARNING").length,
      infoCount: openAlerts.filter((a) => a.severity === "INFO").length,
      acknowledgedCount: openAlerts.filter((a) => a.status === "ACKNOWLEDGED").length,
      resolvedLast24h: resolved24h.length,
      averageResolutionMinutes,
    };
  }

  // --- Rota Management ---

  async listRotas(requestContext: WonFlowRequestContext) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    const rotas = await database.alertRota.findMany({
      where: { tenantId: context.tenantId },
      include: {
        PrimaryMembership: { select: { displayName: true } },
        EscalationMembership: { select: { displayName: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });

    return rotas.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      dayOfWeek: r.dayOfWeek,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      severity: r.severity,
      primaryMembershipId: r.primaryMembershipId,
      primaryName: r.PrimaryMembership.displayName,
      escalationMembershipId: r.escalationMembershipId,
      escalationName: r.EscalationMembership.displayName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createRota(requestContext: WonFlowRequestContext, input: CreateAlertRotaInput) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.manage");

    if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new WonFlowApiError(400, "invalid-day", "Day of week must be between 0 (Sun) and 6 (Sat).");
    }
    if (input.startMinute < 0 || input.endMinute > 1440 || input.startMinute >= input.endMinute) {
      throw new WonFlowApiError(400, "invalid-time", "Invalid start/end minute range.");
    }

    return database.alertRota.create({
      data: {
        tenantId: context.tenantId,
        dayOfWeek: input.dayOfWeek,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        severity: input.severity || "WARNING",
        primaryMembershipId: input.primaryMembershipId,
        escalationMembershipId: input.escalationMembershipId,
      },
    });
  }

  async deleteRota(requestContext: WonFlowRequestContext, id: string) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.manage");

    const rota = await database.alertRota.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!rota) throw new WonFlowApiError(404, "rota-not-found", "Alert rota not found.");

    return database.alertRota.delete({ where: { id } });
  }
}
