import { database, type ObservationSource, type ObservationStatus } from "@wonflow/database";
import {
  requirePermission,
  type WonFlowRequestContext,
  type ClinicalObservationSummary,
  type ObservationTrendSeries,
  SUPPORTED_VITALS,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { AlertEvaluationService } from "./alert-evaluation-service";


export interface RecordObservationInput {
  patientId: string;
  encounterId?: string | null;
  carePlanTaskId?: string | null;
  source?: ObservationSource;
  code: string;
  display: string;
  valueNumber?: number | null;
  valueText?: string | null;
  unit?: string | null;
  observedAt: Date | string;
  deviceRecordedAt?: Date | string | null;
  status?: ObservationStatus;
}

export class ObservationService {
  /**
   * Records a clinical observation.
   * Enforces that patient- or caregiver-sourced observations are always created
   * with status PRELIMINARY and require tenantId and patientId.
   */
  async recordObservation(
    rc: WonFlowRequestContext,
    input: RecordObservationInput,
  ) {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required for recording observations.");
    }
    if (!input.patientId) {
      throw new WonFlowApiError(400, "patient-required", "Patient ID is required for recording observations.");
    }

    const patient = await database.patient.findFirst({
      where: { id: input.patientId, tenantId: rc.tenantId },
    });
    if (!patient) {
      throw new WonFlowApiError(404, "patient-not-found", "Patient not found.");
    }

    if (input.encounterId) {
      const encounter = await database.encounter.findFirst({
        where: { id: input.encounterId, tenantId: rc.tenantId, patientId: input.patientId },
      });
      if (!encounter) {
        throw new WonFlowApiError(404, "encounter-not-found", "Encounter not found.");
      }
    }

    const source: ObservationSource = input.source ?? (rc.membershipId ? "STAFF" : "PATIENT");

    // Patient or caregiver entries must be PRELIMINARY upon creation
    const status: ObservationStatus =
      source === "PATIENT" || source === "CAREGIVER"
        ? "PRELIMINARY"
        : (input.status ?? "PRELIMINARY");

    const observation = await database.clinicalObservation.create({
      data: {
        tenantId: rc.tenantId,
        patientId: input.patientId,
        encounterId: input.encounterId ?? null,
        recordedByMembershipId: rc.membershipId ?? null,
        recordedByIdentityId: rc.identityId ?? null,
        carePlanTaskId: input.carePlanTaskId ?? null,
        source,
        code: input.code.trim(),
        display: input.display.trim(),
        valueNumber: input.valueNumber ?? null,
        valueText: input.valueText ?? null,
        unit: input.unit ?? null,
        status,
        observedAt: new Date(input.observedAt),
        deviceRecordedAt: input.deviceRecordedAt ? new Date(input.deviceRecordedAt) : null,
      },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: rc.branchId ?? null,
        actorMembershipId: rc.membershipId ?? null,
        sessionId: rc.sessionId ?? null,
        requestId: rc.requestId,
        action: "clinical.observation.recorded",
        entityType: "clinical-observation",
        entityId: observation.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication,
        metadata: rc.identityId ? { actorIdentityId: rc.identityId } : undefined,
      },
    });

    // Evaluate alert rules for incoming observation
    const alertService = new AlertEvaluationService();
    await alertService
      .evaluateMetric({
        tenantId: rc.tenantId,
        patientId: input.patientId,
        metricType: "OBSERVATION",
        metricCode: input.code.trim(),
        metricValue:
          input.valueNumber !== undefined && input.valueNumber !== null
            ? input.valueNumber
            : input.valueText || "",
        sourceRecordType: "clinical-observation",
        sourceRecordId: observation.id,
        deviceRecordedAt: input.deviceRecordedAt ? new Date(input.deviceRecordedAt) : null,
      })
      .catch((err) => console.error("Alert evaluation failed on observation", err));

    return observation;
  }


  /**
   * Promotes a preliminary observation to FINAL. Only clinicians/staff may confirm an observation.
   */
  async confirmObservation(rc: WonFlowRequestContext, observationId: string) {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }
    requirePermission(rc, "encounters.manage");

    const existing = await database.clinicalObservation.findFirst({
      where: { id: observationId, tenantId: rc.tenantId },
    });
    if (!existing) {
      throw new WonFlowApiError(404, "observation-not-found", "Clinical observation not found.");
    }

    const updated = await database.clinicalObservation.update({
      where: { id: observationId },
      data: { status: "FINAL" },
    });

    await database.auditEvent.create({
      data: {
        tenantId: rc.tenantId,
        branchId: rc.branchId ?? null,
        actorMembershipId: rc.membershipId ?? null,
        sessionId: rc.sessionId ?? null,
        requestId: rc.requestId,
        action: "clinical.observation.confirmed",
        entityType: "clinical-observation",
        entityId: updated.id,
        severity: "INFORMATION",
        sourceApplication: rc.sourceApplication,
      },
    });

    return updated;
  }

  /**
   * Lists observation records for a given patient.
   */
  async listPatientObservations(
    rc: WonFlowRequestContext,
    patientId: string,
    options?: { code?: string; limit?: number },
  ): Promise<ClinicalObservationSummary[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const whereClause: {
      tenantId: string;
      patientId: string;
      code?: string;
    } = {
      tenantId: rc.tenantId,
      patientId,
    };

    if (options?.code) {
      whereClause.code = options.code.trim();
    }

    const observations = await database.clinicalObservation.findMany({
      where: whereClause,
      orderBy: { observedAt: "desc" },
      take: options?.limit ?? 100,
    });

    return observations.map((o) => ({
      id: o.id,
      tenantId: o.tenantId,
      patientId: o.patientId,
      encounterId: o.encounterId,
      recordedByMembershipId: o.recordedByMembershipId,
      recordedByIdentityId: o.recordedByIdentityId,
      carePlanTaskId: o.carePlanTaskId,
      source: o.source,
      code: o.code,
      display: o.display,
      valueNumber: o.valueNumber !== null && o.valueNumber !== undefined ? Number(o.valueNumber) : null,
      valueText: o.valueText,
      unit: o.unit,
      status: o.status,
      observedAt: o.observedAt.toISOString(),
      deviceRecordedAt: o.deviceRecordedAt?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  /**
   * Retrieves observation trends grouped by vital code over a date range.
   */
  async getPatientObservationTrends(
    rc: WonFlowRequestContext,
    patientId: string,
    options?: { codes?: string[]; startDate?: Date; endDate?: Date },
  ): Promise<ObservationTrendSeries[]> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    const start = options?.startDate ?? new Date(Date.now() - 30 * 86_400_000);
    const end = options?.endDate ?? new Date();

    const whereClause: {
      tenantId: string;
      patientId: string;
      observedAt: { gte: Date; lte: Date };
      code?: { in: string[] };
    } = {
      tenantId: rc.tenantId,
      patientId,
      observedAt: { gte: start, lte: end },
    };

    if (options?.codes && options.codes.length > 0) {
      whereClause.code = { in: options.codes };
    }

    const observations = await database.clinicalObservation.findMany({
      where: whereClause,
      orderBy: { observedAt: "asc" },
    });

    // Group by observation code
    const grouped = new Map<string, typeof observations>();
    for (const obs of observations) {
      const list = grouped.get(obs.code) ?? [];
      list.push(obs);
      grouped.set(obs.code, list);
    }

    const seriesList: ObservationTrendSeries[] = [];
    for (const [code, obsList] of grouped.entries()) {
      const def = SUPPORTED_VITALS[code];
      const display = def?.display ?? obsList[0]?.display ?? code;
      const unit = def?.unit ?? obsList[0]?.unit ?? "";

      const points = obsList.map((o) => ({
        id: o.id,
        observedAt: o.observedAt.toISOString(),
        valueNumber: Number(o.valueNumber ?? 0),
        valueText: o.valueText,
        unit: o.unit ?? unit,
        source: o.source,
        status: o.status,
      }));


      const latest = points[points.length - 1] ?? null;

      seriesList.push({
        code,
        display,
        unit,
        definition: def,
        points,
        latestPoint: latest,
      });
    }

    return seriesList;
  }
}

export const observationService = new ObservationService();
