"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  ALL_PRACTICE_LOCATIONS,
  usePracticeLocation,
} from "@/components/shell";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  WonFlowAsyncDataBoundary,
  WonFlowEmptyState,
} from "@/components/feedback";

import {
  WonFlowActionBar,
  WonFlowActionButton,
  WonFlowKpiCard,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import {
  getTodayDateInputValue,
  readDemoAppointmentBookings,
  updateDemoAppointmentBookingStatus,
} from "@/lib/appointments";

import type {
  DemoAppointmentBooking,
} from "@/lib/appointments";

import {
  createOrGetDemoClinicalEncounterFromQueue,
  readDemoClinicalEncounters,
  updateDemoClinicalEncounterOpeningNote,
  updateDemoClinicalEncounterStatus,
} from "@/lib/clinical";

import {
  DOCTOR_SITTINGS_CHANGED_EVENT,
  getActiveDemoDoctorSitting,
  readDemoDoctorSittings,
  saveDemoDoctorSitting,
  updateDemoDoctorSittingStatus,
} from "@/lib/doctor-sittings";

import type {
  DemoDoctorSitting,
  DemoDoctorSittingStatus,
} from "@/lib/doctor-sittings";

import type {
  DemoClinicalEncounter,
} from "@/lib/clinical";

import {
  getDemoPatientRegistrationAge,
  readDemoPatientRegistrations,
} from "@/lib/patients";

import type {
  DemoPatientRegistrationResult,
} from "@/lib/patients";

import {
  calculateDemoQueueWaitMinutes,
  QUEUE_ROOM_OPTIONS,
  readDemoQueueEntries,
  sortDemoQueueEntries,
  syncDemoDoctorSittingToQueueEntries,
  updateDemoQueueEntryStatus,
} from "@/lib/queue";

import type {
  DemoQueueEntry,
  DemoQueueStatus,
} from "@/lib/queue";

import {
  formatWonFlowDashboardDateTime,
  formatWonFlowDashboardTime,
} from "@/lib/dashboard";

const INPUT_CLASS_NAME = [
  "h-11 w-full",
  "rounded-xl border",
  "border-slate-200",
  "bg-white px-3.5",
  "text-sm text-slate-900",
  "outline-none transition",
  "placeholder:text-slate-400",
  "focus:border-blue-400",
  "focus:ring-2",
  "focus:ring-blue-100",
].join(" ");

function DoctorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 4v5a4 4 0 0 0 8 0V4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <path
        d="M6 4h4M14 4h4M12 13v2a5 5 0 0 0 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <circle
        cx="19"
        cy="18"
        r="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function QueueIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 6h12M8 12h12M8 18h12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />

      <circle
        cx="4"
        cy="6"
        fill="currentColor"
        r="1"
      />

      <circle
        cx="4"
        cy="12"
        fill="currentColor"
        r="1"
      />

      <circle
        cx="4"
        cy="18"
        fill="currentColor"
        r="1"
      />
    </svg>
  );
}

function PatientIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 21a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EncounterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3h10v4H7V3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M6 5H4v16h16V5h-2M8 12h8M8 16h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 7v5h-5M4 17v-5h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />

      <path
        d="M6.1 9a7 7 0 0 1 11.7-2.4L20 12M4 12l2.2 5.4A7 7 0 0 0 17.9 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function humanizeValue(
  value: string,
): string {
  return value
    .replaceAll("-", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

function getInitials(
  value: string,
): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

function formatWaitMinutes(
  value: number,
): string {
  if (value < 60) {
    return `${value} min`;
  }

  const hours =
    Math.floor(
      value / 60,
    );

  const minutes =
    value % 60;

  return minutes === 0
    ? `${hours} hr`
    : `${hours} hr ${minutes} min`;
}

function getQueueStatusClassName(
  status:
    DemoQueueStatus,
): string {
  switch (status) {
    case "waiting":
      return "bg-blue-50 text-blue-700 ring-blue-100";

    case "called":
      return "bg-amber-50 text-amber-700 ring-amber-100";

    case "serving":
      return "bg-violet-50 text-violet-700 ring-violet-100";

    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";

    case "skipped":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-100";
  }
}

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "rounded-full px-2.5 py-1",
        "text-[11px] font-bold",
        "ring-1",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm font-bold text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}

interface DoctorConsultationContentProps {
  practitioners:
    readonly MockPractitioner[];

  initialQueueEntryId?: string;
}

function DoctorConsultationContent({
  practitioners,
  initialQueueEntryId,
}: DoctorConsultationContentProps) {
  const [
    patients,
    setPatients,
  ] = useState<
    DemoPatientRegistrationResult[]
  >([]);

  const [
    appointments,
    setAppointments,
  ] = useState<
    DemoAppointmentBooking[]
  >([]);

  const [
    queueEntries,
    setQueueEntries,
  ] = useState<
    DemoQueueEntry[]
  >([]);

  const [
    encounters,
    setEncounters,
  ] = useState<
    DemoClinicalEncounter[]
  >([]);

  const [doctorSittings, setDoctorSittings] =
    useState<DemoDoctorSitting[]>([]);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    getTodayDateInputValue,
  );

  const {
    locations,
    matchesLegacyBranch,
    selectedLocation,
    selectedLocationId,
  } = usePracticeLocation();

  const [
    selectedPractitionerId,
    setSelectedPractitionerId,
  ] = useState("");

  const [
    selectedQueueEntryId,
    setSelectedQueueEntryId,
  ] = useState(
    initialQueueEntryId ?? "",
  );

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    noteDrafts,
    setNoteDrafts,
  ] = useState<
    Record<string, string>
  >({});

  const [
    actionMessage,
    setActionMessage,
  ] = useState<
    string |
    undefined
  >();

  const [sittingRoomId, setSittingRoomId] = useState("");
  const [sittingStartTime, setSittingStartTime] = useState("09:00");
  const [sittingEndTime, setSittingEndTime] = useState("17:00");
  const [averageConsultationMinutes, setAverageConsultationMinutes] =
    useState("15");

  const reloadLocalData =
    useCallback(() => {
      setPatients(
        readDemoPatientRegistrations(),
      );

      setAppointments(
        readDemoAppointmentBookings(),
      );

      setQueueEntries(
        readDemoQueueEntries(),
      );

      setEncounters(
        readDemoClinicalEncounters(),
      );

      setDoctorSittings(
        readDemoDoctorSittings(),
      );
    }, []);

  useEffect(() => {
    queueMicrotask(
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-patients-changed",
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-appointments-changed",
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-queue-changed",
      reloadLocalData,
    );

    window.addEventListener(
      "wonflow:demo-clinical-encounters-changed",
      reloadLocalData,
    );

    window.addEventListener(
      DOCTOR_SITTINGS_CHANGED_EVENT,
      reloadLocalData,
    );

    window.addEventListener(
      "storage",
      reloadLocalData,
    );

    return () => {
      window.removeEventListener(
        "wonflow:demo-patients-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        "wonflow:demo-appointments-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        "wonflow:demo-queue-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        "wonflow:demo-clinical-encounters-changed",
        reloadLocalData,
      );

      window.removeEventListener(
        DOCTOR_SITTINGS_CHANGED_EVENT,
        reloadLocalData,
      );

      window.removeEventListener(
        "storage",
        reloadLocalData,
      );
    };
  }, [reloadLocalData]);

  const patientsById =
    useMemo(
      () =>
        new Map(
          patients.map(
            (patient) => [
              patient.id,
              patient,
            ],
          ),
        ),
      [patients],
    );

  const appointmentsById =
    useMemo(
      () =>
        new Map(
          appointments.map(
            (appointment) => [
              appointment.id,
              appointment,
            ],
          ),
        ),
      [appointments],
    );

  const locationsByBranchId =
    useMemo(
      () =>
        new Map(
          locations
            .filter((location) => location.linkedBranchId !== undefined)
            .map((location) => [
              location.linkedBranchId!,
              location,
            ]),
        ),
      [locations],
    );

  const practitionersById =
    useMemo(
      () =>
        new Map(
          practitioners.map(
            (practitioner) => [
              practitioner.id,
              practitioner,
            ],
          ),
        ),
      [practitioners],
    );

  const availableDoctors =
    useMemo(
      () =>
        practitioners.filter(
          (practitioner) =>
            practitioner
              .operationalStatus !==
            "off-duty",
        ),
      [practitioners],
    );

  const initialQueueEntry =
    queueEntries.find(
      (entry) =>
        entry.id ===
        initialQueueEntryId,
    );

  const activePractitionerId =
    selectedPractitionerId ||
    initialQueueEntry
      ?.practitionerId ||
    availableDoctors[0]?.id ||
    practitioners[0]?.id ||
    "";

  const activeDoctor =
    practitionersById.get(
      activePractitionerId,
    );

  const normalizedSearch =
    searchText
      .trim()
      .toLocaleLowerCase();

  const visibleQueueEntries =
    useMemo(
      () =>
        sortDemoQueueEntries(
          queueEntries.filter(
            (entry) => {
              if (
                entry.businessDate !==
                selectedDate
              ) {
                return false;
              }

              if (
                entry.practitionerId !==
                activePractitionerId
              ) {
                return false;
              }

              if (!matchesLegacyBranch(entry.branchId)) {
                return false;
              }

              if (
                entry.status ===
                  "completed" ||
                entry.status ===
                  "cancelled"
              ) {
                return false;
              }

              if (
                normalizedSearch === ""
              ) {
                return true;
              }

              const patient =
                patientsById.get(
                  entry.patientId,
                );

              const appointment =
                appointmentsById.get(
                  entry.appointmentId,
                );

              const searchableText = [
                entry.tokenNumber,
                entry.roomLabel ?? "",
                entry.serviceName,

                patient
                  ?.displayName ??
                  "",

                patient
                  ?.mrNumber ??
                  "",

                patient
                  ?.draft
                  .cnicNumber ??
                  "",

                appointment
                  ?.appointmentNumber ??
                  "",

                appointment
                  ?.reasonForVisit ??
                  "",
              ]
                .join(" ")
                .toLocaleLowerCase();

              return searchableText.includes(
                normalizedSearch,
              );
            },
          ),
        ),
      [
        activePractitionerId,
        appointmentsById,
        normalizedSearch,
        patientsById,
        queueEntries,
        matchesLegacyBranch,
        selectedDate,
      ],
    );

  const selectedQueueEntry =
    queueEntries.find(
      (entry) =>
        entry.id ===
        selectedQueueEntryId,
    ) ??
    initialQueueEntry ??
    visibleQueueEntries[0];

  const activeSittingBranchId =
    selectedLocationId !== ALL_PRACTICE_LOCATIONS
      ? selectedLocation?.linkedBranchId ?? ""
      : selectedQueueEntry?.branchId ??
        "";

  const activeDoctorSitting = doctorSittings.find(
    (sitting) =>
      sitting.practitionerId === activePractitionerId &&
      activeSittingBranchId === sitting.branchId &&
      sitting.businessDate === selectedDate,
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (activeDoctorSitting === undefined) {
        setSittingRoomId("");
        setSittingStartTime("09:00");
        setSittingEndTime("17:00");
        setAverageConsultationMinutes("15");
        return;
      }

      setSittingRoomId(activeDoctorSitting.roomId);
      setSittingStartTime(activeDoctorSitting.sittingStartTime);
      setSittingEndTime(activeDoctorSitting.sittingEndTime);
      setAverageConsultationMinutes(
        String(activeDoctorSitting.averageConsultationMinutes),
      );
    });
  }, [activeDoctorSitting]);

  const activePatientRecord =
    selectedQueueEntry ===
    undefined
      ? undefined
      : patientsById.get(
          selectedQueueEntry
            .patientId,
        );

  const activePatient =
    activePatientRecord ??
    (
      selectedQueueEntry?.snapshot === undefined
        ? undefined
        : {
            id: selectedQueueEntry.patientId,
            displayName:
              selectedQueueEntry.snapshot.patient.displayName,
            mrNumber:
              selectedQueueEntry.snapshot.patient.mrNumber,
            draft: {
              fatherName: "",
              cnicNumber:
                selectedQueueEntry.snapshot.patient.identityNumber,
              gender:
                selectedQueueEntry.snapshot.patient.gender,
              bloodGroup:
                selectedQueueEntry.snapshot.patient.bloodGroup,
              mobileNumber:
                selectedQueueEntry.snapshot.patient.mobileNumber,
              patientCategory: "standard",
              emergencyContactName: "",
            },
          }
    );

  const activeAppointment =
    selectedQueueEntry ===
    undefined
      ? undefined
      : appointmentsById.get(
          selectedQueueEntry
            .appointmentId,
        );

  const activeBranch =
    selectedQueueEntry ===
    undefined
      ? undefined
      : locationsByBranchId.get(
          selectedQueueEntry
            .branchId,
        );

  const activeEncounter =
    selectedQueueEntry ===
    undefined
      ? undefined
      : encounters.find(
          (encounter) =>
            encounter.queueEntryId ===
              selectedQueueEntry.id &&
            encounter.status !==
              "cancelled",
        );

  const previousPatientEncounters =
    activePatient === undefined
      ? []
      : encounters.filter(
          (encounter) =>
            encounter.patientId ===
            activePatient.id,
        );

  const patientAge =
    activePatientRecord !== undefined
      ? getDemoPatientRegistrationAge(
          activePatientRecord,
        )
      : selectedQueueEntry?.snapshot?.patient.ageYears;

  const queueStatistics =
    useMemo(
      () => ({
        waiting:
          visibleQueueEntries.filter(
            (entry) =>
              entry.status ===
              "waiting",
          ).length,

        called:
          visibleQueueEntries.filter(
            (entry) =>
              entry.status ===
              "called",
          ).length,

        serving:
          visibleQueueEntries.filter(
            (entry) =>
              entry.status ===
              "serving",
          ).length,

        skipped:
          visibleQueueEntries.filter(
            (entry) =>
              entry.status ===
              "skipped",
          ).length,

        encountersToday:
          encounters.filter(
            (encounter) =>
              encounter
                .practitionerId ===
                activePractitionerId &&
              encounter.startedAt
                .slice(0, 10) ===
                selectedDate,
          ).length,
      }),
      [
        activePractitionerId,
        encounters,
        selectedDate,
        visibleQueueEntries,
      ],
    );

  function selectQueueEntry(
    entryId: string,
  ) {
    setSelectedQueueEntryId(
      entryId,
    );

    setActionMessage(
      undefined,
    );
  }

  function callPatient(
    entry:
      DemoQueueEntry,
  ) {
    const sitting =
      getActiveDemoDoctorSitting({
        practitionerId: entry.practitionerId,
        branchId: entry.branchId,
        businessDate: entry.businessDate,
      });

    if (
      sitting === undefined
    ) {
      setActionMessage(
        "Start the doctor's sitting and select a room before calling patients.",
      );

      return;
    }

    if (sitting.status !== "available") {
      setActionMessage("The doctor is currently on break.");
      return;
    }

    syncDemoDoctorSittingToQueueEntries(sitting);

    updateDemoQueueEntryStatus(
      entry.id,
      "called",
    );

    reloadLocalData();

    setSelectedQueueEntryId(
      entry.id,
    );

    setActionMessage(
      `${entry.tokenNumber} called to ${sitting.roomLabel}.`,
    );
  }

  function returnSkippedPatient(
    entry:
      DemoQueueEntry,
  ) {
    updateDemoQueueEntryStatus(
      entry.id,
      "waiting",
    );

    reloadLocalData();

    setSelectedQueueEntryId(
      entry.id,
    );

    setActionMessage(
      `${entry.tokenNumber} returned to the waiting queue.`,
    );
  }

  function startConsultation(
    entry:
      DemoQueueEntry,
  ) {
    const appointment =
      appointmentsById.get(
        entry.appointmentId,
      );

    const sitting =
      getActiveDemoDoctorSitting({
        practitionerId: entry.practitionerId,
        branchId: entry.branchId,
        businessDate: entry.businessDate,
      });

    if (
      sitting === undefined ||
      sitting.status !== "available"
    ) {
      setActionMessage(
        "The doctor must have an active sitting before starting the consultation.",
      );

      return;
    }

    syncDemoDoctorSittingToQueueEntries(sitting);

    if (
      entry.status ===
      "waiting"
    ) {
      setActionMessage(
        "Call the patient before starting the consultation.",
      );

      return;
    }

    if (
      entry.status ===
      "skipped"
    ) {
      setActionMessage(
        "Return the patient to waiting before starting the consultation.",
      );

      return;
    }

    if (
      entry.status ===
      "called"
    ) {
      updateDemoQueueEntryStatus(
        entry.id,
        "serving",
      );
    }

    const encounter =
      createOrGetDemoClinicalEncounterFromQueue({
        queueEntry: entry,
        appointment,
      });

    reloadLocalData();

    setSelectedQueueEntryId(
      entry.id,
    );

    setActionMessage(
      `Consultation started. Encounter ${encounter.encounterNumber} created.`,
    );
  }

  function finishConsultation(
    entry: DemoQueueEntry,
  ): void {
    const encounter = encounters.find(
      (item) =>
        item.queueEntryId === entry.id &&
        item.status !== "cancelled",
    );

    if (encounter === undefined) {
      setActionMessage(
        "Start the consultation before finishing it.",
      );
      return;
    }

    updateDemoClinicalEncounterStatus(
      encounter.id,
      "completed",
    );
    updateDemoQueueEntryStatus(
      entry.id,
      "completed",
    );

    const appointment =
      appointmentsById.get(entry.appointmentId);

    if (appointment !== undefined) {
      updateDemoAppointmentBookingStatus(
        appointment.id,
        "completed",
      );
    }

    const remainingQueue = sortDemoQueueEntries(
      readDemoQueueEntries(),
    ).filter(
      (queueEntry) =>
        queueEntry.practitionerId === entry.practitionerId &&
        queueEntry.branchId === entry.branchId &&
        queueEntry.businessDate === entry.businessDate &&
        queueEntry.status !== "completed" &&
        queueEntry.status !== "cancelled",
    );
    const nextPatient = remainingQueue.find(
      (queueEntry) => queueEntry.status === "waiting",
    );

    reloadLocalData();
    setSelectedQueueEntryId(nextPatient?.id ?? "");
    setActionMessage(
      nextPatient === undefined
        ? `${entry.tokenNumber} completed. No patient is currently waiting.`
        : `${entry.tokenNumber} completed. ${nextPatient.tokenNumber} is now next in the queue.`,
    );
  }

  function saveOpeningNote() {
    if (
      activeEncounter ===
      undefined
    ) {
      setActionMessage(
        "Start the consultation before saving a doctor note.",
      );

      return;
    }

    const note =
      noteDrafts[
        activeEncounter.id
      ] ??
      activeEncounter.openingNote;

    updateDemoClinicalEncounterOpeningNote(
      activeEncounter.id,
      note,
    );

    reloadLocalData();

    setActionMessage(
      "Doctor opening note saved.",
    );
  }

  function saveSitting(): void {
    if (
      activePractitionerId === "" ||
      activeSittingBranchId === ""
    ) {
      setActionMessage(
        "Select a doctor and hospital branch.",
      );
      return;
    }

    const room = QUEUE_ROOM_OPTIONS.find(
      (option) => option.id === sittingRoomId,
    );

    if (room === undefined) {
      setActionMessage(
        "Select the doctor's consultation room.",
      );
      return;
    }

    const duration = Number(averageConsultationMinutes);

    if (
      !Number.isFinite(duration) ||
      duration < 5 ||
      duration > 120
    ) {
      setActionMessage(
        "Enter an average consultation time between 5 and 120 minutes.",
      );
      return;
    }

    const sitting = saveDemoDoctorSitting({
      practitionerId: activePractitionerId,
      branchId: activeSittingBranchId,
      businessDate: selectedDate,
      roomId: room.id,
      roomLabel: room.label,
      sittingStartTime,
      sittingEndTime,
      averageConsultationMinutes: duration,
      status:
        activeDoctorSitting?.status === "finished"
          ? "available"
          : activeDoctorSitting?.status ?? "available",
    });

    const updatedPatients =
      syncDemoDoctorSittingToQueueEntries(sitting);
    reloadLocalData();
    setActionMessage(
      `${room.label} saved. ${updatedPatients} active queue patient${updatedPatients === 1 ? "" : "s"} updated.`,
    );
  }

  function changeSittingStatus(
    status: DemoDoctorSittingStatus,
  ): void {
    if (activeDoctorSitting === undefined) {
      setActionMessage(
        "Save the doctor's sitting before changing its status.",
      );
      return;
    }

    const updatedSitting = updateDemoDoctorSittingStatus(
      activeDoctorSitting.id,
      status,
    );

    if (updatedSitting !== undefined) {
      syncDemoDoctorSittingToQueueEntries(updatedSitting);
    }
    reloadLocalData();
    setActionMessage(
      status === "available"
        ? "Doctor is available and the queue is active."
        : status === "on-break"
          ? "Doctor sitting paused. Waiting patients remain in the queue."
          : "Doctor sitting finished for today.",
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowActionBar
        description="Select the doctor, branch and date to open the relevant live patient queue."
        filters={
          <>
            <select
              aria-label="Select doctor"
              className="h-11 min-w-64 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(
                event,
              ) => {
                setSelectedPractitionerId(
                  event.target.value,
                );

                setSelectedQueueEntryId(
                  "",
                );
              }}
              value={
                activePractitionerId
              }
            >
              {availableDoctors.map(
                (practitioner) => (
                  <option
                    key={
                      practitioner.id
                    }
                    value={
                      practitioner.id
                    }
                  >
                    {
                      practitioner
                        .displayName
                    }
                    {" — "}
                    {
                      practitioner
                        .specialtyName
                    }
                  </option>
                ),
              )}
            </select>

            <input
              aria-label="Consultation date"
              className="h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none"
              onChange={(
                event,
              ) => {
                setSelectedDate(
                  event.target.value,
                );
              }}
              type="date"
              value={selectedDate}
            />
          </>
        }
        primaryActions={
          <WonFlowActionButton
            icon={<RefreshIcon />}
            onClick={
              reloadLocalData
            }
            variant="primary"
          >
            Refresh Doctor Queue
          </WonFlowActionButton>
        }
        summary={
          activeDoctor ===
          undefined
            ? "No doctor selected"
            : `${activeDoctor.displayName} · ${visibleQueueEntries.length} active patients`
        }
        title="Doctor Queue Controls"
      />

      <div className="grid gap-2 rounded-xl border border-indigo-100 bg-white p-3 md:grid-cols-5">
        <select
          className={INPUT_CLASS_NAME}
          onChange={(event) => setSittingRoomId(event.target.value)}
          value={sittingRoomId}
        >
          <option value="">Select room</option>
          {QUEUE_ROOM_OPTIONS
            .filter((room) => room.category === "consultation")
            .map((room) => (
            <option key={room.id} value={room.id}>
              {room.label}
            </option>
          ))}
        </select>
        <input
          className={INPUT_CLASS_NAME}
          max="120"
          min="5"
          onChange={(event) => setSittingStartTime(event.target.value)}
          type="time"
          value={sittingStartTime}
        />
        <input
          className={INPUT_CLASS_NAME}
          onChange={(event) => setSittingEndTime(event.target.value)}
          type="time"
          value={sittingEndTime}
        />
        <input
          className={INPUT_CLASS_NAME}
          min="1"
          onChange={(event) =>
            setAverageConsultationMinutes(event.target.value)
          }
          placeholder="Average minutes"
          type="number"
          value={averageConsultationMinutes}
        />
        <button
          className="h-11 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white"
          onClick={saveSitting}
          type="button"
        >
          Save Sitting
        </button>

        <div className="flex flex-wrap gap-2 md:col-span-5">
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">
            {activeDoctorSitting === undefined
              ? "No active sitting"
              : `${activeDoctorSitting.roomLabel} · ${activeDoctorSitting.status}`}
          </span>
          {activeDoctorSitting?.status === "on-break" ? (
            <button
              className="h-8 rounded-lg bg-emerald-600 px-3 text-[10px] font-black text-white"
              onClick={() => changeSittingStatus("available")}
              type="button"
            >
              Resume Sitting
            </button>
          ) : (
            <button
              className="h-8 rounded-lg bg-amber-500 px-3 text-[10px] font-black text-white disabled:opacity-50"
              disabled={activeDoctorSitting === undefined}
              onClick={() => changeSittingStatus("on-break")}
              type="button"
            >
              Pause Sitting
            </button>
          )}
          <button
            className="h-8 rounded-lg bg-rose-600 px-3 text-[10px] font-black text-white disabled:opacity-50"
            disabled={activeDoctorSitting === undefined}
            onClick={() => changeSittingStatus("finished")}
            type="button"
          >
            End Sitting
          </button>
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">
          Search doctor queue
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <SearchIcon />
        </span>

        <input
          className={[
            INPUT_CLASS_NAME,
            "pl-10",
          ].join(" ")}
          onChange={(
            event,
          ) => {
            setSearchText(
              event.target.value,
            );
          }}
          placeholder="Search patient, MR number, CNIC, token, room or visit reason"
          type="search"
          value={searchText}
        />
      </label>

      {actionMessage !==
      undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <WonFlowKpiCard
          helperText="Patients awaiting their call"
          icon={<QueueIcon />}
          label="Waiting"
          tone="blue"
          value={
            queueStatistics.waiting
          }
        />

        <WonFlowKpiCard
          helperText="Patients called to a room"
          icon={<ClockIcon />}
          label="Called"
          tone="amber"
          value={
            queueStatistics.called
          }
        />

        <WonFlowKpiCard
          helperText="Current active consultations"
          icon={<DoctorIcon />}
          label="In Consultation"
          tone="violet"
          value={
            queueStatistics.serving
          }
        />

        <WonFlowKpiCard
          helperText="Patients temporarily skipped"
          icon={<PatientIcon />}
          label="Skipped"
          tone="rose"
          value={
            queueStatistics.skipped
          }
        />

        <WonFlowKpiCard
          helperText="Clinical encounters opened today"
          icon={<EncounterIcon />}
          label="Encounters Today"
          tone="emerald"
          value={
            queueStatistics
              .encountersToday
          }
        />
      </div>

      <div className="wf-workspace-rail">
        <div className="wf-workspace-rail-side">
          <WonFlowOperationalPanel
          description="Patients assigned to the selected doctor's queue."
          icon={<QueueIcon />}
          status={
            <StatusBadge
              className="bg-blue-50 text-blue-700 ring-blue-100"
              label={`${visibleQueueEntries.length} active`}
            />
          }
          title="My Patient Queue"
          tone="blue"
        >
          {visibleQueueEntries.length ===
          0 ? (
            <WonFlowEmptyState
              description={
                selectedLocation !== undefined &&
                selectedLocation.linkedBranchId === undefined
                  ? "This worklist has no branch-linked demo records for the selected external location."
                  : "No items at this location"
              }
              title="Doctor queue is empty"
            />
          ) : (
            <div className="space-y-3">
              {visibleQueueEntries.map(
                (entry) => {
                  const patient =
                    patientsById.get(
                      entry.patientId,
                    );

                  const appointment =
                    appointmentsById.get(
                      entry.appointmentId,
                    );

                  const selected =
                    selectedQueueEntry
                      ?.id ===
                    entry.id;

                  return (
                    <article
                      className={[
                        "rounded-2xl border",
                        "p-4 transition",
                        selected
                          ? "border-indigo-300 bg-indigo-50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40",
                      ].join(" ")}
                      key={entry.id}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => {
                          selectQueueEntry(
                            entry.id,
                          );
                        }}
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-black text-white">
                            {
                              entry.tokenNumber
                            }
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-slate-950">
                              {patient
                                ?.displayName ??
                                "Unknown patient"}
                            </div>

                            <div className="mt-1 text-xs font-bold text-indigo-600">
                              {patient
                                ?.mrNumber ??
                                "No MR number"}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusBadge
                                className={getQueueStatusClassName(
                                  entry.status,
                                )}
                                label={humanizeValue(
                                  entry.status,
                                )}
                              />

                              <StatusBadge
                                className="bg-slate-100 text-slate-600 ring-slate-200"
                                label={
                                  entry.roomLabel ??
                                  "No room"
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white/80 p-3 ring-1 ring-slate-100">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                              Appointment
                            </div>

                            <div className="mt-1 text-xs font-bold text-slate-700">
                              {appointment ===
                              undefined
                                ? "Unknown"
                                : formatWonFlowDashboardTime(
                                    appointment
                                      .scheduledStartAt,
                                  )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                              Waiting
                            </div>

                            <div className="mt-1 text-xs font-bold text-slate-700">
                              {formatWaitMinutes(
                                calculateDemoQueueWaitMinutes(
                                  entry,
                                ),
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.status ===
                        "waiting" ? (
                          <button
                            className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 ring-1 ring-amber-200"
                            onClick={() => {
                              callPatient(
                                entry,
                              );
                            }}
                            type="button"
                          >
                            Call Patient
                          </button>
                        ) : null}

                        {entry.status ===
                          "called" ||
                        entry.status ===
                          "serving" ? (
                          <button
                            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                            onClick={() => {
                              startConsultation(
                                entry,
                              );
                            }}
                            type="button"
                          >
                            {entry.status ===
                            "serving"
                              ? "Continue Consultation"
                              : "Start Consultation"}
                          </button>
                        ) : null}

                        {entry.status === "serving" &&
                        encounters.some(
                          (encounter) =>
                            encounter.queueEntryId === entry.id &&
                            encounter.status !== "cancelled",
                        ) ? (
                          <button
                            className="h-9 rounded-lg bg-emerald-600 px-3 text-[10px] font-black text-white hover:bg-emerald-700"
                            onClick={() => {
                              finishConsultation(entry);
                            }}
                            type="button"
                          >
                            Finish Consultation
                          </button>
                        ) : null}

                        {entry.status ===
                        "skipped" ? (
                          <button
                            className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                            onClick={() => {
                              returnSkippedPatient(
                                entry,
                              );
                            }}
                            type="button"
                          >
                            Return to Waiting
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
          </WonFlowOperationalPanel>
        </div>

        <div className="wf-workspace-rail-main space-y-6">
          {selectedQueueEntry ===
            undefined ||
          activePatient ===
            undefined ? (
            <WonFlowOperationalPanel
              description="Select a patient from the doctor's queue to view their clinical summary."
              icon={<PatientIcon />}
              title="Patient Clinical Workspace"
              tone="slate"
            >
              <WonFlowEmptyState
                description="No patient is currently selected."
                title="Select a queue patient"
              />
            </WonFlowOperationalPanel>
          ) : (
            <div className="space-y-6">
            <section className="overflow-hidden rounded-[22px] border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_16px_42px_rgba(79,70,229,0.12)]">
              <div className="relative overflow-hidden bg-gradient-to-r from-indigo-100 via-violet-50 to-cyan-100 p-5">
                <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-base font-black text-white shadow-lg shadow-indigo-500/20">
                      {getInitials(
                        activePatient
                          .displayName,
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">
                        Patient Clinical Summary
                      </div>

                      <h2 className="mt-1 truncate text-2xl font-black text-slate-950">
                        {
                          activePatient
                            .displayName
                        }
                      </h2>

                      <div className="mt-1 text-xs font-bold text-slate-600">
                        {
                          activePatient
                            .mrNumber
                        }
                        {" · "}
                        {
                          selectedQueueEntry
                            .tokenNumber
                        }
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    className="border border-indigo-200 bg-white/80 text-indigo-700 ring-0"
                    label={humanizeValue(
                      selectedQueueEntry
                        .status,
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryItem
                  label="Father / Guardian"
                  value={
                    activePatient
                      .draft
                      .fatherName
                  }
                />

                <SummaryItem
                  label="CNIC / B-Form"
                  value={
                    activePatient
                      .draft
                      .cnicNumber
                  }
                />

                <SummaryItem
                  label="Gender and Age"
                  value={[
                    humanizeValue(
                      activePatient
                        .draft
                        .gender,
                    ),

                    patientAge ===
                    undefined
                      ? undefined
                      : `${patientAge} years`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />

                <SummaryItem
                  label="Blood Group"
                  value={
                    activePatient
                      .draft
                      .bloodGroup ||
                    "Not recorded"
                  }
                />

                <SummaryItem
                  label="Mobile Number"
                  value={
                    activePatient
                      .draft
                      .mobileNumber
                  }
                />

                <SummaryItem
                  label="Patient Category"
                  value={humanizeValue(
                    activePatient
                      .draft
                      .patientCategory,
                  )}
                />

                <SummaryItem
                  label="Hospital Branch"
                  value={
                    activeBranch?.name ??
                    "Unknown branch"
                  }
                />

                <SummaryItem
                  label="Consultation Room"
                  value={
                    selectedQueueEntry
                      .roomLabel ??
                    "Not assigned"
                  }
                />
              </div>
            </section>

            <div className="wf-workflow-split">
              <div className="wf-workflow-main">
                <WonFlowOperationalPanel
                description="Appointment context supplied to the doctor before consultation."
                icon={<EncounterIcon />}
                title="Current Visit Information"
                tone="violet"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryItem
                    label="Service"
                    value={
                      activeAppointment
                        ?.serviceName ??
                      selectedQueueEntry
                        .serviceName
                    }
                  />

                  <SummaryItem
                    label="Appointment Number"
                    value={
                      activeAppointment
                        ?.appointmentNumber ??
                      "Not recorded"
                    }
                  />

                  <SummaryItem
                    label="Scheduled Time"
                    value={
                      activeAppointment ===
                      undefined
                        ? "Not recorded"
                        : formatWonFlowDashboardDateTime(
                            activeAppointment
                              .scheduledStartAt,
                          )
                    }
                  />

                  <SummaryItem
                    label="Visit Priority"
                    value={humanizeValue(
                      selectedQueueEntry
                        .priority,
                    )}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                  <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-blue-600">
                    Reason for Visit
                  </div>

                  <p className="mt-2 text-sm leading-6 text-blue-900">
                    {activeAppointment
                      ?.reasonForVisit ??
                      selectedQueueEntry.snapshot?.visit.reasonForVisit ??
                      "No reason for visit was recorded."}
                  </p>
                </div>

                {activeEncounter ===
                undefined ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-sm font-black text-amber-900">
                      Clinical encounter not started
                    </div>

                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      Call the patient and start the consultation to generate an encounter number.
                    </p>

                    <button
                      className="mt-4 min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
                      onClick={() => {
                        startConsultation(
                          selectedQueueEntry,
                        );
                      }}
                      type="button"
                    >
                      Start Consultation
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-600">
                          Active Clinical Encounter
                        </div>

                        <div className="mt-1 text-lg font-black text-emerald-950">
                          {
                            activeEncounter
                              .encounterNumber
                          }
                        </div>
                      </div>

                      <StatusBadge
                        className="bg-white text-emerald-700 ring-emerald-200"
                        label={humanizeValue(
                          activeEncounter
                            .status,
                        )}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <SummaryItem
                        label="Encounter Type"
                        value={humanizeValue(
                          activeEncounter
                            .encounterType,
                        )}
                      />

                      <SummaryItem
                        label="Started"
                        value={formatWonFlowDashboardDateTime(
                          activeEncounter
                            .startedAt,
                        )}
                      />
                    </div>

                    <Link
                      className={[
                        "mt-4 inline-flex",
                        "min-h-11 items-center",
                        "justify-center rounded-xl",
                        "bg-gradient-to-r",
                        "from-violet-600",
                        "to-indigo-600",
                        "px-4 text-sm",
                        "font-bold text-white",
                        "transition",
                        "hover:from-violet-700",
                        "hover:to-indigo-700",
                      ].join(" ")}
                      href={`/doctor/encounters/${encodeURIComponent(
                        activeEncounter.id,
                      )}`}
                    >
                      Open Full Clinical Consultation
                    </Link>
                  </div>
                )}
                </WonFlowOperationalPanel>
              </div>

              <aside className="wf-workflow-aside">
                <WonFlowOperationalPanel
                  description="Available clinical-information status for this patient."
                  icon={<PatientIcon />}
                  title="Clinical Record Readiness"
                  tone="amber"
                >
                <div className="space-y-3">
                  <RecordReadinessItem
                    label="Known Allergies"
                    value="Not yet documented"
                    warning
                  />

                  <RecordReadinessItem
                    label="Chronic Conditions"
                    value="Not yet documented"
                    warning
                  />

                  <RecordReadinessItem
                    label="Current Medication"
                    value="Not yet documented"
                    warning
                  />

                  <RecordReadinessItem
                    label="Previous Encounters"
                    value={`${previousPatientEncounters.length} recorded`}
                  />

                  <RecordReadinessItem
                    label="Emergency Contact"
                    value={
                      activePatient
                        .draft
                        .emergencyContactName ||
                      "Not recorded"
                    }
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-xs leading-5 text-rose-700 ring-1 ring-rose-100">
                  Missing clinical information must be treated as unknown, not as a confirmed negative finding.
                </div>
                </WonFlowOperationalPanel>
              </aside>
            </div>

            {activeEncounter !==
            undefined ? (
              <WonFlowOperationalPanel
                description="Record a short opening note before detailed consultation documentation."
                icon={<DoctorIcon />}
                title="Doctor Opening Note"
                tone="emerald"
              >
                <textarea
                  className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(
                    event,
                  ) => {
                    setNoteDrafts(
                      (currentNotes) => ({
                        ...currentNotes,

                        [activeEncounter.id]:
                          event.target
                            .value,
                      }),
                    );
                  }}
                  placeholder="Initial clinical impression, immediate concern or consultation-opening note"
                  value={
                    noteDrafts[
                      activeEncounter.id
                    ] ??
                    activeEncounter
                      .openingNote
                  }
                />

                <div className="mt-4 flex flex-wrap justify-between gap-3">
                  <div className="text-xs leading-5 text-slate-500">
                    Detailed history, examination, diagnosis, orders and prescription will be added in the next clinical-documentation workflow.
                  </div>

                  <WonFlowActionButton
                    onClick={
                      saveOpeningNote
                    }
                    variant="primary"
                  >
                    Save Opening Note
                  </WonFlowActionButton>
                </div>
              </WonFlowOperationalPanel>
            ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordReadinessItem({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center",
        "justify-between gap-4",
        "rounded-2xl p-3.5",
        "ring-1",
        warning
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-slate-50 text-slate-700 ring-slate-100",
      ].join(" ")}
    >
      <span className="text-xs font-bold">
        {label}
      </span>

      <span className="text-right text-xs font-black">
        {value}
      </span>
    </div>
  );
}

interface DoctorConsultationWorkspaceProps {
  initialQueueEntryId?: string;
}

export function DoctorConsultationWorkspace({
  initialQueueEntryId,
}: DoctorConsultationWorkspaceProps) {
  const hospitalService =
    useWonFlowHospitalService();

  const directories =
    useWonFlowAsyncData({
      key:
        "doctor-consultation:directories",

      loader:
        async (
          signal,
        ) => {
          const practitioners =
            await hospitalService
              .listPractitioners(
                {
                  limit: 100,
                },
                signal,
              );

          return {
            practitioners:
              practitioners.items,
          };
        },

      isEmpty:
        (directory) =>
          directory
            .practitioners
            .length === 0,
    });

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
              href="/operations/queue"
            >
              Reception Queue
            </Link>

            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              href="/doctor"
            >
              Doctor Dashboard
            </Link>
          </div>
        }
        breadcrumbs={[
          {
            label:
              "Doctor Workspace",
            href: "/doctor",
          },
          {
            label:
              "Patient Queue",
          },
          {
            label:
              "Consultations",
          },
        ]}
        description="View assigned patients, begin consultation and create the connected clinical encounter."
        eyebrow="Doctor Workspace"
        leading={<DoctorIcon />}
        metadata={
          <>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 font-bold text-violet-700 ring-1 ring-violet-100">
              Doctor-specific queue
            </span>

            <span>
              Fictional browser-local encounters
            </span>
          </>
        }
        title="Patient Queue and Consultation"
      />

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-4 py-3 text-xs leading-5 text-slate-600">
        <strong className="text-violet-800">
          Demonstration mode:
        </strong>
        {" "}
        Clinical encounters and doctor notes are fictional and stored locally in this browser.
      </div>

      <WonFlowAsyncDataBoundary
        emptyDescription="No practitioners are available for the Doctor Workspace."
        emptyTitle="Doctor Workspace unavailable"
        loadingDescription="WonFlow is preparing practitioners and patient queue information."
        loadingTitle="Preparing Doctor Workspace"
        onRetry={
          directories.reload
        }
        state={directories}
      >
        {(directory) => (
          <DoctorConsultationContent
            initialQueueEntryId={
              initialQueueEntryId
            }
            practitioners={
              directory.practitioners
            }
          />
        )}
      </WonFlowAsyncDataBoundary>
    </div>
  );
}
