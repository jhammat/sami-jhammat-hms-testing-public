"use client";

import type {
  MockPatient,
  MockPractitioner,
} from "@wonflow/mock-data";

import {
  useWonFlowHospitalService,
} from "@/app/_providers";

import {
  useWonFlowAsyncData,
} from "@/lib/data";

import type {
  UseWonFlowAsyncDataResult,
} from "@/lib/data";

import {
  loadWonFlowDoctorDashboard,
  loadWonFlowManagementDashboard,
  loadWonFlowOperationsDashboard,
  loadWonFlowPatientDashboard,
  loadWonFlowPlatformDashboard,
} from "./loaders";

import type {
  WonFlowDoctorDashboardProjection,
  WonFlowManagementDashboardProjection,
  WonFlowOperationsDashboardProjection,
  WonFlowPatientDashboardProjection,
  WonFlowPlatformDashboardProjection,
} from "./types";

export function useWonFlowPlatformDashboard():
  UseWonFlowAsyncDataResult<
    WonFlowPlatformDashboardProjection
  > {
  const hospitalService =
    useWonFlowHospitalService();

  return useWonFlowAsyncData({
    key:
      "dashboard:platform",

    loader: (signal) =>
      loadWonFlowPlatformDashboard(
        hospitalService,
        signal,
      ),
  });
}

export function useWonFlowOperationsDashboard():
  UseWonFlowAsyncDataResult<
    WonFlowOperationsDashboardProjection
  > {
  const hospitalService =
    useWonFlowHospitalService();

  return useWonFlowAsyncData({
    key:
      "dashboard:operations",

    loader: (signal) =>
      loadWonFlowOperationsDashboard(
        hospitalService,
        signal,
      ),
  });
}

export function useWonFlowManagementDashboard():
  UseWonFlowAsyncDataResult<
    WonFlowManagementDashboardProjection
  > {
  const hospitalService =
    useWonFlowHospitalService();

  return useWonFlowAsyncData({
    key:
      "dashboard:management",

    loader: (signal) =>
      loadWonFlowManagementDashboard(
        hospitalService,
        signal,
      ),
  });
}

export function useWonFlowDoctorDashboard(
  practitionerId:
    MockPractitioner["id"] |
    undefined,
): UseWonFlowAsyncDataResult<
  WonFlowDoctorDashboardProjection
> {
  const hospitalService =
    useWonFlowHospitalService();

  const enabled =
    practitionerId !== undefined;

  return useWonFlowAsyncData({
    key:
      `dashboard:doctor:${
        practitionerId ??
        "unselected"
      }`,

    enabled,

    loader: (signal) => {
      if (
        practitionerId ===
        undefined
      ) {
        throw new Error(
          "A practitioner must be selected.",
        );
      }

      return loadWonFlowDoctorDashboard(
        hospitalService,
        practitionerId,
        signal,
      );
    },
  });
}

export function useWonFlowPatientDashboard(
  patientId:
    MockPatient["id"] |
    undefined,
): UseWonFlowAsyncDataResult<
  WonFlowPatientDashboardProjection
> {
  const hospitalService =
    useWonFlowHospitalService();

  const enabled =
    patientId !== undefined;

  return useWonFlowAsyncData({
    key:
      `dashboard:patient:${
        patientId ??
        "unselected"
      }`,

    enabled,

    loader: (signal) => {
      if (
        patientId === undefined
      ) {
        throw new Error(
          "A patient must be selected.",
        );
      }

      return loadWonFlowPatientDashboard(
        hospitalService,
        patientId,
        signal,
      );
    },
  });
}
