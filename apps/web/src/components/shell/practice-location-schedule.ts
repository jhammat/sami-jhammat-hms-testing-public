import type {
  PracticeClinicSession,
  PracticeLocation,
  PracticeScheduleOverride,
} from "@wonflow/contracts";

import {
  isPracticeClinicSessionEffectiveOn,
} from "@wonflow/contracts";

import {
  addPracticeCalendarDays,
  getPracticeCalendarWeekday,
  getPracticeLocalDate,
  practiceLocalDateTimeToDate,
} from "@wonflow/mock-data";

export { practiceLocalDateTimeToDate } from "@wonflow/mock-data";

import type {
  PracticeLocationNextClinic,
  PracticeLocationSelection,
} from "./practice-location-context";

function isBlockingOverride(
  override: PracticeScheduleOverride,
): boolean {
  if (override.capacityOverride === 0) return true;
  if (override.createsAvailability) return false;
  return !(
    override.type === "capacity-change" &&
    override.capacityOverride !== undefined &&
    override.capacityOverride > 0
  );
}

function makeCandidate(
  location: PracticeLocation,
  localDate: string,
  localStartTime: string,
  source: PracticeLocationNextClinic["source"],
  clinicSessionId?: string,
  timezone = location.timezone,
): PracticeLocationNextClinic | undefined {
  const startsAt = practiceLocalDateTimeToDate(
    localDate,
    localStartTime,
    timezone,
  );
  if (Number.isNaN(startsAt.getTime())) return undefined;

  return {
    practiceLocationId: location.id,
    ...(clinicSessionId === undefined ? {} : { clinicSessionId }),
    source,
    startsAt: startsAt.toISOString(),
    localDate,
    localStartTime,
    timezone,
  };
}

export function findNextPracticeClinic(
  locations: readonly PracticeLocation[],
  clinicSessions: readonly PracticeClinicSession[],
  scheduleOverrides: readonly PracticeScheduleOverride[],
  selection: PracticeLocationSelection,
  now: Date,
): PracticeLocationNextClinic | undefined {
  const activeLocations = locations.filter(
    (location) =>
      location.status === "active" &&
      (
        selection === "all" ||
        location.id === selection
      ),
  );
  const activeLocationIds = new Set(
    activeLocations.map((location) => location.id),
  );
  const locationsById = new Map(
    activeLocations.map((location) => [location.id, location]),
  );
  const activeOverrides = scheduleOverrides.filter(
    (override) => override.status === "active",
  );
  const candidates: PracticeLocationNextClinic[] = [];

  for (const location of activeLocations) {
    const firstDate = getPracticeLocalDate(now, location.timezone);

    for (let offset = 0; offset <= 370; offset += 1) {
      const localDate = addPracticeCalendarDays(firstDate, offset);
      const dateOverrides = activeOverrides.filter(
        (override) => override.date === localDate,
      );

      for (const session of clinicSessions) {
        if (
          session.practiceLocationId !== location.id ||
          session.weekday !== getPracticeCalendarWeekday(localDate) ||
          !isPracticeClinicSessionEffectiveOn(session, localDate)
        ) {
          continue;
        }

        const relevantOverrides = dateOverrides.filter(
          (override) =>
            override.clinicSessionId === session.id ||
            (
              override.clinicSessionId === undefined &&
              override.practiceLocationId === location.id
            ),
        );
        const moved = relevantOverrides.some(
          (override) =>
            override.clinicSessionId === session.id &&
            [
              "temporary-time-change",
              "temporary-location-change",
            ].includes(override.type),
        );

        if (
          session.capacity <= 0 ||
          moved ||
          relevantOverrides.some(isBlockingOverride)
        ) {
          continue;
        }

        const candidate = makeCandidate(
          location,
          localDate,
          session.localStartTime,
          "recurring-session",
          session.id,
          session.timezone,
        );
        if (
          candidate !== undefined &&
          new Date(candidate.startsAt).getTime() > now.getTime()
        ) {
          candidates.push(candidate);
        }
      }

      for (const override of dateOverrides) {
        if (
          !override.createsAvailability ||
          override.capacityOverride === 0 ||
          override.localStartTime === undefined ||
          override.localEndTime === undefined ||
          !activeLocationIds.has(override.practiceLocationId)
        ) {
          continue;
        }
        const overrideLocation = locationsById.get(
          override.practiceLocationId,
        );
        if (overrideLocation === undefined) continue;
        const candidate = makeCandidate(
          overrideLocation,
          localDate,
          override.localStartTime,
          "schedule-override",
          override.clinicSessionId,
        );
        if (
          candidate !== undefined &&
          new Date(candidate.startsAt).getTime() > now.getTime()
        ) {
          candidates.push(candidate);
        }
      }
    }
  }

  return candidates.sort(
    (left, right) => left.startsAt.localeCompare(right.startsAt),
  )[0];
}

export function formatPracticeNextClinic(
  nextClinic: PracticeLocationNextClinic,
  location: PracticeLocation,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: nextClinic.timezone || location.timezone,
    timeZoneName: "short",
  }).format(new Date(nextClinic.startsAt));
}
