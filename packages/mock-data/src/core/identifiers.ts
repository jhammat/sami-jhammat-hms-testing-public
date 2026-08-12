import type {
  WonFlowId,
} from "@wonflow/contracts";

function formatSequence(
  value: number,
  length = 6,
): string {
  return String(value).padStart(
    length,
    "0",
  );
}

export function createMockId(
  domain: string,
  sequence: number,
): WonFlowId {
  return (
    `mock:${domain}:${formatSequence(sequence)}`
  ) as WonFlowId;
}

export function createMockMrNumber(
  sequence: number,
): string {
  return `WF-DEMO-MR-${formatSequence(sequence)}`;
}

export function createMockEmployeeNumber(
  sequence: number,
): string {
  return `WF-DEMO-EMP-${formatSequence(sequence)}`;
}

export function createMockAppointmentNumber(
  sequence: number,
): string {
  return `WF-DEMO-APT-${formatSequence(sequence)}`;
}

export function createMockAdmissionNumber(
  sequence: number,
): string {
  return `WF-DEMO-ADM-${formatSequence(sequence)}`;
}

export function createMockInvoiceNumber(
  sequence: number,
): string {
  return `WF-DEMO-INV-${formatSequence(sequence)}`;
}