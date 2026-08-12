import "server-only";
const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;
export function normalizePatientAppointmentIdentifier(value: unknown): string | null { if (typeof value !== "string") return null; const normalized = value.trim(); if (!normalized || normalized.length > 256 || controlCharacterPattern.test(normalized) || normalized.includes("/") || normalized.includes("\\")) return null; return normalized; }
export function readPatientAppointmentFormIdentifier(formData: FormData, key: string) { return normalizePatientAppointmentIdentifier(formData.get(key)); }
export function readPatientAppointmentAcknowledgement(formData: FormData) { return formData.get("acknowledgement") === "accepted"; }
