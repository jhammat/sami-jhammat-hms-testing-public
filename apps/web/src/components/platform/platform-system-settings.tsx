"use client";

import {
  CheckCircle2,
  Languages,
  LoaderCircle,
  Save,
  Settings,
  UserCircle2,
} from "lucide-react";
import {
  useState,
} from "react";

import {
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  usePlatformAdministration,
} from "./platform-administration-context";
import type {
  PlatformSystemSettings,
} from "./platform-administration-context";
import {
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  platformInputClassName,
} from "./platform-administration-ui";

export function PlatformSystemSettingsPanel() {
  const {
    ready,
    workspace,
    updateSystemSettings,
  } = usePlatformAdministration();

  const [form, setForm] =
    useState<PlatformSystemSettings>(
      workspace.systemSettings,
    );
  const [message, setMessage] =
    useState<string>();
  const [syncedSettings, setSyncedSettings] =
    useState(workspace.systemSettings);

  if (syncedSettings !== workspace.systemSettings) {
    setSyncedSettings(workspace.systemSettings);
    setForm(workspace.systemSettings);
  }

  if (!ready) {
    return (
      <PlatformLoadingState label="Loading system settings…" />
    );
  }

  function save() {
    updateSystemSettings(form);
    setMessage(
      "Platform defaults saved.",
    );
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          {
            label:
              "Platform Administration",
            href: "/platform",
          },
          {
            label: "System Settings",
          },
        ]}
        description="Maintain neutral defaults applied to newly created tenant configuration records."
        eyebrow="WonFlow Super Administration"
        leading={
          <Settings
            aria-hidden="true"
            size={20}
          />
        }
        metadata={
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
            Configurable defaults
          </span>
        }
        title="System Settings"
      />

      <PlatformPanel
        description="These defaults do not create hospital records or operational data."
        title="Tenant defaults"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Default currency">
            <input
              className={platformInputClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultCurrencyCode:
                    event.target.value
                      .toUpperCase(),
                }))
              }
              value={
                form.defaultCurrencyCode
              }
            />
          </Field>

          <Field label="Default branch label">
            <input
              className={platformInputClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultBranchName:
                    event.target.value,
                }))
              }
              value={form.defaultBranchName}
            />
          </Field>

          <Field label="Default timezone">
            <input
              className={platformInputClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultTimezone:
                    event.target.value,
                }))
              }
              value={form.defaultTimezone}
            />
          </Field>

          <Field label="Primary locale">
            <input
              className={platformInputClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultLocale:
                    event.target.value,
                }))
              }
              value={form.defaultLocale}
            />
          </Field>

          <Field label="Secondary locale">
            <input
              className={platformInputClassName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  secondaryLocale:
                    event.target.value,
                }))
              }
              value={form.secondaryLocale}
            />
          </Field>
        </div>

        {message ? (
          <p
            className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
            role="status"
          >
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <PlatformPrimaryButton
            onClick={save}
            type="button"
          >
            <Save
              aria-hidden="true"
              size={17}
            />
            Save settings
          </PlatformPrimaryButton>
        </div>
      </PlatformPanel>

      <PlatformPanel
        description="Approved shared experience settings are shown here as explicit product contracts."
        title="Experience standards"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StandardCard
            description="Uploaded profile photo when available, otherwise initials."
            icon={
              <UserCircle2
                aria-hidden="true"
                size={20}
              />
            }
            label="Support avatars"
            value="Photo or initials"
          />
          <StandardCard
            description="Critical platform audit rows use the approved deep-red treatment."
            icon={
              <CheckCircle2
                aria-hidden="true"
                size={20}
              />
            }
            label="Critical audit"
            value="Deep red"
          />
          <StandardCard
            description="Internal page transitions use the animated WonFlow mark."
            icon={
              <LoaderCircle
                aria-hidden="true"
                size={20}
              />
            }
            label="Route loader"
            value="Rotating W"
          />
          <StandardCard
            description="English is primary and Urdu remains available as the secondary locale."
            icon={
              <Languages
                aria-hidden="true"
                size={20}
              />
            }
            label="Languages"
            value="English + Urdu"
          />
        </div>
      </PlatformPanel>

    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>
      <span className="mt-1.5 block">
        {children}
      </span>
    </label>
  );
}

function StandardCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
        {icon}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-slate-950">
        {value}
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}
