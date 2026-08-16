"use client";

/**
 * Owner-facing practice-location and schedule management.
 *
 * Not yet built: this currently only confirms the tenant loads and shows a
 * placeholder — see docs/release/phase-one-readiness.md for status. All
 * reads and writes should go through WonFlowPracticeService once it is.
 */

import {
  useEffect,
  useState,
} from "react";

import {
  useWonFlowApplication,
} from "@/app/_providers";

export function PracticeLocationManagement() {
  const {
    practiceTenant,
  } = useWonFlowApplication();

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | undefined>();

  useEffect(
    () => {
      let active = true;

      async function load():
        Promise<void> {
        try {
          await practiceTenant;

          if (!active) {
            return;
          }
        } catch (error) {
          if (active) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Locations could not be loaded.",
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    },
    [practiceTenant],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-sm text-slate-600">
            Loading locations…
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Practice Locations
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Manage your practice locations,
          clinic sessions, and schedule
          overrides.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-600">
          Location management interface loading…
        </p>
      </div>
    </div>
  );
}
