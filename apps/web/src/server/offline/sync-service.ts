import { database } from "@wonflow/database";
import { WonFlowApiError } from "@/server/http/route-handler";
import type {
  BatchSyncItemResult,
  BatchSyncRequest,
  BatchSyncResponse,
  DrainCharacter,
  DrainColour,
  OfflineOutboxItem,
  SymptomSeverityLevel,
  WonFlowRequestContext,
} from "@wonflow/contracts";

import { ObservationService } from "../clinical/observation-service";
import { DrainService } from "../clinical/drain-service";
import { SymptomService } from "../clinical/symptom-service";
import { MedicationAdherenceService } from "../clinical/medication-adherence-service";
import { CarePlanService } from "../clinical/care-plan-service";
import { EducationService } from "../clinical/education-service";

const observationService = new ObservationService();
const drainService = new DrainService();
const symptomService = new SymptomService();
const medicationAdherenceService = new MedicationAdherenceService();
const carePlanService = new CarePlanService();
const educationService = new EducationService();

function toUuid(val: string | null | undefined): string | null {
  if (!val) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  return isUuid ? val : null;
}

export class SyncService {
  /**
   * Processes a batch of offline-recorded clinical entries submitted from the patient client outbox.
   * Enforces:
   * 1. Replay ordering: items are ordered by deviceRecordedAt chronologically.
   * 2. Idempotency: exact item IDs are checked against IdempotencyRecord.
   * 3. Non-destructive conflict handling: patient offline timestamps are faithfully preserved.
   */
  async processBatchSync(
    rc: WonFlowRequestContext,
    input: BatchSyncRequest,
  ): Promise<BatchSyncResponse> {
    if (!rc.tenantId) {
      throw new WonFlowApiError(400, "tenant-required", "Tenant ID is required.");
    }

    if (!input.items || !Array.isArray(input.items)) {
      throw new WonFlowApiError(400, "invalid-payload", "Items array is required.");
    }

    // Resolve patient context
    let patientId: string | null = null;
    const idToMatch = rc.identityId || rc.userId;
    if (idToMatch) {
      const access = await database.patientAccess.findFirst({
        where: {
          identityId: idToMatch,
          isActive: true,
          patient: { tenantId: rc.tenantId },
        },
      });
      if (access) {
        patientId = access.patientId;
      }
    }

    // Chronologically sort incoming items by deviceRecordedAt
    const sortedItems = [...input.items].sort((a, b) => {
      const timeA = new Date(a.deviceRecordedAt || a.createdAt).getTime();
      const timeB = new Date(b.deviceRecordedAt || b.createdAt).getTime();
      return timeA - timeB;
    });

    const results: BatchSyncItemResult[] = [];
    let syncedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    for (const item of sortedItems) {
      const operationKey = `offline.sync.${item.type}`;

      try {
        // 1. Idempotency Check
        const existingRecord = await database.idempotencyRecord.findUnique({
          where: {
            tenantId_key_operation: {
              tenantId: rc.tenantId,
              key: item.id,
              operation: operationKey,
            },
          },
        });

        if (existingRecord) {
          const payload = existingRecord.responsePayload as { entityId?: string } | null;
          results.push({
            id: item.id,
            type: item.type,
            status: "DUPLICATE_IGNORED",
            entityId: payload?.entityId,
            deviceRecordedAt: item.deviceRecordedAt,
            message: "Item already synchronized and verified.",
          });
          duplicateCount++;
          continue;
        }

        // 2. Route by type
        let entityId: string | undefined;

        switch (item.type) {
          case "VITAL": {
            const payload = item.payload as {
              patientId?: string;
              code: string;
              display: string;
              valueNumber?: number;
              valueText?: string;
              unit?: string;
              observedAt?: string;
              carePlanTaskId?: string;
            };

            const targetPatientId = payload.patientId || patientId;
            if (!targetPatientId) {
              throw new Error("Patient ID required for vital logging.");
            }

            const obs = await observationService.recordObservation(rc, {
              patientId: targetPatientId,
              code: payload.code,
              display: payload.display,
              valueNumber: payload.valueNumber,
              valueText: payload.valueText,
              unit: payload.unit,
              observedAt: payload.observedAt || item.deviceRecordedAt,
              deviceRecordedAt: item.deviceRecordedAt,
              carePlanTaskId: payload.carePlanTaskId,
              source: "PATIENT",
            });
            entityId = obs.id;
            break;
          }

          case "DRAIN": {
            const payload = item.payload as {
              drainId: string;
              volumeMl: number;
              colour: DrainColour;
              colourNote?: string;
              character?: DrainCharacter;
              amylaseValue?: number;
              amylaseUnit?: string;
              amylaseSource?: "PATIENT_REPORTED" | "LAB_CONFIRMED";
              photoObjectKey?: string;
              notes?: string;
              recordedAt?: string;
            };

            const log = await drainService.recordDrainLog(rc, {
              ...payload,
              recordedAt: payload.recordedAt || item.deviceRecordedAt,
              deviceRecordedAt: item.deviceRecordedAt,
            });
            entityId = log.id;
            break;
          }

          case "SYMPTOM": {
            const payload = item.payload as {
              patientId?: string;
              symptomCode: string;
              symptomName?: string;
              severityScore: number;
              severityLabel?: SymptomSeverityLevel;
              freeText?: string;
              photoData?: string;
              carePlanTaskId?: string;
            };

            const targetPatientId = payload.patientId || patientId;
            const log = await symptomService.recordSymptomLog(rc, {
              ...payload,
              patientId: targetPatientId || undefined,
              deviceRecordedAt: item.deviceRecordedAt,
            });
            entityId = log.id;
            break;
          }

          case "MEDICATION_DOSE": {
            const payload = item.payload as {
              taskId?: string;
              scheduleId?: string;
              status?: "COMPLETED" | "TAKEN" | "SKIPPED";
              skipReason?: string;
            };

            const targetTaskId = payload.taskId || payload.scheduleId;
            if (!targetTaskId) {
              throw new Error("Task ID required for medication dose recording.");
            }

            const targetTime = item.deviceRecordedAt ? new Date(item.deviceRecordedAt) : new Date();
            if (payload.status === "SKIPPED") {
              const dose = await medicationAdherenceService.recordDoseSkipped(
                rc,
                targetTaskId,
                payload.skipReason || "Skipped offline",
              );
              entityId = dose.id;
            } else {
              const dose = await medicationAdherenceService.recordDoseTaken(
                rc,
                targetTaskId,
                targetTime,
              );
              entityId = dose.id;
            }
            break;
          }

          case "CARE_PLAN_TASK": {
            const payload = item.payload as {
              taskId: string;
              notes?: string;
              resultData?: Record<string, unknown>;
            };

            const task = await carePlanService.completeTask(rc, payload.taskId, {
              resultData: payload.notes ? { notes: payload.notes } : payload.resultData,
            });
            entityId = task.id;
            break;
          }


          case "EDUCATION_COMPLETION": {
            const payload = item.payload as {
              assignmentId: string;
              watchedSeconds: number;
              selectedAnswers?: Record<string, number>;
            };

            const comp = await educationService.completeAssignment(rc, payload);
            entityId = comp.id;
            break;
          }

          default:
            throw new Error(`Unsupported sync item type: ${String((item as OfflineOutboxItem).type)}`);
        }

        // 3. Persist Idempotency Record (30 days TTL)
        await database.idempotencyRecord.create({
          data: {
            tenantId: rc.tenantId,
            key: item.id,
            operation: operationKey,
            responsePayload: { entityId, status: "PROCESSED" },
            expiresAt: new Date(Date.now() + 30 * 86_400_000),
          },
        });

        results.push({
          id: item.id,
          type: item.type,
          status: "PROCESSED",
          entityId,
          deviceRecordedAt: item.deviceRecordedAt,
          message: "Successfully synchronized and recorded.",
        });
        syncedCount++;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Sync processing failure";
        results.push({
          id: item.id,
          type: item.type,
          status: "REJECTED",
          deviceRecordedAt: item.deviceRecordedAt,
          message: errorMsg,
        });
        rejectedCount++;
      }
    }

    // Audit the batch sync
    if (syncedCount > 0 || duplicateCount > 0) {
      await database.auditEvent.create({
        data: {
          tenantId: rc.tenantId,
          branchId: toUuid(rc.branchId),
          actorMembershipId: toUuid(rc.membershipId),
          sessionId: toUuid(rc.sessionId),
          requestId: rc.requestId,
          action: "patient.offline_sync.processed",
          entityType: "offline-sync",
          entityId: input.items[0]?.id || rc.requestId,
          severity: "INFORMATION",
          sourceApplication: rc.sourceApplication || "web",
          metadata: {
            syncedCount,
            duplicateCount,
            rejectedCount,
            totalItems: input.items.length,
          },
        },
      });
    }

    return {
      syncedCount,
      duplicateCount,
      rejectedCount,
      results,
      serverTime: new Date().toISOString(),
    };
  }
}

export const syncService = new SyncService();
