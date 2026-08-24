import { database } from "@wonflow/database";

import type {
  AlertComparator,
  AlertMetricType,
  AlertSeverity,
} from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext } from "@wonflow/contracts";
import type {
  CreateAlertRuleInput,
  SetPatientAlertRuleOverrideInput,
  UpdateAlertRuleInput,
} from "@wonflow/contracts";
import { WonFlowApiError } from "@/server/http/route-handler";
import { AlertEscalationService } from "./alert-escalation-service";

export interface EvaluateMetricInput {
  tenantId: string;
  patientId: string;
  metricType: AlertMetricType;
  metricCode: string;
  metricValue: string | number;
  sourceRecordType: string;
  sourceRecordId?: string;
  deviceRecordedAt?: Date | null;
  patientCategory?: string;
}

export class AlertEvaluationService {
  private escalationService = new AlertEscalationService();

  /**
   * Evaluates incoming clinical data against tenant rules and patient-specific overrides.
   * If a threshold is breached, creates an AlertEvent (deduplicated) and triggers escalation.
   */
  async evaluateMetric(input: EvaluateMetricInput) {
    const {
      tenantId,
      patientId,
      metricType,
      metricCode,
      metricValue,
      sourceRecordType,
      sourceRecordId,
      deviceRecordedAt,
    } = input;

    // 1. Fetch active rules matching this metricType and metricCode
    const rules = await database.alertRule.findMany({
      where: {
        tenantId,
        metricType,
        metricCode,
        isActive: true,
      },
    });

    if (rules.length === 0) {
      return [];
    }

    // 2. Fetch patient-specific overrides
    const patientOverrides = await database.patientAlertRule.findMany({
      where: {
        tenantId,
        patientId,
        ruleId: { in: rules.map((r) => r.id) },
      },
    });
    const overrideMap = new Map(patientOverrides.map((o) => [o.ruleId, o]));

    const triggeredEvents = [];

    for (const rule of rules) {
      const override = overrideMap.get(rule.id);
      if (override?.isDisabled) {
        continue; // Rule disabled for this patient
      }

      const effectiveThreshold = override?.overrideThresholdValue || rule.thresholdValue;
      const effectiveSeverity = (override?.overrideSeverity || rule.severity) as AlertSeverity;

      const isBreached = this.evaluateComparator(
        rule.comparator,
        metricValue,
        effectiveThreshold,
        rule.thresholdSecondary,
      );

      if (isBreached) {
        // 3. Deduplicate: check if an OPEN or ACKNOWLEDGED alert already exists
        const windowHours = rule.windowHours || 12;
        const cutoffTime = new Date(Date.now() - windowHours * 60 * 60 * 1000);

        const existingOpenAlert = await database.alertEvent.findFirst({
          where: {
            tenantId,
            patientId,
            ruleId: rule.id,
            status: { in: ["OPEN", "ACKNOWLEDGED"] },
            triggeredAt: { gte: cutoffTime },
          },
        });

        if (existingOpenAlert) {
          // Alert already open for this condition within deduplication window
          continue;
        }

        // 4. Create AlertEvent
        const title = `${rule.name}: ${metricCode} (${metricValue})`;
        const description = rule.description || `Threshold ${rule.comparator} ${effectiveThreshold} breached with value ${metricValue}`;

        const alertEvent = await database.alertEvent.create({
          data: {
            tenantId,
            patientId,
            ruleId: rule.id,
            title,
            description,
            metricType,
            metricCode,
            metricValue: String(metricValue),
            sourceRecordType,
            sourceRecordId: sourceRecordId || null,
            severity: effectiveSeverity,
            status: "OPEN",
            deviceRecordedAt: deviceRecordedAt || null,
            triggeredAt: new Date(),
          },
        });

        // 5. Trigger initial escalation step
        await this.escalationService.scheduleInitialEscalation(alertEvent.id, tenantId, effectiveSeverity);

        triggeredEvents.push(alertEvent);
      }
    }

    return triggeredEvents;
  }

  /**
   * Helper comparator logic
   */
  evaluateComparator(
    comparator: AlertComparator,
    actual: string | number,
    threshold: string,
    _thresholdSecondary?: string | null,
  ): boolean {

    const numActual = typeof actual === "number" ? actual : parseFloat(actual);
    const numThreshold = parseFloat(threshold);

    switch (comparator) {
      case "GT":
        return !isNaN(numActual) && !isNaN(numThreshold) && numActual > numThreshold;
      case "GTE":
        return !isNaN(numActual) && !isNaN(numThreshold) && numActual >= numThreshold;
      case "LT":
        return !isNaN(numActual) && !isNaN(numThreshold) && numActual < numThreshold;
      case "LTE":
        return !isNaN(numActual) && !isNaN(numThreshold) && numActual <= numThreshold;
      case "EQ":
        return String(actual).trim().toUpperCase() === threshold.trim().toUpperCase();
      case "CHANGE_TO": {
        // e.g. color in list "DARK_BROWN, GREEN, MILKY, BILIOUS"
        const allowedTargets = threshold
          .split(",")
          .map((s) => s.trim().toUpperCase());
        return allowedTargets.includes(String(actual).trim().toUpperCase());
      }
      case "MISSED_COUNT":
        return !isNaN(numActual) && !isNaN(numThreshold) && numActual >= numThreshold;
      case "CHANGE_BY":
        if (isNaN(numActual) || isNaN(numThreshold)) return false;
        return Math.abs(numActual) >= Math.abs(numThreshold);
      default:
        return false;
    }
  }

  /**
   * Seed standard starter HPB alert rules for a tenant
   */
  async seedDefaultTenantRules(tenantId: string, createdByMembershipId?: string) {
    const defaultRules: CreateAlertRuleInput[] = [
      {
        name: "Elevated Drain Amylase (Pancreatic Fistula Risk)",
        description: "Drain fluid amylase greater than 3x upper normal serum limit indicates potential pancreatic leak (POPF).",
        metricType: "DRAIN",
        metricCode: "amylase",
        comparator: "GT",
        thresholdValue: "300",
        severity: "CRITICAL",
        windowHours: 24,
      },
      {
        name: "High Volume Drain Output",
        description: "Drain fluid output exceeding 500mL within 24 hours.",
        metricType: "DRAIN",
        metricCode: "volume",
        comparator: "GT",
        thresholdValue: "500",
        severity: "WARNING",
        windowHours: 24,
      },
      {
        name: "Abnormal Drain Fluid Colour",
        description: "Sudden appearance of dark brown, green, or milky chylous fluid in abdominal drain.",
        metricType: "DRAIN",
        metricCode: "colour",
        comparator: "CHANGE_TO",
        thresholdValue: "DARK_BROWN,GREEN,MILKY,BILIOUS",
        severity: "CRITICAL",
        windowHours: 12,
      },
      {
        name: "Post-Operative Pyrexia / Fever",
        description: "Core body temperature exceeding 38.0°C (100.4°F).",
        metricType: "OBSERVATION",
        metricCode: "temperature",
        comparator: "GT",
        thresholdValue: "38.0",
        severity: "CRITICAL",
        windowHours: 8,
      },
      {
        name: "Hypoxemia (Low SpO2)",
        description: "Peripheral oxygen saturation falling below 92% on room air.",
        metricType: "OBSERVATION",
        metricCode: "oxygen_saturation",
        comparator: "LT",
        thresholdValue: "92",
        severity: "CRITICAL",
        windowHours: 4,
      },
      {
        name: "Severe Abdominal Pain",
        description: "Pain visual analogue score reported at 7 or higher post-resection.",
        metricType: "SYMPTOM",
        metricCode: "abdominal_pain",
        comparator: "GTE",
        thresholdValue: "7",
        severity: "CRITICAL",
        windowHours: 12,
      },
      {
        name: "Medication Non-Adherence",
        description: "Patient or caregiver has missed 2 or more critical medication doses within 24 hours.",
        metricType: "TASK_ADHERENCE",
        metricCode: "medication_missed",
        comparator: "MISSED_COUNT",
        thresholdValue: "2",
        severity: "WARNING",
        windowHours: 24,
      },
      {
        name: "Rapid Post-Op Weight Loss",
        description: "Weight loss exceeding 3.0 kg over 72 hours signalling fluid depletion or malabsorption.",
        metricType: "WEIGHT_CHANGE",
        metricCode: "weight_loss_kg",
        comparator: "GT",
        thresholdValue: "3.0",
        severity: "WARNING",
        windowHours: 72,
      },
    ];

    const createdRules = [];
    for (const rule of defaultRules) {
      const existing = await database.alertRule.findFirst({
        where: {
          tenantId,
          metricType: rule.metricType as AlertMetricType,
          metricCode: rule.metricCode,
        },
      });

      if (!existing) {
        const created = await database.alertRule.create({
          data: {
            tenantId,
            name: rule.name,
            description: rule.description || null,
            metricType: rule.metricType as AlertMetricType,
            metricCode: rule.metricCode,
            comparator: rule.comparator as AlertComparator,
            thresholdValue: rule.thresholdValue,
            thresholdSecondary: rule.thresholdSecondary || null,
            windowHours: rule.windowHours || null,
            severity: (rule.severity || "WARNING") as AlertSeverity,
            isActive: rule.isActive ?? true,
            createdByMembershipId: createdByMembershipId || null,
          },
        });
        createdRules.push(created);
      }
    }

    return createdRules;
  }

  // --- Rule Administration APIs ---

  async listRules(requestContext: WonFlowRequestContext) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.read");

    return database.alertRule.findMany({
      where: { tenantId: context.tenantId },
      orderBy: [{ metricType: "asc" }, { severity: "desc" }],
    });
  }

  async createRule(requestContext: WonFlowRequestContext, input: CreateAlertRuleInput) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.manage");

    if (!input.name?.trim()) throw new WonFlowApiError(400, "missing-name", "Rule name is required.");
    if (!input.metricType) throw new WonFlowApiError(400, "missing-metric-type", "Metric type is required.");
    if (!input.metricCode?.trim()) throw new WonFlowApiError(400, "missing-metric-code", "Metric code is required.");
    if (!input.thresholdValue?.trim()) throw new WonFlowApiError(400, "missing-threshold", "Threshold value is required.");

    return database.alertRule.create({
      data: {
        tenantId: context.tenantId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        patientCategory: input.patientCategory?.trim() || null,
        metricType: input.metricType as AlertMetricType,
        metricCode: input.metricCode.trim(),
        comparator: input.comparator as AlertComparator,
        thresholdValue: input.thresholdValue.trim(),
        thresholdSecondary: input.thresholdSecondary?.trim() || null,
        windowHours: input.windowHours || null,
        severity: (input.severity || "WARNING") as AlertSeverity,
        isActive: input.isActive ?? true,
        createdByMembershipId: context.membershipId || null,
      },
    });
  }

  async updateRule(requestContext: WonFlowRequestContext, id: string, input: UpdateAlertRuleInput) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.manage");

    const rule = await database.alertRule.findFirst({
      where: { id, tenantId: context.tenantId },
    });
    if (!rule) throw new WonFlowApiError(404, "rule-not-found", "Alert rule not found.");

    return database.alertRule.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name.trim() : undefined,
        description: input.description !== undefined ? input.description?.trim() || null : undefined,
        patientCategory: input.patientCategory !== undefined ? input.patientCategory?.trim() || null : undefined,
        metricType: input.metricType ? (input.metricType as AlertMetricType) : undefined,
        metricCode: input.metricCode !== undefined ? input.metricCode.trim() : undefined,
        comparator: input.comparator ? (input.comparator as AlertComparator) : undefined,
        thresholdValue: input.thresholdValue !== undefined ? input.thresholdValue.trim() : undefined,
        thresholdSecondary: input.thresholdSecondary !== undefined ? input.thresholdSecondary?.trim() || null : undefined,
        windowHours: input.windowHours !== undefined ? input.windowHours : undefined,
        severity: input.severity ? (input.severity as AlertSeverity) : undefined,
        isActive: input.isActive !== undefined ? input.isActive : undefined,
      },
    });
  }

  async setPatientOverride(
    requestContext: WonFlowRequestContext,
    input: SetPatientAlertRuleOverrideInput,
  ) {
    const context = requireTenantContext(requestContext);
    requirePermission(context, "careplans.manage");

    const rule = await database.alertRule.findFirst({
      where: { id: input.ruleId, tenantId: context.tenantId },
    });
    if (!rule) throw new WonFlowApiError(404, "rule-not-found", "Alert rule not found.");

    const existing = await database.patientAlertRule.findFirst({
      where: {
        tenantId: context.tenantId,
        patientId: input.patientId,
        ruleId: input.ruleId,
      },
    });

    if (existing) {
      return database.patientAlertRule.update({
        where: { id: existing.id },
        data: {
          overrideThresholdValue: input.overrideThresholdValue !== undefined ? input.overrideThresholdValue : existing.overrideThresholdValue,
          overrideSeverity: input.overrideSeverity !== undefined ? (input.overrideSeverity as AlertSeverity) : existing.overrideSeverity,
          isDisabled: input.isDisabled !== undefined ? input.isDisabled : existing.isDisabled,
          notes: input.notes !== undefined ? input.notes : existing.notes,
        },
      });
    }

    return database.patientAlertRule.create({
      data: {
        tenantId: context.tenantId,
        patientId: input.patientId,
        ruleId: input.ruleId,
        overrideThresholdValue: input.overrideThresholdValue || null,
        overrideSeverity: (input.overrideSeverity as AlertSeverity) || null,
        isDisabled: input.isDisabled || false,
        notes: input.notes || null,
      },
    });
  }
}
