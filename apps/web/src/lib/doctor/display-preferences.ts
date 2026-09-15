/**
 * Doctor Portal display preferences, kept on this device.
 *
 * Only presentation choices live here - nothing clinical and nothing that has
 * to follow the doctor to another computer - so browser storage is the right
 * home. Storage can be unavailable (private windows, blocked site data); every
 * read falls back to the defaults and every write is best-effort.
 */

export type DisplayDensity = "compact" | "comfortable";

export interface DoctorPortalPreferences {
  notificationsEnabled: boolean;
  queueSoundEnabled: boolean;
  defaultAppointmentDuration: string;
  displayDensity: DisplayDensity;
  mobileCompactActions: boolean;
}

export const DEFAULT_DOCTOR_PREFERENCES: DoctorPortalPreferences = {
  notificationsEnabled: true,
  queueSoundEnabled: true,
  defaultAppointmentDuration: "15",
  displayDensity: "compact",
  mobileCompactActions: true,
};

export const DOCTOR_PREFERENCES_CHANGED_EVENT = "wonflow:doctor-portal-preferences-changed";

const STORAGE_KEY = "wonflow-doctor-portal-preferences";

export function readDoctorPreferences(): DoctorPortalPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DOCTOR_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<DoctorPortalPreferences>;
    return {
      ...DEFAULT_DOCTOR_PREFERENCES,
      ...parsed,
      displayDensity: parsed.displayDensity === "comfortable" ? "comfortable" : "compact",
    };
  } catch {
    return DEFAULT_DOCTOR_PREFERENCES;
  }
}

export function writeDoctorPreferences(preferences: DoctorPortalPreferences): boolean {
  let stored = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    stored = false;
  }
  window.dispatchEvent(new CustomEvent(DOCTOR_PREFERENCES_CHANGED_EVENT, { detail: preferences }));
  return stored;
}

/** Compact is the portal's native look, so it is the absence of the attribute. */
export function applyDisplayDensity(density: DisplayDensity | null) {
  const root = document.documentElement;
  if (density === "comfortable") root.dataset.doctorDensity = "comfortable";
  else delete root.dataset.doctorDensity;
}
