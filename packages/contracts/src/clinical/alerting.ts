export type AlertMetricType =
  | "OBSERVATION"
  | "DRAIN"
  | "SYMPTOM"
  | "TASK_ADHERENCE"
  | "WEIGHT_CHANGE"
  | "LAB_VALUE";

export type AlertComparator =
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "EQ"
  | "CHANGE_BY"
  | "CHANGE_TO"
  | "MISSED_COUNT";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AlertEventStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "EXPIRED";

export type AlertEscalationChannel = "PUSH" | "SMS" | "CALL";

export interface AlertRuleRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  patientCategory: string | null;
  metricType: AlertMetricType;
  metricCode: string;
  comparator: AlertComparator;
  thresholdValue: string;
  thresholdSecondary: string | null;
  windowHours: number | null;
  severity: AlertSeverity;
  isActive: boolean;
  createdByMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  patientCategory?: string;
  metricType: AlertMetricType;
  metricCode: string;
  comparator: AlertComparator;
  thresholdValue: string;
  thresholdSecondary?: string;
  windowHours?: number;
  severity?: AlertSeverity;
  isActive?: boolean;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  patientCategory?: string;
  metricType?: AlertMetricType;
  metricCode?: string;
  comparator?: AlertComparator;
  thresholdValue?: string;
  thresholdSecondary?: string;
  windowHours?: number;
  severity?: AlertSeverity;
  isActive?: boolean;
}

export interface PatientAlertRuleRecord {
  id: string;
  tenantId: string;
  patientId: string;
  ruleId: string;
  ruleName?: string;
  overrideThresholdValue: string | null;
  overrideSeverity: AlertSeverity | null;
  isDisabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetPatientAlertRuleOverrideInput {
  patientId: string;
  ruleId: string;
  overrideThresholdValue?: string;
  overrideSeverity?: AlertSeverity;
  isDisabled?: boolean;
  notes?: string;
}

export interface AlertEscalationRecord {
  id: string;
  tenantId: string;
  alertEventId: string;
  step: number;
  channel: AlertEscalationChannel;
  targetMembershipId: string;
  targetName?: string;
  scheduledFor: string;
  sentAt: string | null;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

export interface AlertEventSummary {
  id: string;
  tenantId: string;
  patientId: string;
  patientName?: string;
  patientNumber?: string;
  ruleId: string | null;
  ruleName?: string;
  title: string;
  description: string | null;
  metricType: AlertMetricType;
  metricCode: string;
  metricValue: string;
  sourceRecordType: string;
  sourceRecordId: string | null;
  severity: AlertSeverity;
  status: AlertEventStatus;
  deviceRecordedAt: string | null;
  triggeredAt: string;
  acknowledgedByMembershipId: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  resolvedByMembershipId: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  escalations?: AlertEscalationRecord[];
}

export interface AlertEventDetail extends AlertEventSummary {
  recentTrends?: Array<{
    observedAt: string;
    value: string | number;
    unit?: string;
  }>;
  activeCarePlanTitle?: string | null;
  patientAllergies?: string[];
}

export interface AcknowledgeAlertEventInput {
  notes?: string;
}

export interface ResolveAlertEventInput {
  resolutionNotes: string;
}

export interface AlertRotaRecord {

  id: string;
  tenantId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  severity: AlertSeverity;
  primaryMembershipId: string;
  primaryName?: string;
  escalationMembershipId: string;
  escalationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRotaInput {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  severity?: AlertSeverity;
  primaryMembershipId: string;
  escalationMembershipId: string;
}

export interface AlertVolumeStats {
  totalOpen: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  acknowledgedCount: number;
  resolvedLast24h: number;
  averageResolutionMinutes: number;
}
