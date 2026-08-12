import type { PracticeBookingOfferingOption } from "@wonflow/mock-data";
export type PracticeBookingReadinessPhase = "selection" | "review" | "payment";
export type PracticeBookingReadinessIssueCode = "offering-required" | "clinician-required" | "slot-required" | "document-required" | "payment-provider-required";
export interface PracticeBookingReadinessIssue { code: PracticeBookingReadinessIssueCode; message: string }
export interface GetPracticeBookingReadinessInput { phase: PracticeBookingReadinessPhase; option: PracticeBookingOfferingOption | undefined; selectedClinicianId: string | undefined; selectedSlotId: string | undefined; attachedDocumentIds: readonly string[]; selectedPaymentProviderId: string | undefined }
export function getPracticeBookingReadinessIssues(input: GetPracticeBookingReadinessInput): PracticeBookingReadinessIssue[] {
  const { phase, option, selectedClinicianId, selectedSlotId, attachedDocumentIds, selectedPaymentProviderId } = input;
  if (option === undefined) return [{ code: "offering-required", message: "Select a location and service before continuing." }];
  const issues: PracticeBookingReadinessIssue[] = [];
  if ((option.service.deliveryScope === "selected-clinicians" || option.clinicians.length === 1) && !selectedClinicianId?.trim()) issues.push({ code: "clinician-required", message: "Select an eligible clinician before continuing." });
  if (!selectedSlotId?.trim()) issues.push({ code: "slot-required", message: "Select an available appointment time before continuing." });
  if (option.service.requiresDocumentUpload && attachedDocumentIds.length === 0) issues.push({ code: "document-required", message: "This service requires at least one supporting document before booking." });
  if (phase === "payment" && option.requiresPrepayment && !selectedPaymentProviderId?.trim()) issues.push({ code: "payment-provider-required", message: "Select a payment method before continuing." });
  return issues;
}
export function canContinuePracticeBooking(input: GetPracticeBookingReadinessInput) { return getPracticeBookingReadinessIssues(input).length === 0 }
export function getPracticeBookingNextPhase(option: PracticeBookingOfferingOption): "payment" | "confirmation" { return option.requiresPrepayment ? "payment" : "confirmation" }
