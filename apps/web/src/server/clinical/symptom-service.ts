import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  CombinedRecoveryTimelineItem,
  ObservationSource,
  RecordSymptomLogInput,
  SymptomLogItem,
  SymptomSeverityLevel,
  WonFlowRequestContext,
} from "@wonflow/contracts";
import { DEFAULT_HPB_SYMPTOMS } from "@wonflow/contracts";

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val) ? val : null;
}

function computeSeverityLabel(score: number): SymptomSeverityLevel {
  if (score >= 9) return "VERY_SEVERE";
  if (score >= 7) return "SEVERE";
  if (score >= 4) return "MODERATE";
  return "MILD";
}

export class SymptomService {
  /**
   * Records a patient symptom log.
   */
  async recordSymptomLog(
    rc: WonFlowRequestContext,
    input: RecordSymptomLogInput,
  ): Promise<SymptomLogItem> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    let patientId = input.patientId;
    if (!patientId) {
      const idToMatch = rc.identityId || rc.userId;
      if (!idToMatch) {
        throw new WonFlowApiError(401, "unauthorized", "User identity is required.");
      }

      const access = await database.patientAccess.findFirst({
        where: {
          identityId: idToMatch,
          isActive: true,
          patient: { tenantId: rc.tenantId },
        },
      });

      if (!access) {
        throw new WonFlowApiError(404, "patient-not-found", "No active patient access found.");
      }
      patientId = access.patientId;
    }

    const defaultDef = DEFAULT_HPB_SYMPTOMS.find((s) => s.code === input.symptomCode);
    const symptomName = input.symptomName || defaultDef?.name || input.symptomCode;
    const severityLabel = input.severityLabel || computeSeverityLabel(input.severityScore);

    let source: ObservationSource = "PATIENT";
    if (rc.workspace === "CAREGIVER") {
      source = "CAREGIVER";
    } else if (rc.workspace === "DOCTOR" || rc.workspace === "NURSE") {
      source = "STAFF";
    }

    const created = await database.symptomLog.create({
      data: {
        tenantId: rc.tenantId,
        patientId,
        symptomCode: input.symptomCode,
        symptomName,
        severityScore: input.severityScore,
        severityLabel,
        freeText: input.freeText?.trim() || null,
        photoData: input.photoData || null,
        recordedByIdentityId: toUuid(rc.identityId || rc.userId),
        source,
        carePlanTaskId: input.carePlanTaskId ? toUuid(input.carePlanTaskId) : null,
        deviceRecordedAt: input.deviceRecordedAt ? new Date(input.deviceRecordedAt) : null,
      },
    });

    // If tied to a care plan task, mark the task as completed
    if (input.carePlanTaskId) {
      await database.carePlanTask
        .update({
          where: { id: input.carePlanTaskId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completedByIdentityId: toUuid(rc.identityId || rc.userId),
          },
        })
        .catch(() => {
          // ignore if task not found or already completed
        });
    }

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: toUuid(rc.branchId),
        actorMembershipId: toUuid(rc.membershipId),
        sessionId: toUuid(rc.sessionId),
        requestId: rc.requestId,
        action: "clinical.symptom.recorded",
        entityType: "symptom-log",
        entityId: created.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication || "web",
        metadata: {
          patientId,
          symptomCode: created.symptomCode,
          severityScore: created.severityScore,
          severityLabel: created.severityLabel,
          source: created.source,
        },
      },
    });

    return {
      id: created.id,
      patientId: created.patientId,
      recordedAt: created.recordedAt.toISOString(),
      deviceRecordedAt: created.deviceRecordedAt?.toISOString() ?? null,
      symptomCode: created.symptomCode,
      symptomName: created.symptomName,
      severityScore: created.severityScore,
      severityLabel: created.severityLabel as SymptomSeverityLevel,
      freeText: created.freeText,
      photoDocumentId: created.photoDocumentId,
      photoData: created.photoData,
      recordedByIdentityId: created.recordedByIdentityId,
      source: created.source as ObservationSource,
      carePlanTaskId: created.carePlanTaskId,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves list of symptom logs for a patient.
   */
  async listPatientSymptomLogs(
    rc: WonFlowRequestContext,
    patientId: string,
    limit = 50,
  ): Promise<SymptomLogItem[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const logs = await database.symptomLog.findMany({
      where: {
        tenantId: rc.tenantId,
        patientId,
      },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      patientId: l.patientId,
      recordedAt: l.recordedAt.toISOString(),
      deviceRecordedAt: l.deviceRecordedAt?.toISOString() ?? null,
      symptomCode: l.symptomCode,
      symptomName: l.symptomName,
      severityScore: l.severityScore,
      severityLabel: l.severityLabel as SymptomSeverityLevel,
      freeText: l.freeText,
      photoDocumentId: l.photoDocumentId,
      photoData: l.photoData,
      recordedByIdentityId: l.recordedByIdentityId,
      source: l.source as ObservationSource,
      carePlanTaskId: l.carePlanTaskId,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Merges Vitals, Drain Logs, and Symptoms into a unified clinician recovery timeline.
   */
  async getCombinedRecoveryTimeline(
    rc: WonFlowRequestContext,
    patientId: string,
    limit = 100,
  ): Promise<CombinedRecoveryTimelineItem[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const [observations, drainLogs, symptomLogs] = await Promise.all([
      database.clinicalObservation.findMany({
        where: { tenantId: rc.tenantId, patientId },
        orderBy: { observedAt: "desc" },
        take: limit,
      }),
      database.drainLog.findMany({
        where: { tenantId: rc.tenantId, patientId },
        include: { drain: true },
        orderBy: { recordedAt: "desc" },
        take: limit,
      }),
      database.symptomLog.findMany({
        where: { tenantId: rc.tenantId, patientId },
        orderBy: { recordedAt: "desc" },
        take: limit,
      }),
    ]);

    const timelineItems: CombinedRecoveryTimelineItem[] = [];

    // 1. Observations / Vitals
    for (const obs of observations) {
      let severityLevel: "NORMAL" | "WARNING" | "CRITICAL" | "INFO" = "NORMAL";
      const valNum = obs.valueNumber ? Number(obs.valueNumber) : null;

      if (obs.code === "BODY_TEMPERATURE") {
        if (valNum && valNum >= 38.3) severityLevel = "CRITICAL";
        else if (valNum && valNum >= 37.8) severityLevel = "WARNING";
      } else if (obs.code === "BLOOD_PRESSURE_SYSTOLIC") {
        if (valNum && (valNum > 180 || valNum < 90)) severityLevel = "CRITICAL";
        else if (valNum && (valNum > 140 || valNum < 100)) severityLevel = "WARNING";
      } else if (obs.code === "OXYGEN_SATURATION") {
        if (valNum && valNum < 92) severityLevel = "CRITICAL";
        else if (valNum && valNum < 95) severityLevel = "WARNING";
      }

      timelineItems.push({
        id: `vital-${obs.id}`,
        timestamp: obs.observedAt.toISOString(),
        itemType: "VITAL",
        title: obs.code.replace(/_/g, " "),
        subtitle: obs.status,
        valueDisplay: valNum !== null ? `${valNum} ${obs.unit || ""}` : (obs.valueText || ""),
        severityLevel,

        source: obs.source as ObservationSource,
        details: { code: obs.code, value: valNum, unit: obs.unit },
      });
    }

    // 2. Drain Logs
    for (const d of drainLogs) {
      let severityLevel: "NORMAL" | "WARNING" | "CRITICAL" | "INFO" = "NORMAL";
      const amylase = d.amylaseValue ? Number(d.amylaseValue) : null;

      // ISGPS Pancreatic Fistula alert
      if (amylase !== null && amylase >= 300) {
        severityLevel = "CRITICAL";
      } else if (d.colour === "RED" || d.colour === "GREEN" || d.character === "BILIOUS") {
        severityLevel = "WARNING";
      } else if (d.volumeMl > 300) {
        severityLevel = "WARNING";
      }

      timelineItems.push({
        id: `drain-${d.id}`,
        timestamp: d.recordedAt.toISOString(),
        itemType: "DRAIN",
        title: `${d.drain.label} Output`,
        subtitle: `Colour: ${d.colour.replace(/_/g, " ")} ${d.character ? `(${d.character})` : ""}`,
        valueDisplay: `${d.volumeMl} mL${amylase !== null ? ` • Amylase: ${amylase} ${d.amylaseUnit || "U/L"}` : ""}`,
        severityLevel,
        source: d.source as ObservationSource,
        photoData: d.photoObjectKey,
        details: {
          drainLabel: d.drain.label,
          volumeMl: d.volumeMl,
          colour: d.colour,
          amylaseValue: amylase,
        },
      });
    }

    // 3. Symptom Logs
    for (const sym of symptomLogs) {
      let severityLevel: "NORMAL" | "WARNING" | "CRITICAL" | "INFO" = "NORMAL";
      if (sym.severityScore >= 9 || sym.severityLabel === "VERY_SEVERE") {
        severityLevel = "CRITICAL";
      } else if (sym.severityScore >= 7 || sym.severityLabel === "SEVERE") {
        severityLevel = "WARNING";
      }

      timelineItems.push({
        id: `symptom-${sym.id}`,
        timestamp: sym.recordedAt.toISOString(),
        itemType: "SYMPTOM",
        title: `Symptom: ${sym.symptomName}`,
        subtitle: `Severity: ${sym.severityLabel} (${sym.severityScore}/10)`,
        valueDisplay: sym.freeText || `Score ${sym.severityScore}`,
        severityLevel,
        source: sym.source as ObservationSource,
        photoData: sym.photoData,
        details: {
          symptomCode: sym.symptomCode,
          severityScore: sym.severityScore,
          severityLabel: sym.severityLabel,
          freeText: sym.freeText,
        },
      });
    }

    // Sort chronologically descending
    timelineItems.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return timelineItems.slice(0, limit);
  }
}

export const symptomService = new SymptomService();
