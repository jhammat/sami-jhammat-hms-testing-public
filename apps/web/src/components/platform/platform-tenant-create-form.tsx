"use client";

import Link from "next/link";
import {
  Building2,
  Save,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";
import type {
  FormEvent,
} from "react";

import {
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  PlatformLoadingState,
  PlatformPanel,
  PlatformPrimaryButton,
  platformInputClassName,
} from "./platform-administration-ui";
import {
  usePlatformAdministration,
} from "./platform-administration-store";
import type {
  CreatePlatformTenantInput,
} from "./platform-administration-store";

const EMPTY_FORM: CreatePlatformTenantInput = {
  organizationName: "",
  slug: "",
  domain: "",
  legalName: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PlatformTenantCreateForm() {
  const router = useRouter();
  const {
    ready,
    workspace,
    createTenant,
  } = usePlatformAdministration();

  const [form, setForm] =
    useState<CreatePlatformTenantInput>(
      EMPTY_FORM,
    );
  const [errors, setErrors] =
    useState<Record<string, string>>({});
  const [submitting, setSubmitting] =
    useState(false);

  if (!ready) {
    return (
      <PlatformLoadingState label="Preparing tenant form…" />
    );
  }

  function updateField(
    field: keyof CreatePlatformTenantInput,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]:
        field === "slug"
          ? normalizeSlug(value)
          : value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function validate(): boolean {
    const nextErrors:
      Record<string, string> = {};

    if (
      form.organizationName.trim().length < 2
    ) {
      nextErrors.organizationName =
        "Enter the organization name.";
    }

    if (form.slug.trim().length < 2) {
      nextErrors.slug =
        "Enter a unique tenant slug.";
    } else if (
      workspace.tenants.some(
        (tenant) =>
          tenant.slug.toLocaleLowerCase() ===
          form.slug.trim().toLocaleLowerCase(),
      )
    ) {
      nextErrors.slug =
        "This tenant slug is already in use.";
    }

    if (
      form.primaryContactEmail.trim() !== "" &&
      !/^\S+@\S+\.\S+$/.test(
        form.primaryContactEmail,
      )
    ) {
      nextErrors.primaryContactEmail =
        "Enter a valid email address or leave it empty.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const tenantId = await createTenant(form);

      // Seat count and monthly amount are owned by the subscription, so the
      // operator lands there first to configure billing before owner activation.
      router.push(
        `/platform/organizations/${encodeURIComponent(
          tenantId,
        )}?tab=subscription`,
      );
    } catch (error) {
      /*
       * The tenant is created server-side, so a rejected slug or domain
       * comes back here. Surface it on the field the server rejected
       * instead of leaving the form spinning.
       */
      const message =
        error instanceof Error
          ? error.message
          : "The tenant could not be created.";

      setErrors({
        [/slug/i.test(message)
          ? "slug"
          : /domain/i.test(message)
            ? "domain"
            : "organizationName"]: message,
      });
      setSubmitting(false);
    }
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
            label: "Tenants",
            href:
              "/platform/organizations",
          },
          {
            label: "Add tenant",
          },
        ]}
        description="Create an empty tenant configuration. Branches, users, subscription and entitlements remain unconfigured until entered."
        eyebrow="Tenant Provisioning"
        leading={
          <Building2
            aria-hidden="true"
            size={20}
          />
        }
        metadata={
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            No automatic sample data
          </span>
        }
        title="Add Tenant Organization"
      />

      <form
        className="space-y-6"
        noValidate
        onSubmit={handleSubmit}
      >
        <PlatformPanel
          description="Only the organization name and unique slug are required to create the draft."
          title="Organization identity"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              error={errors.organizationName}
              label="Organization name"
              required
            >
              <input
                autoFocus
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "organizationName",
                    event.target.value,
                  )
                }
                placeholder="Enter organization name"
                value={form.organizationName}
              />
            </Field>

            <Field
              error={errors.slug}
              hint="Used as the internal tenant identifier and URL-safe key."
              label="Tenant slug"
              required
            >
              <input
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "slug",
                    event.target.value,
                  )
                }
                placeholder="organization-slug"
                value={form.slug}
              />
            </Field>

            <Field
              label="Legal name"
            >
              <input
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "legalName",
                    event.target.value,
                  )
                }
                placeholder="Leave empty until confirmed"
                value={form.legalName}
              />
            </Field>

            <Field
              hint="Optional organization domain. Do not include a protocol."
              label="Domain"
            >
              <input
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "domain",
                    event.target.value,
                  )
                }
                placeholder="organization.example"
                value={form.domain}
              />
            </Field>
          </div>
        </PlatformPanel>

        <PlatformPanel
          description="These fields remain empty until the hospital provides its responsible contact."
          title="Primary contact"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Contact name">
              <input
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "primaryContactName",
                    event.target.value,
                  )
                }
                placeholder="Enter contact name"
                value={form.primaryContactName}
              />
            </Field>

            <Field
              error={errors.primaryContactEmail}
              label="Contact email"
            >
              <input
                autoComplete="email"
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "primaryContactEmail",
                    event.target.value,
                  )
                }
                placeholder="Enter contact email"
                type="email"
                value={form.primaryContactEmail}
              />
            </Field>

            <Field label="Contact phone">
              <input
                autoComplete="tel"
                className={platformInputClassName}
                onChange={(event) =>
                  updateField(
                    "primaryContactPhone",
                    event.target.value,
                  )
                }
                placeholder="Enter contact phone"
                type="tel"
                value={form.primaryContactPhone}
              />
            </Field>
          </div>
        </PlatformPanel>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            href="/platform/organizations"
          >
            Cancel
          </Link>

          <PlatformPrimaryButton
            disabled={submitting}
            type="submit"
          >
            <Save
              aria-hidden="true"
              size={17}
            />
            {submitting
              ? "Creating tenant…"
              : "Create empty tenant"}
          </PlatformPrimaryButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-700">
            *
          </span>
        ) : null}
      </span>

      <span className="mt-1.5 block">
        {children}
      </span>

      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-700">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
