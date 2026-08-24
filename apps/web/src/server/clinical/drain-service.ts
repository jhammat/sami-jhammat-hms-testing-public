import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  DrainDailyTrendPoint,
  DrainTrendSeries,
  DrainLogSummary,
  InsertDrainInput,
  PatientDrainSummary,
  RecordDrainLogInput,
  RemoveDrainInput,
  WonFlowRequestContext,
} from "@wonflow/contracts";

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

export class DrainService {
  /**
   * Clinician inserts a surgical drain.
   */
  async insertDrain(
    rc: WonFlowRequestContext,
    input: InsertDrainInput,
  ): Promise<PatientDrainSummary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: rc.tenantId },
    });
    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    const insertedAt = input.insertedAt ? new Date(input.insertedAt) : new Date();

    const drain = await database.patientDrain.create({
      data: {
        tenantId: rc.tenantId,
        patientId: patient.id,
        label: input.label.trim(),
        site: input.site.trim(),
        insertedAt,
        insertedByMembershipId: toUuid(rc.membershipId),
        notes: input.notes,
        isActive: true,
      },
      include: {
        insertedBy: true,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.drain.inserted",
        entityType: "patient-drain",
        entityId: drain.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: patient.id,
          label: drain.label,
          site: drain.site,
        },
      },
    });

    return {
      id: drain.id,
      tenantId: drain.tenantId,
      patientId: drain.patientId,
      label: drain.label,
      site: drain.site,
      insertedAt: drain.insertedAt.toISOString(),
      removedAt: null,
      insertedByMembershipId: drain.insertedByMembershipId,
      insertedByClinicianName: drain.insertedBy?.displayName ?? null,
      isActive: drain.isActive,
      notes: drain.notes,
      totalLogsCount: 0,
      createdAt: drain.createdAt.toISOString(),
      updatedAt: drain.updatedAt.toISOString(),
    };
  }

  /**
   * Lists all drains (active and removed) for a patient.
   */
  async listPatientDrains(
    rc: WonFlowRequestContext,
    patientId: string,
  ): Promise<PatientDrainSummary[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const drains = await database.patientDrain.findMany({
      where: {
        tenantId: rc.tenantId,
        patientId,
      },
      orderBy: [{ isActive: "desc" }, { insertedAt: "desc" }],
      include: {
        insertedBy: true,
        logs: {
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 3600 * 1000);

    return drains.map((d) => {
      const logs24h = d.logs.filter((l) => l.recordedAt >= oneDayAgo);
      const volume24h = logs24h.reduce((acc, curr) => acc + curr.volumeMl, 0);
      const lastLog = d.logs[0];

      return {
        id: d.id,
        tenantId: d.tenantId,
        patientId: d.patientId,
        label: d.label,
        site: d.site,
        insertedAt: d.insertedAt.toISOString(),
        removedAt: d.removedAt?.toISOString() ?? null,
        insertedByMembershipId: d.insertedByMembershipId,
        insertedByClinicianName: d.insertedBy?.displayName ?? null,
        isActive: d.isActive,
        notes: d.notes,
        totalLogsCount: d.logs.length,
        last24hVolumeMl: volume24h,
        lastRecordedColour: lastLog?.colour ?? null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Clinician marks a drain as removed.
   */
  async removeDrain(
    rc: WonFlowRequestContext,
    patientId: string,
    drainId: string,
    input: RemoveDrainInput,
  ): Promise<PatientDrainSummary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const drain = await database.patientDrain.findFirst({
      where: {
        id: drainId,
        patientId,
        tenantId: rc.tenantId,
      },
      include: {
        insertedBy: true,
      },
    });

    if (!drain) {
      throw new WonFlowApiError(404, "drain-not-found", "Drain not found.");
    }

    const removedAt = input.removedAt ? new Date(input.removedAt) : new Date();

    const updated = await database.patientDrain.update({
      where: { id: drain.id },
      data: {
        isActive: false,
        removedAt,
        notes: input.notes ? `${drain.notes ? drain.notes + "\n" : ""}${input.notes}` : drain.notes,
      },
      include: {
        insertedBy: true,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.drain.removed",
        entityType: "patient-drain",
        entityId: drain.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId,
          drainId,
          removedAt: removedAt.toISOString(),
        },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      patientId: updated.patientId,
      label: updated.label,
      site: updated.site,
      insertedAt: updated.insertedAt.toISOString(),
      removedAt: updated.removedAt?.toISOString() ?? null,
      insertedByMembershipId: updated.insertedByMembershipId,
      insertedByClinicianName: updated.insertedBy?.displayName ?? null,
      isActive: updated.isActive,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Records a drain output log (volume, colour, character, amylase, photo).
   * Automatically evaluates clinical alert rules:
   * 1. Output > 200mL on POD 5+
   * 2. ISGPS pancreatic fistula definition: amylase > 3x serum upper limit (> 300 U/L)
   * 3. Sudden colour change to RED (hemorrhage) or BILIOUS / GREEN (bile leak).
   */
  async recordDrainLog(
    rc: WonFlowRequestContext,
    input: RecordDrainLogInput,
  ): Promise<DrainLogSummary> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const drain = await database.patientDrain.findFirst({
      where: {
        id: input.drainId,
        tenantId: rc.tenantId,
      },
      include: {
        logs: {
          orderBy: { recordedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!drain) {
      throw new WonFlowApiError(404, "drain-not-found", "Drain record not found.");
    }

    if (!drain.isActive) {
      throw new WonFlowApiError(400, "drain-inactive", "Cannot log output for an inactive or removed drain.");
    }

    const isClinician = rc.workspace === "DOCTOR" || rc.workspace === "STAFF";
    const source = isClinician ? "STAFF" : rc.workspace === "CAREGIVER" ? "CAREGIVER" : "PATIENT";
    const status = isClinician ? "FINAL" : "PRELIMINARY";

    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();

    const log = await database.drainLog.create({
      data: {
        tenantId: rc.tenantId,
        patientId: drain.patientId,
        drainId: drain.id,
        recordedAt,
        deviceRecordedAt: input.deviceRecordedAt ? new Date(input.deviceRecordedAt) : null,
        volumeMl: input.volumeMl,
        colour: input.colour,
        colourNote: input.colourNote,
        character: input.character,
        amylaseValue: input.amylaseValue !== undefined && input.amylaseValue !== null ? input.amylaseValue : null,
        amylaseUnit: input.amylaseUnit || (input.amylaseValue ? "U/L" : null),
        amylaseSource: input.amylaseSource,
        photoObjectKey: input.photoObjectKey,
        notes: input.notes,
        source,
        status,
      },
    });

    // Evaluate Clinical Alerts
    await this.evaluateDrainAlertRules(rc, drain, log);

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.drain.log_recorded",
        entityType: "drain-log",
        entityId: log.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId: drain.patientId,
          drainId: drain.id,
          volumeMl: log.volumeMl,
          colour: log.colour,
          character: log.character,
          amylaseValue: log.amylaseValue ? Number(log.amylaseValue) : null,
        },
      },
    });

    return {
      id: log.id,
      tenantId: log.tenantId,
      patientId: log.patientId,
      drainId: log.drainId,
      recordedAt: log.recordedAt.toISOString(),
      deviceRecordedAt: log.deviceRecordedAt?.toISOString() ?? null,
      volumeMl: log.volumeMl,
      colour: log.colour,
      colourNote: log.colourNote,
      character: log.character,
      amylaseValue: log.amylaseValue !== null ? Number(log.amylaseValue) : null,
      amylaseUnit: log.amylaseUnit,
      amylaseSource: log.amylaseSource,
      photoObjectKey: log.photoObjectKey,
      notes: log.notes,
      source: log.source,
      status: log.status,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  }

  /**
   * Internal alert rule evaluator for surgical drain output.
   */
  private async evaluateDrainAlertRules(
    rc: WonFlowRequestContext,
    drain: { id: string; patientId: string; label: string; insertedAt: Date },
    currentLog: {
      id: string;
      volumeMl: number;
      colour: string;
      character: string | null;
      amylaseValue: unknown;
      recordedAt: Date;
    },
  ) {
    if (!rc.tenantId) return;

    // Find active CarePlan for patient if one exists
    const activeCarePlan = await database.carePlan.findFirst({
      where: {
        tenantId: rc.tenantId,
        patientId: drain.patientId,
        status: "ACTIVE",
      },
    });

    if (!activeCarePlan) return;

    const daysSinceInsertion = Math.floor(
      (currentLog.recordedAt.getTime() - drain.insertedAt.getTime()) / (86_400 * 1000),
    );

    // Rule 1: High daily output > 200 mL on POD 5+
    if (daysSinceInsertion >= 5 && currentLog.volumeMl > 200) {
      await database.carePlanAlert.create({
        data: {
          tenantId: rc.tenantId,
          carePlanId: activeCarePlan.id,
          patientId: drain.patientId,
          severity: "HIGH",
          title: `High Drain Output on POD ${daysSinceInsertion}: ${drain.label}`,
          message: `${drain.label} recorded ${currentLog.volumeMl} mL output on post-operative day ${daysSinceInsertion} (>200 mL threshold). Assess for ongoing fluid accumulation or leak.`,
        },
      });
    }

    // Rule 2: ISGPS Pancreatic Fistula definition: amylase > 300 U/L (>3x serum upper limit)
    const amylaseNum = currentLog.amylaseValue ? Number(currentLog.amylaseValue) : 0;
    if (amylaseNum > 300) {
      await database.carePlanAlert.create({
        data: {
          tenantId: rc.tenantId,
          carePlanId: activeCarePlan.id,
          patientId: drain.patientId,
          severity: "CRITICAL",
          title: `ISGPS Pancreatic Fistula Alert: ${drain.label}`,
          message: `Drain amylase is ${amylaseNum} U/L (>3x serum normal) from ${drain.label}. Meets International Study Group of Pancreatic Surgery (ISGPS) diagnostic criteria for postoperative pancreatic fistula (POPF).`,
        },
      });
    }

    // Rule 3: Sudden color change to RED (hemorrhage) or GREEN / BILIOUS (bile leak)
    if (currentLog.colour === "RED" || currentLog.character === "SEROSANGUINOUS" && currentLog.volumeMl > 150) {
      await database.carePlanAlert.create({
        data: {
          tenantId: rc.tenantId,
          carePlanId: activeCarePlan.id,
          patientId: drain.patientId,
          severity: "HIGH",
          title: `Hemorrhagic Drain Output: ${drain.label}`,
          message: `${drain.label} logged bright red / bloody fluid (${currentLog.volumeMl} mL). Monitor vitals closely and check serial hematocrit.`,
        },
      });
    }

    if (currentLog.colour === "GREEN" || currentLog.character === "BILIOUS") {
      await database.carePlanAlert.create({
        data: {
          tenantId: rc.tenantId,
          carePlanId: activeCarePlan.id,
          patientId: drain.patientId,
          severity: "HIGH",
          title: `Bilious Drain Output Detected: ${drain.label}`,
          message: `${drain.label} logged bilious / green fluid. Assess for biliary-enteric anastomotic leak or cystic duct disruption.`,
        },
      });
    }
  }

  /**
   * Retrieves 24h volume aggregation, colour progression, and amylase markers for a specific drain.
   */
  async getDrainTrend(
    rc: WonFlowRequestContext,
    patientId: string,
    drainId: string,
  ): Promise<DrainTrendSeries> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const drain = await database.patientDrain.findFirst({
      where: {
        id: drainId,
        patientId,
        tenantId: rc.tenantId,
      },
      include: {
        insertedBy: true,
        logs: {
          orderBy: { recordedAt: "asc" },
        },
      },
    });

    if (!drain) {
      throw new WonFlowApiError(404, "drain-not-found", "Drain not found.");
    }

    // Group logs by Day (YYYY-MM-DD)
    const dayMap = new Map<string, typeof drain.logs>();
    for (const log of drain.logs) {
      const dayKey = log.recordedAt.toISOString().split("T")[0]!;
      const list = dayMap.get(dayKey) ?? [];
      list.push(log);
      dayMap.set(dayKey, list);
    }

    const dailyPoints: DrainDailyTrendPoint[] = [];
    let totalCumulativeVolumeMl = 0;
    let hasFistulaAlert = false;
    let hasHighVolumeAlert = false;
    let hasBileLeakAlert = false;

    for (const [date, logs] of dayMap.entries()) {
      const totalVolumeMl = logs.reduce((acc, curr) => acc + curr.volumeMl, 0);
      totalCumulativeVolumeMl += totalVolumeMl;

      const latestLog = logs[logs.length - 1]!;
      const maxAmylase = logs.reduce<number | null>((acc, curr) => {
        if (!curr.amylaseValue) return acc;
        const val = Number(curr.amylaseValue);
        return acc === null ? val : Math.max(acc, val);
      }, null);

      if (maxAmylase && maxAmylase > 300) {
        hasFistulaAlert = true;
      }
      if (totalVolumeMl > 200) {
        hasHighVolumeAlert = true;
      }
      if (logs.some((l) => l.colour === "GREEN" || l.character === "BILIOUS")) {
        hasBileLeakAlert = true;
      }

      dailyPoints.push({
        date,
        totalVolumeMl,
        latestColour: latestLog.colour,
        latestCharacter: latestLog.character,
        maxAmylaseValue: maxAmylase,
        logCount: logs.length,
      });
    }

    const drainSummary: PatientDrainSummary = {
      id: drain.id,
      tenantId: drain.tenantId,
      patientId: drain.patientId,
      label: drain.label,
      site: drain.site,
      insertedAt: drain.insertedAt.toISOString(),
      removedAt: drain.removedAt?.toISOString() ?? null,
      insertedByMembershipId: drain.insertedByMembershipId,
      insertedByClinicianName: drain.insertedBy?.displayName ?? null,
      isActive: drain.isActive,
      notes: drain.notes,
      totalLogsCount: drain.logs.length,
      createdAt: drain.createdAt.toISOString(),
      updatedAt: drain.updatedAt.toISOString(),
    };

    return {
      drain: drainSummary,
      dailyPoints,
      totalCumulativeVolumeMl,
      hasFistulaAlert,
      hasHighVolumeAlert,
      hasBileLeakAlert,
    };
  }

  /**
   * Retrieves multi-drain trend series for clinician stacked view.
   */
  async getMultiDrainTrends(
    rc: WonFlowRequestContext,
    patientId: string,
  ): Promise<DrainTrendSeries[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const drains = await database.patientDrain.findMany({
      where: {
        tenantId: rc.tenantId,
        patientId,
      },
      orderBy: { insertedAt: "asc" },
    });

    const seriesList: DrainTrendSeries[] = [];
    for (const d of drains) {
      const trend = await this.getDrainTrend(rc, patientId, d.id);
      seriesList.push(trend);
    }

    return seriesList;
  }
}

export const drainService = new DrainService();
