"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  IsoDateTime,
  PracticeClinicSession,
  PracticeLocation,
  PracticeScheduleOverride,
  WonFlowId,
} from "@wonflow/contracts";

import {
  useWonFlowApplication,
} from "@/app/_providers";

import {
  findNextPracticeClinic,
} from "./practice-location-schedule";

export const ALL_PRACTICE_LOCATIONS = "all" as const;

export type PracticeLocationSelection =
  | typeof ALL_PRACTICE_LOCATIONS
  | WonFlowId;

export interface PracticeLocationNextClinic {
  practiceLocationId: WonFlowId;
  clinicSessionId?: WonFlowId;
  source: "recurring-session" | "schedule-override";
  startsAt: IsoDateTime;
  localDate: string;
  localStartTime: string;
  timezone: string;
}

export interface PracticeLocationContextState {
  locations: PracticeLocation[];
  clinicSessions: PracticeClinicSession[];
  scheduleOverrides: PracticeScheduleOverride[];
  selectedLocationId: PracticeLocationSelection;
  selectedLocation?: PracticeLocation;
  nextClinic?: PracticeLocationNextClinic;
  loading: boolean;
  error?: string;
  selectLocation(locationId: PracticeLocationSelection): void;
  matchesPracticeLocation(practiceLocationId: WonFlowId): boolean;
  matchesLegacyBranch(branchId: WonFlowId): boolean;
}

const PracticeLocationContext =
  createContext<PracticeLocationContextState | undefined>(undefined);

const PRACTICE_LOCATION_STORAGE_PREFIX =
  "wonflow:practice-location";

function getLocationStorageKey(
  organizationId: WonFlowId,
): string {
  return [
    PRACTICE_LOCATION_STORAGE_PREFIX,
    organizationId,
  ].join(":");
}

export function PracticeLocationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();
  const [locations, setLocations] = useState<PracticeLocation[]>([]);
  const [clinicSessions, setClinicSessions] =
    useState<PracticeClinicSession[]>([]);
  const [scheduleOverrides, setScheduleOverrides] =
    useState<PracticeScheduleOverride[]>([]);
  const [selectedLocationId, setSelectedLocationId] =
    useState<PracticeLocationSelection>(ALL_PRACTICE_LOCATIONS);
  const [organizationId, setOrganizationId] = useState<WonFlowId>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      try {
        const tenant = await practiceTenant;
        const [nextLocations, nextSessions, nextOverrides] =
          await Promise.all([
            practiceService.practiceLocations.list(tenant.scope),
            practiceService.clinicSessions.list(tenant.scope),
            practiceService.scheduleOverrides.list(tenant.scope),
          ]);
        if (!active) return;

        const selectable = nextLocations.items
          .filter((location) => location.status === "active")
          .sort((left, right) => left.name.localeCompare(right.name));
        const stored = window.sessionStorage.getItem(
          getLocationStorageKey(tenant.scope.organizationId),
        );
        const restored = stored !== null && selectable.some(
          (location) => location.id === stored,
        )
          ? stored
          : selectable.length === 1
            ? selectable[0]!.id
            : ALL_PRACTICE_LOCATIONS;

        setOrganizationId(tenant.scope.organizationId);
        setLocations(selectable);
        setClinicSessions(nextSessions.items);
        setScheduleOverrides(nextOverrides.items);
        setSelectedLocationId(restored);
        setError(undefined);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Practice locations could not be loaded.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [practiceService, practiceTenant]);

  useEffect(() => {
    if (organizationId === undefined || loading) return;
    window.sessionStorage.setItem(
      getLocationStorageKey(organizationId),
      selectedLocationId,
    );
  }, [loading, organizationId, selectedLocationId]);

  const selectedLocation = locations.find(
    (location) => location.id === selectedLocationId,
  );

  const selectLocation = useCallback(
    (locationId: PracticeLocationSelection): void => {
      if (locations.length === 0) {
        setSelectedLocationId(ALL_PRACTICE_LOCATIONS);
        return;
      }
      if (locations.length === 1) {
        setSelectedLocationId(locations[0]!.id);
        return;
      }
      if (
        locationId === ALL_PRACTICE_LOCATIONS ||
        locations.some((location) => location.id === locationId)
      ) {
        setSelectedLocationId(locationId);
      }
    },
    [locations],
  );

  const matchesPracticeLocation = useCallback(
    (practiceLocationId: WonFlowId): boolean =>
      selectedLocationId === ALL_PRACTICE_LOCATIONS ||
      selectedLocationId === practiceLocationId,
    [selectedLocationId],
  );

  const matchesLegacyBranch = useCallback(
    (branchId: WonFlowId): boolean => {
      if (selectedLocationId === ALL_PRACTICE_LOCATIONS) return true;
      return (
        selectedLocation?.linkedBranchId !== undefined &&
        selectedLocation.linkedBranchId === branchId
      );
    },
    [selectedLocation, selectedLocationId],
  );

  const nextClinic = useMemo(
    () => findNextPracticeClinic(
      locations,
      clinicSessions,
      scheduleOverrides,
      selectedLocationId,
      new Date(),
    ),
    [clinicSessions, locations, scheduleOverrides, selectedLocationId],
  );

  const value = useMemo<PracticeLocationContextState>(
    () => ({
      locations,
      clinicSessions,
      scheduleOverrides,
      selectedLocationId,
      ...(selectedLocation === undefined ? {} : { selectedLocation }),
      ...(nextClinic === undefined ? {} : { nextClinic }),
      loading,
      ...(error === undefined ? {} : { error }),
      selectLocation,
      matchesPracticeLocation,
      matchesLegacyBranch,
    }),
    [
      clinicSessions,
      error,
      loading,
      locations,
      matchesLegacyBranch,
      matchesPracticeLocation,
      nextClinic,
      scheduleOverrides,
      selectLocation,
      selectedLocation,
      selectedLocationId,
    ],
  );

  return (
    <PracticeLocationContext.Provider value={value}>
      {children}
    </PracticeLocationContext.Provider>
  );
}

export function usePracticeLocation(): PracticeLocationContextState {
  const context = useContext(PracticeLocationContext);
  if (context === undefined) {
    throw new Error(
      "usePracticeLocation must be used inside PracticeLocationProvider.",
    );
  }
  return context;
}
