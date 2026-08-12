export interface PatientAppointmentMapInput { locationName: string; addressLines: readonly string[]; locality?: string; region?: string; postalCode?: string; latitude?: number; longitude?: number }
export function createPatientAppointmentMapUrl(input: PatientAppointmentMapInput) {
  const coordinates = input.latitude !== undefined && input.longitude !== undefined && Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const query = coordinates ? `${input.latitude},${input.longitude}` : [input.locationName, ...input.addressLines, input.locality, input.region, input.postalCode].filter((value): value is string => value !== undefined && value.trim() !== "").join(", ");
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query }).toString()}`;
}
