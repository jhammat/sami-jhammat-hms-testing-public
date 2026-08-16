"use client";

import {
  notFound,
  useParams,
} from "next/navigation";

import {
  TenantOnboardingWizard,
} from "@/components/onboarding";

import {
  PracticeLocationManagement,
} from "@/components/locations";

import {
  PracticeServiceCatalogueManagement,
} from "@/components/services";

import { DoctorAppointmentsPanel } from "@/components/doctor/doctor-portal-workflow";

export default function DoctorSectionPage() {
  const params =
    useParams();

  const rawSection =
    params.section;

  const section =
    Array.isArray(rawSection)
      ? rawSection[0]
      : rawSection;

  if (section === "setup") {
    return (
      <TenantOnboardingWizard />
    );
  }

  if (section === "locations") {
    return (
      <PracticeLocationManagement />
    );
  }

  if (section === "services") {
    return (
      <PracticeServiceCatalogueManagement />
    );
  }

  if (section === "appointments") {
    return <DoctorAppointmentsPanel />;
  }

  /**
   * Every real doctor section owns an explicit route segment. Anything else is
   * either a deferred Phase 2 module (`queue`, `inpatients`) or a typo, and
   * must 404 rather than render a placeholder that implies the screen exists.
   */
  notFound();
}
