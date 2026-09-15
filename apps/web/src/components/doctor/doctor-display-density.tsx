"use client";

import { useEffect } from "react";

import {
  DOCTOR_PREFERENCES_CHANGED_EVENT,
  applyDisplayDensity,
  readDoctorPreferences,
  type DoctorPortalPreferences,
} from "@/lib/doctor/display-preferences";

/**
 * Applies the doctor's chosen display density to the whole Doctor Portal.
 *
 * Mounted once in the doctor workspace layout. It reapplies whenever Settings
 * saves, and clears the attribute when the doctor leaves the portal so other
 * portals opened in the same tab keep their own spacing.
 */
export function DoctorDisplayDensity() {
  useEffect(() => {
    applyDisplayDensity(readDoctorPreferences().displayDensity);
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<DoctorPortalPreferences | undefined>).detail;
      applyDisplayDensity((detail ?? readDoctorPreferences()).displayDensity);
    };
    window.addEventListener(DOCTOR_PREFERENCES_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(DOCTOR_PREFERENCES_CHANGED_EVENT, onChange);
      applyDisplayDensity(null);
    };
  }, []);

  return null;
}
