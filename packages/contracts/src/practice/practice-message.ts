/**
 * Patient-to-practice messaging, triage and escalation contracts.
 *
 * Practice messaging forms part of the patient's medical record. It is
 * not an informal chat system.
 *
 * Emergency safety notices, supervision, countersignature and escalation
 * timing are represented explicitly so the mock and future database
 * implementations can share the same behavior.
 */

import type {
  IsoDateTime,
  RecordStatus,
  WonFlowId,
} from "../organization/hierarchy";

import {
  requiresPracticeCountersignature,
} from "./care-team";

import type {
  PracticeRoleCode,
  PracticeTeamMember,
} from "./care-team";

import type {
  PracticeClinicalSignature,
} from "./practice-document";


/**
 * Current responsibility state of a message thread.
 */
export type PracticeMessageThreadStatus =
  | "open"
  | "awaiting-practice"
  | "awaiting-patient"
  | "resolved"
  | "closed";

/**
 * Triage priority assigned to a patient message thread.
 *
 * Messaging must not be presented as an emergency channel. Urgent
 * priority means the practice should review the thread sooner; it does
 * not replace emergency services.
 */
export type PracticeMessagePriority =
  | "routine"
  | "high"
  | "urgent";

/**
 * Organization-owned category available when starting a patient
 * message thread.
 *
 * Category names and codes are tenant configuration data. No clinical
 * or administrative category names are fixed in application code.
 */
export interface PracticeMessageCategoryConfig {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Tenant-controlled stable code.
   *
   * Existing threads retain their category reference if the display
   * name is later changed.
   */
  code: string;

  displayName: string;

  description?: string;

  /**
   * Lower values appear first in patient and practice category lists.
   */
  sortOrder: number;

  status: RecordStatus;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Author represented by a message.
 *
 * Practice staff use their standard PracticeRoleCode. Patient-facing
 * messages identify whether the author is the patient or a linked
 * representative.
 */
export type PracticeMessageAuthorRole =
  | PracticeRoleCode
  | "patient"
  | "patient-representative"
  | "system";

/**
 * Lifecycle of an individual message.
 *
 * A supervised clinical reply remains awaiting-countersignature until
 * an authorized supervisor signs it. sentAt remains undefined until the
 * message is actually sent.
 */
export type PracticeMessageStatus =
  | "draft"
  | "awaiting-countersignature"
  | "approved"
  | "sent"
  | "failed";

/**
 * Derived state of an escalation record.
 *
 * This value is not stored on PracticeMessageEscalation. It is calculated
 * from the escalation timestamps.
 */
export type PracticeMessageEscalationState =
  | "active"
  | "acknowledged"
  | "resolved"
  | "cancelled";

/**
 * Records when one user read an individual message.
 */
export interface PracticeMessageReadReceipt {
  userId: WonFlowId;

  /**
   * Practice team member associated with the user, when the reader is a
   * member of the practice team.
   */
  teamMemberId?: WonFlowId;

  /**
   * Patient account associated with the user, when the reader is a
   * patient or linked representative.
   */
  patientAccountId?: WonFlowId;

  readAt: IsoDateTime;
}

/**
 * One patient-scoped practice message thread.
 *
 * Every thread belongs to exactly one organization and one patient.
 * Moving messages between patients is not supported because the thread
 * forms part of the patient's medical record.
 */
export interface PracticeMessageThread {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId: WonFlowId;

  subject: string;

  /**
   * Organization-owned category selected for this thread.
   */
  categoryId: WonFlowId;

  status: PracticeMessageThreadStatus;

  priority: PracticeMessagePriority;

  /**
   * Team member currently responsible for responding to or triaging the
   * thread.
   */
  assignedTeamMemberId?: WonFlowId;

  assignedAt?: IsoDateTime;

  assignedByTeamMemberId?: WonFlowId;

  /**
   * Timestamp of the newest message in the thread.
   *
   * Escalation deadlines may be derived from this value while the thread
   * is awaiting the practice.
   */
  lastMessageAt: IsoDateTime;

  /**
   * Timestamp of the newest patient or representative message.
   */
  lastPatientMessageAt?: IsoDateTime;

  /**
   * Timestamp of the newest message sent by the practice.
   */
  lastPracticeMessageAt?: IsoDateTime;

  openedByUserId: WonFlowId;

  resolvedByTeamMemberId?: WonFlowId;

  resolvedAt?: IsoDateTime;

  closedByTeamMemberId?: WonFlowId;

  closedAt?: IsoDateTime;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * One message inside a patient-scoped practice thread.
 *
 * attachedDocumentIds reference PracticeDocument records. Message
 * attachments must not contain direct storage URLs or file binaries.
 */
export interface PracticeMessage {
  id: WonFlowId;

  organizationId: WonFlowId;

  /**
   * Repeated from the thread to support safe patient-record queries and
   * tenant-scoped persistence.
   */
  patientId: WonFlowId;

  threadId: WonFlowId;

  authorUserId: WonFlowId;

  authorRole: PracticeMessageAuthorRole;

  /**
   * Practice team member responsible for a staff-authored message.
   *
   * Patient and system messages do not require this field.
   */
  authorTeamMemberId?: WonFlowId;

  /**
   * Patient account responsible for a patient-facing message.
   */
  authorPatientAccountId?: WonFlowId;

  body: string;

  attachedDocumentIds: WonFlowId[];

  status: PracticeMessageStatus;

  /**
   * True when the author's supervision level requires a supervisor to
   * sign this clinical reply before it can be sent.
   */
  countersignatureRequired: boolean;

  /**
   * PracticeClinicalSignature whose subjectType is "message-reply" and
   * whose subjectId is this message ID.
   */
  clinicalSignatureId?: WonFlowId;

  sentAt?: IsoDateTime;

  failedAt?: IsoDateTime;

  failureReason?: string;

  readReceipts: PracticeMessageReadReceipt[];

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Configurable rule used to calculate when a thread should escalate.
 *
 * The rule stores a duration rather than a scheduled job. Mock and live
 * implementations can determine whether escalation is due by comparing
 * thread timestamps with the current time.
 */
export interface PracticeMessageTriageRule {
  id: WonFlowId;

  organizationId: WonFlowId;

  name: string;

  description?: string;

  /**
   * Organization-owned categories covered by this rule.
   *
   * An empty array means the rule applies to every active category.
   */
  categoryIds: WonFlowId[];

  /**
   * Empty priorities means the rule applies to every priority.
   */
  priorities: PracticeMessagePriority[];

  /**
   * Time allowed after the latest patient message before escalation.
   */
  escalateAfterMinutes: number;

  /**
   * Optional team member from whom responsibility normally escalates.
   *
   * When omitted, the current thread assignee is used.
   */
  fromTeamMemberId?: WonFlowId;

  /**
   * Team member who should receive the escalation.
   */
  toTeamMemberId: WonFlowId;

  reason: string;

  status: RecordStatus;

  effectiveFrom: IsoDateTime;

  effectiveTo?: IsoDateTime;

  createdByTeamMemberId: WonFlowId;

  createdAt: IsoDateTime;

  updatedAt: IsoDateTime;
}

/**
 * Fired escalation belonging to one patient message thread.
 *
 * State is derived from firedAt, acknowledgedAt, resolvedAt and
 * cancelledAt rather than being duplicated in a mutable status field.
 */
export interface PracticeMessageEscalation {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId: WonFlowId;

  threadId: WonFlowId;

  triageRuleId: WonFlowId;

  fromTeamMemberId?: WonFlowId;

  toTeamMemberId: WonFlowId;

  reason: string;

  /**
   * Timestamp at which the response window ended.
   */
  thresholdReachedAt: IsoDateTime;

  /**
   * Timestamp at which the escalation record was emitted.
   */
  firedAt: IsoDateTime;

  acknowledgedByTeamMemberId?: WonFlowId;

  acknowledgedAt?: IsoDateTime;

  resolvedByTeamMemberId?: WonFlowId;

  resolvedAt?: IsoDateTime;

  cancelledByTeamMemberId?: WonFlowId;

  cancelledAt?: IsoDateTime;

  cancellationReason?: string;

  createdAt: IsoDateTime;
}

/**
 * Patient acknowledgement required before first use of practice
 * messaging.
 *
 * The acknowledged text must state that messaging is not for emergencies
 * and must explain the expected response window.
 */
export interface PracticeMessageSafetyNotice {
  id: WonFlowId;

  organizationId: WonFlowId;

  patientId: WonFlowId;

  patientAccountId: WonFlowId;

  /**
   * Version of the exact safety notice accepted by the patient.
   *
   * A new version requires a new acknowledgement.
   */
  noticeVersion: string;

  /**
   * Exact emergency warning displayed when acknowledgement was captured.
   */
  emergencyWarningText: string;

  /**
   * Response-time commitment displayed to the patient.
   */
  expectedResponseWindowMinutes: number;

  /**
   * Confirms that the patient explicitly accepted that this channel is
   * not intended for emergencies.
   */
  emergencyLimitationAcknowledged: boolean;

  acknowledgedAt: IsoDateTime;

  ipAddress: string;

  userAgent: string;

  createdAt: IsoDateTime;
}

/**
 * Complete patient message-thread view.
 */
export interface PracticeMessageThreadAggregate {
  thread: PracticeMessageThread;

  /**
   * Category records required to display and explain the thread.
   */
  categories: PracticeMessageCategoryConfig[];

  messages: PracticeMessage[];

  escalations: PracticeMessageEscalation[];

  signatures: PracticeClinicalSignature[];
}

/**
 * Returns message threads belonging to one patient.
 */
export function getPracticeMessageThreadsForPatient(
  threads: readonly PracticeMessageThread[],
  patientId: WonFlowId,
): PracticeMessageThread[] {
  return threads.filter(
    (thread) =>
      thread.patientId === patientId,
  );
}

/**
 * Returns messages belonging to one thread in chronological order.
 */
export function getPracticeMessagesForThread(
  messages: readonly PracticeMessage[],
  threadId: WonFlowId,
): PracticeMessage[] {
  return messages
    .filter(
      (message) =>
        message.threadId === threadId,
    )
    .sort(
      (left, right) =>
        left.createdAt.localeCompare(
          right.createdAt,
        ),
    );
}

/**
 * Determines whether a triage rule is currently active.
 */
export function isPracticeMessageTriageRuleActive(
  rule: PracticeMessageTriageRule,
  at: IsoDateTime,
): boolean {
  if (rule.status !== "active") {
    return false;
  }

  if (rule.effectiveFrom > at) {
    return false;
  }

  if (
    rule.effectiveTo !== undefined &&
    rule.effectiveTo < at
  ) {
    return false;
  }

  return true;
}

/**
 * Determines whether a triage rule applies to one thread.
 */
export function doesPracticeMessageTriageRuleApply(
  rule: PracticeMessageTriageRule,
  thread: PracticeMessageThread,
  at: IsoDateTime,
): boolean {
  if (
    !isPracticeMessageTriageRuleActive(
      rule,
      at,
    )
  ) {
    return false;
  }

  if (
    rule.categoryIds.length > 0 &&
    !rule.categoryIds.includes(
      thread.categoryId,
    )
  ) {
    return false;
  }

  if (
    rule.priorities.length > 0 &&
    !rule.priorities.includes(
      thread.priority,
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Calculates the timestamp at which a thread becomes overdue under a
 * triage rule.
 *
 * undefined is returned for invalid timestamps or negative durations.
 */
export function getPracticeMessageEscalationDueAt(
  thread: PracticeMessageThread,
  rule: PracticeMessageTriageRule,
): IsoDateTime | undefined {
  if (rule.escalateAfterMinutes < 0) {
    return undefined;
  }

  const referenceTimestamp =
    thread.lastPatientMessageAt ??
    thread.lastMessageAt;

  const referenceTime =
    Date.parse(referenceTimestamp);

  if (Number.isNaN(referenceTime)) {
    return undefined;
  }

  const dueTime =
    referenceTime +
    rule.escalateAfterMinutes *
      60 *
      1000;

  return new Date(dueTime).toISOString();
}

/**
 * Determines whether escalation is due from thread and rule timestamps.
 *
 * No scheduler state is required. A mock repository can call this helper
 * whenever the inbox is loaded.
 */
export function isPracticeMessageEscalationDue(
  thread: PracticeMessageThread,
  rule: PracticeMessageTriageRule,
  now: IsoDateTime,
): boolean {
  if (
    thread.status !==
    "awaiting-practice"
  ) {
    return false;
  }

  if (
    !doesPracticeMessageTriageRuleApply(
      rule,
      thread,
      now,
    )
  ) {
    return false;
  }

  const dueAt =
    getPracticeMessageEscalationDueAt(
      thread,
      rule,
    );

  if (dueAt === undefined) {
    return false;
  }

  const currentTime =
    Date.parse(now);

  const dueTime =
    Date.parse(dueAt);

  if (
    Number.isNaN(currentTime) ||
    Number.isNaN(dueTime)
  ) {
    return false;
  }

  return currentTime >= dueTime;
}

/**
 * Derives escalation state solely from timestamps.
 */
export function getPracticeMessageEscalationState(
  escalation: PracticeMessageEscalation,
): PracticeMessageEscalationState {
  if (
    escalation.cancelledAt !==
    undefined
  ) {
    return "cancelled";
  }

  if (
    escalation.resolvedAt !==
    undefined
  ) {
    return "resolved";
  }

  if (
    escalation.acknowledgedAt !==
    undefined
  ) {
    return "acknowledged";
  }

  return "active";
}

/**
 * Determines whether a practice team member's reply requires a
 * countersignature before sending.
 */
export function shouldCountersignPracticeMessageReply(
  author: PracticeTeamMember,
): boolean {
  return requiresPracticeCountersignature(
    author,
  );
}

/**
 * Checks whether a message has the required signed approval.
 *
 * Patient messages and independently authored practice messages do not
 * require a signature. A supervised clinical reply must reference a
 * signed PracticeClinicalSignature whose subjectType is "message-reply".
 */
export function isPracticeMessageCountersignatureSatisfied(
  message: PracticeMessage,
  signature:
    | PracticeClinicalSignature
    | undefined,
): boolean {
  if (
    !message.countersignatureRequired
  ) {
    return true;
  }

  if (
    signature === undefined ||
    message.clinicalSignatureId ===
      undefined
  ) {
    return false;
  }

  if (
    signature.id !==
      message.clinicalSignatureId ||
    signature.subjectType !==
      "message-reply" ||
    signature.subjectId !==
      message.id ||
    signature.patientId !==
      message.patientId ||
    signature.status !== "signed"
  ) {
    return false;
  }

  if (
    signature.signedByTeamMemberId ===
    undefined
  ) {
    return false;
  }

  return (
    signature.signedByTeamMemberId !==
    message.authorTeamMemberId
  );
}

/**
 * Determines whether a message may be sent.
 */
export function canSendPracticeMessage(
  message: PracticeMessage,
  signature:
    | PracticeClinicalSignature
    | undefined,
): boolean {
  if (
    message.status === "sent" ||
    message.status === "failed"
  ) {
    return false;
  }

  return isPracticeMessageCountersignatureSatisfied(
    message,
    signature,
  );
}

/**
 * Determines whether the patient has accepted the currently required
 * safety-notice version.
 */
export function hasAcknowledgedPracticeMessageSafetyNotice(
  notices:
    readonly PracticeMessageSafetyNotice[],
  patientAccountId: WonFlowId,
  patientId: WonFlowId,
  requiredNoticeVersion: string,
): boolean {
  return notices.some(
    (notice) =>
      notice.patientAccountId ===
        patientAccountId &&
      notice.patientId ===
        patientId &&
      notice.noticeVersion ===
        requiredNoticeVersion &&
      notice
        .emergencyLimitationAcknowledged,
  );
}
