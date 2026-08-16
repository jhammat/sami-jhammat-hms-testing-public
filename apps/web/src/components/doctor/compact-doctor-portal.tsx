"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  sortDemoQueueEntries,
} from "@/lib/queue";
import type { DemoDoctorSitting } from "@/lib/doctor-sittings";
import type { DemoQueueEntry } from "@/lib/queue";
import { patchDoctorQueue } from "@/lib/api/doctor-api";
import { WonFlowApiError } from "@/lib/api/phase-one-api";

import {
  usePracticeLocation,
} from "@/components/shell";

import { useDoctorPortalContext } from "./doctor-portal-shell";
import {
  DoctorQueuePanel,
  DoctorSchedulePanel,
  DoctorTodayPanel,
} from "./doctor-portal-workflow";
import type { DoctorWorkflowModel } from "./doctor-portal-workflow";

export type CompactDoctorPortalScreen = "today" | "schedule" | "queue";

export function CompactDoctorPortal({
  screen,
  embedded = false,
}: {
  screen: CompactDoctorPortalScreen;
  embedded?: boolean;
}) {
  const router = useRouter();
  const portal = useDoctorPortalContext();
  const locationContext = usePracticeLocation();
  const [message, setMessage] = useState<string>();

  const entries = useMemo(
    () =>
      sortDemoQueueEntries(
        portal.queueEntries,
      ),
    [
      portal.queueEntries,
    ],
  );

  const current = entries.find((entry) => entry.status === "serving");
  const activeEntries = entries.filter(
    (entry) => entry.status !== "completed" && entry.status !== "cancelled",
  );

  function requireAvailableSitting(): DemoDoctorSitting | undefined {
    if (portal.sitting?.status === "available") {
      return portal.sitting;
    }

    setMessage(
      portal.sitting?.status === "on-break"
        ? "Resume the sitting before progressing the queue."
        : "Start an available sitting before progressing the queue.",
    );
    return undefined;
  }

  function describeError(error: unknown, fallback: string): string {
    return error instanceof WonFlowApiError ? error.message : fallback;
  }

  async function callPatient(entry: DemoQueueEntry): Promise<void> {
    const sitting = requireAvailableSitting();
    if (sitting === undefined) return;

    try {
      await patchDoctorQueue(entry.appointmentId, "call");
      portal.reload();
      setMessage(`${entry.tokenNumber} called to ${sitting.roomLabel}.`);
    } catch (error) {
      setMessage(describeError(error, "The patient could not be called."));
    }
  }

  async function startConsultation(entry: DemoQueueEntry): Promise<void> {
    const sitting = requireAvailableSitting();
    if (sitting === undefined) return;

    if (current !== undefined && current.id !== entry.id) {
      setMessage(
        `${current.tokenNumber} is already in consultation. Finish it before starting another patient.`,
      );
      return;
    }

    try {
      const { appointment } = await patchDoctorQueue(entry.appointmentId, "start");
      portal.reload();
      if (appointment.encounter === null) {
        setMessage("The consultation started, but its clinical encounter could not be opened.");
        return;
      }
      router.push(`/doctor/encounters/${appointment.encounter.id}`);
    } catch (error) {
      setMessage(describeError(error, "The consultation could not be started."));
    }
  }

  async function finishConsultation(entry: DemoQueueEntry): Promise<void> {
    try {
      await patchDoctorQueue(entry.appointmentId, "complete");
      portal.reload();
      setMessage(
        "Consultation completed. The next waiting patient is ready to be called.",
      );
    } catch (error) {
      setMessage(describeError(error, "The consultation could not be completed."));
    }
  }

  async function skipPatient(entry: DemoQueueEntry): Promise<void> {
    try {
      await patchDoctorQueue(entry.appointmentId, "skip");
      portal.reload();
      setMessage(`${entry.tokenNumber} moved to skipped.`);
    } catch (error) {
      setMessage(describeError(error, "The patient could not be skipped."));
    }
  }

  async function returnPatient(entry: DemoQueueEntry): Promise<void> {
    try {
      await patchDoctorQueue(entry.appointmentId, "return");
      portal.reload();
      setMessage(`${entry.tokenNumber} returned to the waiting queue.`);
    } catch (error) {
      setMessage(describeError(error, "The patient could not be returned to the queue."));
    }
  }

  if (portal.loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-500 shadow-sm">
        Loading Doctor Portal…
      </div>
    );
  }

  if (portal.doctor === undefined) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-900">
        No active doctor is available. Add a practitioner or send a patient to a
        doctor from Reception.
      </div>
    );
  }

  const model: DoctorWorkflowModel = {
    doctor: portal.doctor,
    doctors: portal.doctors,
    location: locationContext.selectedLocation,
    locations: locationContext.locations,
    locationSelection: locationContext.selectedLocationId,
    legacyBranchId: locationContext.selectedLocation?.linkedBranchId,
    doctorId: portal.doctorId,
    businessDate: portal.businessDate,
    sitting: portal.sitting,
    roster: portal.roster,
    entries,
    activeEntries,
    message,
    setDoctorId: portal.setDoctorId,
    setBusinessDate: portal.setBusinessDate,
    setMessage,
    reload: portal.reload,
    callPatient,
    startConsultation,
    finishConsultation,
    skipPatient,
    returnPatient,
  };

  if (screen === "schedule") return <DoctorSchedulePanel embedded={embedded} model={model} />;
  if (screen === "queue") return <DoctorQueuePanel model={model} />;
  return <DoctorTodayPanel model={model} />;
}
