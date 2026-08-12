import {
  calculatePatientAge,
  normalizePatientCnic,
  normalizePatientPhone,
} from "./registration";

import type {
  DemoPatientRegistrationResult,
  PatientRegistrationGender,
} from "./registration";

export type PatientDirectoryGenderFilter =
  | "all"
  | PatientRegistrationGender;

export type PatientDirectorySort =
  | "recent"
  | "name-ascending"
  | "mr-ascending"
  | "age-ascending"
  | "age-descending";

export interface PatientDirectoryFilters {
  query: string;

  branchId: string;

  gender:
    PatientDirectoryGenderFilter;

  minimumAge: string;
  maximumAge: string;

  sort:
    PatientDirectorySort;
}

export interface PatientDirectoryStatistics {
  totalPatients: number;
  filteredPatients: number;

  femalePatients: number;
  malePatients: number;

  insurancePatients: number;
}

export function createInitialPatientDirectoryFilters():
  PatientDirectoryFilters {
  return {
    query: "",

    branchId: "all",

    gender: "all",

    minimumAge: "",
    maximumAge: "",

    sort: "recent",
  };
}

export function getDemoPatientRegistrationAge(
  registration:
    DemoPatientRegistrationResult,
): number | undefined {
  const dateOfBirth =
    registration.draft
      .dateOfBirth ?? "";

  const calculatedAge =
    calculatePatientAge(
      dateOfBirth,
    );

  if (
    calculatedAge !== undefined
  ) {
    return calculatedAge;
  }

  const estimatedAgeValue =
    registration.draft
      .estimatedAge ?? "";

  if (
    estimatedAgeValue === ""
  ) {
    return undefined;
  }

  const estimatedAge =
    Number(
      estimatedAgeValue,
    );

  if (
    !Number.isInteger(
      estimatedAge,
    ) ||
    estimatedAge < 0 ||
    estimatedAge > 130
  ) {
    return undefined;
  }

  return estimatedAge;
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function patientMatchesQuery(
  registration:
    DemoPatientRegistrationResult,

  query: string,
): boolean {
  const normalizedQuery =
    normalizeSearchText(
      query,
    );

  if (
    normalizedQuery === ""
  ) {
    return true;
  }

  const compactQuery =
    normalizedQuery.replace(
      /[\s\-()]/g,
      "",
    );

  const searchableText = [
    registration.displayName,
    registration.mrNumber,

    registration.draft
      .givenName ?? "",

    registration.draft
      .middleName ?? "",

    registration.draft
      .fatherName ?? "",

    registration.draft
      .cnicNumber ?? "",

    registration.draft
      .mobileNumber ?? "",

    registration.draft
      .alternateMobileNumber ?? "",

    registration.draft
      .emailAddress ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();

  if (
    searchableText.includes(
      normalizedQuery,
    )
  ) {
    return true;
  }

  const normalizedCnic =
    normalizePatientCnic(
      registration.draft
        .cnicNumber ?? "",
    );

  const normalizedMobile =
    normalizePatientPhone(
      registration.draft
        .mobileNumber ?? "",
    ).replace("+", "");

  const normalizedAlternateMobile =
    normalizePatientPhone(
      registration.draft
        .alternateMobileNumber ?? "",
    ).replace("+", "");

  return (
    normalizedCnic.includes(
      compactQuery,
    ) ||
    normalizedMobile.includes(
      compactQuery.replace("+", ""),
    ) ||
    normalizedAlternateMobile.includes(
      compactQuery.replace("+", ""),
    )
  );
}

function parseAgeFilter(
  value: string,
): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsedValue =
    Number(value);

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue < 0 ||
    parsedValue > 130
  ) {
    return undefined;
  }

  return parsedValue;
}

function comparePatientNames(
  left:
    DemoPatientRegistrationResult,

  right:
    DemoPatientRegistrationResult,
): number {
  return left.displayName.localeCompare(
    right.displayName,
    "en",
    {
      sensitivity: "base",
    },
  );
}

export function filterAndSortPatientRegistrations(
  registrations:
    readonly DemoPatientRegistrationResult[],

  filters:
    PatientDirectoryFilters,
): DemoPatientRegistrationResult[] {
  const minimumAge =
    parseAgeFilter(
      filters.minimumAge,
    );

  const maximumAge =
    parseAgeFilter(
      filters.maximumAge,
    );

  const filteredRegistrations =
    registrations.filter(
      (registration) => {
        if (
          !patientMatchesQuery(
            registration,
            filters.query,
          )
        ) {
          return false;
        }

        if (
          filters.branchId !==
            "all" &&
          registration.draft
            .branchId !==
            filters.branchId
        ) {
          return false;
        }

        if (
          filters.gender !==
            "all" &&
          registration.draft
            .gender !==
            filters.gender
        ) {
          return false;
        }

        const patientAge =
          getDemoPatientRegistrationAge(
            registration,
          );

        if (
          minimumAge !==
            undefined &&
          (
            patientAge ===
              undefined ||
            patientAge <
              minimumAge
          )
        ) {
          return false;
        }

        if (
          maximumAge !==
            undefined &&
          (
            patientAge ===
              undefined ||
            patientAge >
              maximumAge
          )
        ) {
          return false;
        }

        return true;
      },
    );

  return [
    ...filteredRegistrations,
  ].sort(
    (
      left,
      right,
    ) => {
      switch (filters.sort) {
        case "name-ascending":
          return comparePatientNames(
            left,
            right,
          );

        case "mr-ascending":
          return left.mrNumber.localeCompare(
            right.mrNumber,
            "en",
            {
              numeric: true,
            },
          );

        case "age-ascending": {
          const leftAge =
            getDemoPatientRegistrationAge(
              left,
            ) ??
            Number.MAX_SAFE_INTEGER;

          const rightAge =
            getDemoPatientRegistrationAge(
              right,
            ) ??
            Number.MAX_SAFE_INTEGER;

          return (
            leftAge -
            rightAge
          );
        }

        case "age-descending": {
          const leftAge =
            getDemoPatientRegistrationAge(
              left,
            ) ??
            -1;

          const rightAge =
            getDemoPatientRegistrationAge(
              right,
            ) ??
            -1;

          return (
            rightAge -
            leftAge
          );
        }

        case "recent":
          return (
            new Date(
              right.registeredAt,
            ).getTime() -
            new Date(
              left.registeredAt,
            ).getTime()
          );
      }
    },
  );
}

export function calculatePatientDirectoryStatistics(
  registrations:
    readonly DemoPatientRegistrationResult[],

  filteredRegistrations:
    readonly DemoPatientRegistrationResult[],
): PatientDirectoryStatistics {
  return {
    totalPatients:
      registrations.length,

    filteredPatients:
      filteredRegistrations.length,

    femalePatients:
      registrations.filter(
        (registration) =>
          registration.draft
            .gender ===
          "female",
      ).length,

    malePatients:
      registrations.filter(
        (registration) =>
          registration.draft
            .gender ===
          "male",
      ).length,

    insurancePatients:
      registrations.filter(
        (registration) =>
          registration.draft
            .patientCategory ===
            "insurance" ||
          registration.draft
            .patientCategory ===
            "corporate",
      ).length,
  };
}