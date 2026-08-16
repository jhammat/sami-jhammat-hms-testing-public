"use client";

import { useCallback, useEffect, useState } from "react";

import { DOCTOR_SITTINGS_CHANGED_EVENT } from "./legacy-local-sitting-cache";

export interface LiveDoctorSitting {
  id: string;
  doctorId: string;
  membershipId: string;
  doctorName: string;
  branchId: string;
  branchName: string;
  startsMinute: number;
  endsMinute: number;
  averageConsultationMinutes: number;
  roomLabel: string | null;
  status: "PLANNED" | "AVAILABLE" | "ON_BREAK" | "FINISHED";
}

/** Local demo status vocabulary, so reception UI can stay unchanged. */
const LOCAL_STATUS = {
  PLANNED: "not-started",
  AVAILABLE: "available",
  ON_BREAK: "on-break",
  FINISHED: "finished",
} as const;

export interface ReceptionSittingView {
  id: string;
  /** Rooms are demo-layer records with no server id, so this stays empty. */
  roomId: string;
  roomLabel: string;
  status: (typeof LOCAL_STATUS)[keyof typeof LOCAL_STATUS];
  averageConsultationMinutes: number;
}

/**
 * Today's real doctor sittings, for the reception desk.
 *
 * Doctors publish their sitting hours to the tenant database; reading them
 * here means the desk shows who is actually in, rather than data confined to
 * the doctor's own browser.
 */
export function useLiveDoctorSittings(businessDate: string) {
  const [sittings, setSittings] = useState<LiveDoctorSitting[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/reception/sittings?date=${encodeURIComponent(businessDate)}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) return;
      const body = await response.json() as { sittings?: LiveDoctorSitting[] };
      setSittings(body.sittings ?? []);
    } catch {
      // Keep the last known set; the desk falls back to local records.
    }
  }, [businessDate]);

  useEffect(() => {
    // Refresh when a doctor changes their sitting in this browser, and poll so
    // a change made on the doctor's own machine reaches the desk.
    const handler = () => void load();
    const initial = window.setTimeout(handler, 0);
    window.addEventListener(DOCTOR_SITTINGS_CHANGED_EVENT, handler);
    const timer = window.setInterval(handler, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener(DOCTOR_SITTINGS_CHANGED_EVENT, handler);
      window.clearInterval(timer);
    };
  }, [load]);

  /** Looks a doctor up by either their doctor-profile id or membership id. */
  const findForDoctor = useCallback((doctorId: string): ReceptionSittingView | undefined => {
    const match = sittings.find(
      (sitting) => sitting.doctorId === doctorId || sitting.membershipId === doctorId,
    );
    if (match === undefined) return undefined;
    return {
      id: match.id,
      roomId: "",
      roomLabel: match.roomLabel ?? "",
      status: LOCAL_STATUS[match.status],
      averageConsultationMinutes: match.averageConsultationMinutes,
    };
  }, [sittings]);

  return { sittings, findForDoctor, reload: load };
}
