"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Compass,
  Dumbbell,
  Footprints,
  HeartPulse,
  Mail,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Upload,
  UserRound,
  Utensils,
} from "lucide-react";

import { DonutChart, StatTile, type DonutSlice } from "@/components/charts";

import {
  PhaseOneAccentButton,
  PhaseOneEmptyState,
  PhaseOneField,
  PhaseOneInput,
  PhaseOneNotice,
  PhaseOnePanel,
  PhaseOneQuietButton,
  PhaseOneSelect,
  PhaseOneSkeleton,
  PhaseOneStatusPill,
  PhaseOneWorkspaceHero,
  type PhaseOneAccent,
} from "@/components/phase-one-design";

export type AlliedSpecialty = "PHYSIOTHERAPY" | "NUTRITION";

interface AlliedProfileView {
  identity: { email: string | null };
  membership: {
    id: string;
    displayName: string;
    preferredLocale: string;
    primaryBranchId: string | null;
    primaryBranchName: string | null;
    workspaceCodes: string[];
    primaryWorkspace: string | null;
    status: string;
    hasPhoto: boolean;
  };
  staff: {
    id: string;
    employeeNumber: string;
    staffType: string;
    title: string | null;
    status: string;
    branchId: string | null;
    branchName: string | null;
    since: string;
  };
  permissions: string[];
  branches: { id: string; name: string }[];
  caseload: {
    totalReferrals: number;
    byStatus: { name: string; count: number }[];
    byPriority: { name: string; count: number }[];
    assessmentsRecorded: number;
    sessionsRecorded: number;
    plansPublished: number;
    patientsSeen: number;
  };
  preferences?: {
    clinicalFocus: string[];
    dailyStepGoal: string;
    spirometryGoal: string;
  };
}

const SPECIALTY_PRESENTATION: Record<
  AlliedSpecialty,
  { accent: PhaseOneAccent; eyebrow: string; discipline: string; gradient: string }
> = {
  PHYSIOTHERAPY: {
    accent: "teal",
    eyebrow: "Allied Health · Physiotherapy & Mobility",
    discipline: "Physiotherapy & Mobility",
    gradient: "from-teal-600 to-indigo-600",
  },
  NUTRITION: {
    accent: "emerald",
    eyebrow: "Allied Health · Clinical Nutrition & Dietetics",
    discipline: "Nutrition & Dietetics",
    gradient: "from-emerald-600 to-teal-600",
  },
};

const PT_FOCUS_AREAS = [
  "ERAS® Post-Surgical Mobilization",
  "HPB & Upper GI Rehabilitation",
  "ICU & Critical Care Mobility",
  "Cardiopulmonary Recovery",
  "Thoracic Spirometry & Respiratory",
  "Gait & Functional Re-education",
];

const NUTRITION_FOCUS_AREAS = [
  "Surgical Oncology Nutrition",
  "PERT (Creon) Titration & Monitoring",
  "Post-Whipple Diet Progression",
  "Enteral & Parenteral (TPN) Feeding",
  "Hepatic & Glycemic Optimization",
  "Protein Sparing & Reconditioning",
];

const LOCALES = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
];

function humanize(value: string): string {
  return value
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}

export function AlliedProfileWorkspace({ specialty }: { specialty: AlliedSpecialty }) {
  const presentation = SPECIALTY_PRESENTATION[specialty];

  const [profile, setProfile] = useState<AlliedProfileView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [staffType, setStaffType] = useState(
    specialty === "NUTRITION" ? "NUTRITIONIST" : "PHYSIOTHERAPIST",
  );
  const [primaryBranchId, setPrimaryBranchId] = useState("");
  const [preferredLocale, setPreferredLocale] = useState("en");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [initialFocus, setInitialFocus] = useState<string[]>([]);
  const [dailyStepGoal, setDailyStepGoal] = useState("100m (corridor)");
  const [initialDailyStepGoal, setInitialDailyStepGoal] = useState("100m (corridor)");
  const [spirometryGoal, setSpirometryGoal] = useState("1500 mL q1h");
  const [initialSpirometryGoal, setInitialSpirometryGoal] = useState("1500 mL q1h");

  const [photoVersion, setPhotoVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyProfile = useCallback((next: AlliedProfileView) => {
    setProfile(next);
    setDisplayName(next.membership.displayName);
    setTitle(next.staff.title ?? "");
    setStaffType(next.staff.staffType || (specialty === "NUTRITION" ? "NUTRITIONIST" : "PHYSIOTHERAPIST"));
    setPrimaryBranchId(next.membership.primaryBranchId ?? next.staff.branchId ?? "");
    setPreferredLocale(next.membership.preferredLocale || "en");

    const defaultFocus =
      specialty === "NUTRITION"
        ? [NUTRITION_FOCUS_AREAS[0]!, NUTRITION_FOCUS_AREAS[1]!]
        : [PT_FOCUS_AREAS[0]!, PT_FOCUS_AREAS[1]!];
    const loadedFocus =
      next.preferences?.clinicalFocus && Array.isArray(next.preferences.clinicalFocus)
        ? next.preferences.clinicalFocus
        : defaultFocus;
    setSelectedFocus(loadedFocus);
    setInitialFocus(loadedFocus);

    const defaultStep = specialty === "NUTRITION" ? "25-30 kcal/kg/day" : "100m (corridor)";
    const loadedStep = next.preferences?.dailyStepGoal || defaultStep;
    setDailyStepGoal(loadedStep);
    setInitialDailyStepGoal(loadedStep);

    const defaultSpirometry = specialty === "NUTRITION" ? "1.5 g/kg/day" : "1500 mL q1h";
    const loadedSpirometry = next.preferences?.spirometryGoal || defaultSpirometry;
    setSpirometryGoal(loadedSpirometry);
    setInitialSpirometryGoal(loadedSpirometry);
  }, [specialty]);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/allied/profile?specialty=${specialty}`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? "Your profile could not be loaded. Try again.",
        );
      }

      applyProfile(data.profile);
      setNotice(null);
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your profile could not be loaded. Try again.",
      });
    }
  }, [specialty, applyProfile]);

  useEffect(() => {
    let active = true;

    void (async () => {
      await load();
      if (active) setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [load]);

  async function refresh() {
    setIsLoading(true);
    await load();
    setIsLoading(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(`/api/v1/allied/profile?specialty=${specialty}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          displayName: displayName.trim(),
          title: title.trim() || null,
          staffType,
          primaryBranchId: primaryBranchId || null,
          preferredLocale,
          clinicalFocus: selectedFocus,
          dailyStepGoal: dailyStepGoal.trim(),
          spirometryGoal: spirometryGoal.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "Your profile could not be saved.");
      }

      applyProfile(data.profile);
      setNotice({ tone: "success", message: "Your clinician profile and practice preferences have been successfully saved." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Your profile could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setNotice(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/v1/allied/profile/avatar", {
        method: "POST",
        credentials: "include",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "The photo could not be uploaded.");
      }

      setPhotoVersion((previous) => previous + 1);
      await load();
      setNotice({ tone: "success", message: "Profile photo updated." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "The photo could not be uploaded.",
      });
    }
  }

  async function handleRemovePhoto() {
    setNotice(null);

    try {
      const response = await fetch("/api/v1/allied/profile/avatar", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error?.message ?? "The photo could not be removed.");
      }

      setPhotoVersion((previous) => previous + 1);
      await load();
      setNotice({ tone: "success", message: "Profile photo removed." });
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error ? error.message : "The photo could not be removed.",
      });
    }
  }

  const isDirty = useMemo(() => {
    if (!profile) return false;
    const focusChanged =
      JSON.stringify([...selectedFocus].sort()) !==
      JSON.stringify([...initialFocus].sort());
    const stepGoalChanged = dailyStepGoal.trim() !== initialDailyStepGoal.trim();
    const spirometryGoalChanged = spirometryGoal.trim() !== initialSpirometryGoal.trim();

    return (
      displayName !== profile.membership.displayName ||
      title !== (profile.staff.title ?? "") ||
      staffType !== profile.staff.staffType ||
      primaryBranchId !==
        (profile.membership.primaryBranchId ?? profile.staff.branchId ?? "") ||
      preferredLocale !== (profile.membership.preferredLocale || "en") ||
      focusChanged ||
      stepGoalChanged ||
      spirometryGoalChanged
    );
  }, [
    profile,
    displayName,
    title,
    staffType,
    primaryBranchId,
    preferredLocale,
    selectedFocus,
    initialFocus,
    dailyStepGoal,
    initialDailyStepGoal,
    spirometryGoal,
    initialSpirometryGoal,
  ]);

  const initials = useMemo(() => {
    if (!profile) return "—";
    const parts = profile.membership.displayName.trim().split(/\s+/);
    if (parts.length === 0 || parts[0]!.length === 0) return "—";
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }, [profile]);

  const statusMix: DonutSlice[] = useMemo(() => {
    if (!profile) return [];
    return profile.caseload.byStatus.map((row) => ({
      id: row.name,
      label: humanize(row.name),
      value: row.count,
    }));
  }, [profile]);

  return (
    <div className="w-full space-y-6 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Workspace Hero */}
      <PhaseOneWorkspaceHero
        accent={presentation.accent}
        eyebrow={presentation.eyebrow}
        title="Clinician Profile & Practice Settings"
        description="Manage your clinical identity, credentials, hospital department assignment, practice protocols, and workspace permissions."
        actions={
          <PhaseOneQuietButton onClick={() => void refresh()}>
            <RefreshCw aria-hidden size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </PhaseOneQuietButton>
        }
      />

      {notice ? (
        <PhaseOneNotice
          tone={notice.tone}
          title={notice.message}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {/* Discipline Quick Navigation Bridge */}
      <div className="rounded-3xl border border-slate-200/80 bg-linear-to-r from-slate-50 via-white to-slate-100/50 p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Active Clinical Workspace
            </span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Direct access to your clinical studio and inpatient surgical care plans
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {specialty === "PHYSIOTHERAPY" ? (
              <>
                <Link
                  href="/operations/physiotherapy?view=caseload"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-teal-500 transition"
                >
                  <Activity size={13} /> Caseload
                </Link>
                <Link
                  href="/operations/physiotherapy?view=pathways"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Footprints size={13} /> Recovery Pathways
                </Link>
                <Link
                  href="/operations/physiotherapy?view=studio"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Dumbbell size={13} /> Exercise Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/operations/nutrition"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-500 transition"
                >
                  <Utensils size={13} /> Nutrition Studio
                </Link>
                <Link
                  href="/operations/nutrition?view=calculators"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <HeartPulse size={13} /> PERT Titration
                </Link>
              </>
            )}

            {/*
              This opened `/doctor/careplans`, which is the surgeon's portal
              and not an allied clinician's to enter. Their own deck shows the
              same recovery — care plan, day number and managing surgeon —
              from the side of it they actually work on.
            */}
            <Link
              href={
                specialty === "PHYSIOTHERAPY"
                  ? "/operations/physiotherapy?view=overview"
                  : "/operations/nutrition?view=overview"
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <HeartPulse size={13} /> Care Plan Overview
            </Link>
          </div>
        </div>
      </div>

      {isLoading && !profile ? (
        <PhaseOneSkeleton rows={4} height={120} />
      ) : profile ? (
        <div className="space-y-6">
          {/* KPI Tiles */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Total Referrals"
              value={profile.caseload.totalReferrals}
              icon={<ClipboardList aria-hidden size={16} />}
              hint={`${profile.caseload.patientsSeen} unique patients`}
            />

            <StatTile
              label="Assessments Recorded"
              value={profile.caseload.assessmentsRecorded}
              icon={<BadgeCheck aria-hidden size={16} />}
              status="good"
              hint="Authored by your account"
            />

            {specialty === "PHYSIOTHERAPY" ? (
              <StatTile
                label="Therapy Sessions"
                value={profile.caseload.sessionsRecorded}
                icon={<Activity aria-hidden size={16} />}
                status="good"
                hint="Clinical rehabilitation logs"
              />
            ) : (
              <StatTile
                label="Dietary Plans Published"
                value={profile.caseload.plansPublished}
                icon={<Utensils aria-hidden size={16} />}
                status="good"
                hint="Active meal & PERT plans"
              />
            )}

            <StatTile
              label="Permissions Granted"
              value={profile.permissions.length}
              icon={<ShieldCheck aria-hidden size={16} />}
              hint="Active hospital privileges"
            />
          </section>

          {/* Main Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Identity Card */}
            <div className="lg:col-span-4">
              <div className="space-y-4 lg:sticky lg:top-4">
                <PhaseOnePanel>
                  <div className="flex flex-col items-center text-center">
                    {profile.membership.hasPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`Profile portrait of ${profile.membership.displayName}`}
                        src={`/api/v1/allied/profile/avatar/file?v=${photoVersion}`}
                        className="h-28 w-28 rounded-full object-cover ring-4 ring-white shadow-md"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br ${presentation.gradient} text-3xl font-bold text-white ring-4 ring-white shadow-md`}
                      >
                        {initials}
                      </span>
                    )}

                    <h2 className="mt-4 text-base font-bold tracking-tight text-slate-900 dark:text-white">
                      {profile.membership.displayName}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {profile.staff.title || presentation.discipline}
                    </p>

                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      <PhaseOneStatusPill
                        label={humanize(profile.staff.status)}
                        tone={profile.staff.status === "ACTIVE" ? "success" : "warning"}
                      />

                      <PhaseOneStatusPill
                        label={humanize(profile.staff.staffType)}
                        tone="information"
                      />
                    </div>

                    <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Upload aria-hidden size={14} />
                      {profile.membership.hasPhoto ? "Replace photo" : "Upload photo"}
                      <input
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => void handlePhoto(event.target.files?.[0])}
                        type="file"
                      />
                    </label>

                    {profile.membership.hasPhoto ? (
                      <button
                        type="button"
                        onClick={() => void handleRemovePhoto()}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition hover:text-rose-700"
                      >
                        <Trash2 aria-hidden size={11} />
                        Remove photo
                      </button>
                    ) : null}
                  </div>

                  <dl className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Mail aria-hidden size={12} />
                        Login email
                      </dt>
                      <dd className="min-w-0 truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {profile.identity.email ?? "—"}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <BadgeCheck aria-hidden size={12} />
                        Staff Identifier
                      </dt>
                      <dd className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                        {profile.staff.employeeNumber}
                      </dd>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Building2 aria-hidden size={12} />
                        Primary location
                      </dt>
                      <dd className="text-right text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                        {profile.membership.primaryBranchName ??
                          profile.staff.branchName ??
                          "All branches"}
                      </dd>
                    </div>
                  </dl>
                </PhaseOnePanel>

                <DonutChart
                  title="Referrals by status"
                  subtitle={`All ${presentation.discipline.toLowerCase()} referrals`}
                  slices={statusMix}
                  centerLabel="Referrals"
                  size={168}
                  thickness={20}
                  emptyMessage="No referrals yet"
                  emptyHint="Referrals raised by the surgical team appear here."
                />
              </div>
            </div>

            {/* Editable Profile & Practice Settings */}
            <div className="lg:col-span-8">
              <div className="space-y-5">
                <PhaseOnePanel
                  title="Professional Details & Role Customization"
                  description="Customize how surgical teams and patients identify you across WonFlow"
                >
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PhaseOneField
                        label="Display Name"
                        htmlFor="allied-display-name"
                        required
                        hint="Shown on care plans and referral documentation"
                      >
                        <PhaseOneInput
                          id="allied-display-name"
                          value={displayName}
                          onChange={(event) => setDisplayName(event.target.value)}
                          maxLength={250}
                          required
                        />
                      </PhaseOneField>

                      <PhaseOneField
                        label="Professional Title"
                        htmlFor="allied-title"
                        hint="e.g. Senior Physiotherapist, Clinical Dietitian Specialist"
                      >
                        <PhaseOneInput
                          id="allied-title"
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          maxLength={120}
                          placeholder={presentation.discipline}
                        />
                      </PhaseOneField>

                      <PhaseOneField
                        label="Specialty Discipline"
                        htmlFor="allied-staff-type"
                        hint="Select your clinical allied health role"
                      >
                        <PhaseOneSelect
                          id="allied-staff-type"
                          value={staffType}
                          onChange={(event) => setStaffType(event.target.value)}
                        >
                          <option value="PHYSIOTHERAPIST">Physiotherapist & Mobility Specialist</option>
                          <option value="NUTRITIONIST">Clinical Dietitian & Nutritionist</option>
                        </PhaseOneSelect>
                      </PhaseOneField>

                      <PhaseOneField
                        label="Primary Location"
                        htmlFor="allied-branch"
                        hint="Primary facility where you conduct consultations"
                      >
                        <PhaseOneSelect
                          id="allied-branch"
                          value={primaryBranchId}
                          onChange={(event) => setPrimaryBranchId(event.target.value)}
                        >
                          <option value="">All Hospital Locations</option>
                          {profile.branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </PhaseOneSelect>
                      </PhaseOneField>

                      <PhaseOneField
                        label="Preferred Language"
                        htmlFor="allied-locale"
                        hint="Platform display language"
                      >
                        <PhaseOneSelect
                          id="allied-locale"
                          value={preferredLocale}
                          onChange={(event) => setPreferredLocale(event.target.value)}
                        >
                          {LOCALES.map((locale) => (
                            <option key={locale.value} value={locale.value}>
                              {locale.label}
                            </option>
                          ))}
                        </PhaseOneSelect>
                      </PhaseOneField>
                    </div>

                    {/* Clinical Focus Areas */}
                    <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-indigo-600" />
                        Clinical Focus & Competency Areas
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tag your clinical competencies to match specialized surgical referrals
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(specialty === "NUTRITION" ? NUTRITION_FOCUS_AREAS : PT_FOCUS_AREAS).map(
                          (area) => {
                            const isSelected = selectedFocus.includes(area);
                            return (
                              <button
                                key={area}
                                type="button"
                                onClick={() => {
                                  setSelectedFocus((prev) =>
                                    isSelected ? prev.filter((item) => item !== area) : [...prev, area],
                                  );
                                }}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-2xs"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {isSelected ? "✓ " : "+ "}
                                {area}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Clinical Practice Protocols & Default Targets */}
                    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                      <div>
                        <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-teal-600" />
                          {specialty === "PHYSIOTHERAPY"
                            ? "Rehabilitation Protocol Targets"
                            : "Nutritional Protocol Targets"}
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {specialty === "PHYSIOTHERAPY"
                            ? "Default baseline targets assigned to newly referred inpatient recovery pathways"
                            : "Standard metabolic baseline targets assigned to newly referred dietary care plans"}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 pt-1">
                        <PhaseOneField
                          label={
                            specialty === "PHYSIOTHERAPY"
                              ? "Daily Mobility Target"
                              : "Caloric Target Formula"
                          }
                          htmlFor="allied-daily-step-goal"
                          hint={
                            specialty === "PHYSIOTHERAPY"
                              ? "e.g. 100m (corridor), 3x daily ambulation"
                              : "e.g. 25-30 kcal/kg/day"
                          }
                        >
                          <PhaseOneInput
                            id="allied-daily-step-goal"
                            value={dailyStepGoal}
                            onChange={(event) => setDailyStepGoal(event.target.value)}
                            maxLength={80}
                          />
                        </PhaseOneField>

                        <PhaseOneField
                          label={
                            specialty === "PHYSIOTHERAPY"
                              ? "Incentive Spirometry Target"
                              : "Daily Protein Target"
                          }
                          htmlFor="allied-spirometry-goal"
                          hint={
                            specialty === "PHYSIOTHERAPY"
                              ? "e.g. 1500 mL q1h, 10 breaths/hr"
                              : "e.g. 1.5 g/kg/day"
                          }
                        >
                          <PhaseOneInput
                            id="allied-spirometry-goal"
                            value={spirometryGoal}
                            onChange={(event) => setSpirometryGoal(event.target.value)}
                            maxLength={80}
                          />
                        </PhaseOneField>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">
                        Changes will reflect immediately in care plan assignments and surgical referrals.
                      </p>

                      <PhaseOneAccentButton
                        accent={presentation.accent}
                        type="submit"
                        disabled={saving || !isDirty}
                      >
                        <Save aria-hidden size={14} />
                        {saving ? "Saving…" : "Save profile"}
                      </PhaseOneAccentButton>
                    </div>
                  </form>
                </PhaseOnePanel>

                {/* Permissions Panel */}
                <PhaseOnePanel
                  title="Workspace Privileges & Authorizations"
                  description="Permissions granted for patient charting, exercise assignment, and note countersignature"
                >
                  <ul className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                    {profile.permissions.map((permission) => (
                      <li
                        key={permission}
                        className="rounded-lg bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                      >
                        {permission}
                      </li>
                    ))}
                  </ul>
                </PhaseOnePanel>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
