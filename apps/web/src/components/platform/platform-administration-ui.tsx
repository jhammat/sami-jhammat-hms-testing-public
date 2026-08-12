import Image from "next/image";
import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import {
  Building2,
  ImagePlus,
  Search,
} from "lucide-react";

import { WonFlowRouteLoader } from "@/components/brand/wonflow-route-loader";
import { WonFlowPermissionState } from "@/components/feedback/async-data-state";

export const platformInputClassName = [
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5",
  "text-sm text-slate-950 outline-none transition placeholder:text-slate-400",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
  "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
].join(" ");

export const platformTextareaClassName = [
  platformInputClassName,
  "min-h-24 resize-y py-3 leading-6",
].join(" ");

export function PlatformLoadingState({
  label = "Loading platform administration…",
}: {
  label?: string;
}) {
  return (
    <WonFlowRouteLoader
      label={label}
      overlay={false}
      visible
    />
  );
}

export function PlatformEmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/65 via-white to-blue-50/60 px-5 py-12 text-center sm:px-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white text-violet-700 shadow-[0_12px_28px_rgba(79,70,229,0.12)] ring-1 ring-violet-100">
        {icon ?? (
          <Building2
            aria-hidden="true"
            size={24}
          />
        )}
      </div>

      <h2 className="mt-5 text-lg font-semibold text-slate-950">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>

      {action ? (
        <div className="mt-6">
          {action}
        </div>
      ) : null}
    </section>
  );
}

export function PlatformPermissionState({
  title = "Platform access restricted",
  description = "Your account does not have permission to open this platform administration screen.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <WonFlowPermissionState
      description={description}
      title={title}
    />
  );
}

/**
 * Gates platform-admin content behind server-verified permission.
 *
 * Real evaluation depends on `requireRequestContext` (P1-016) and the
 * Platform Administration service/API layer (P1-018), which are not yet
 * wired. Until then this boundary always allows access — it exists so
 * every platform route already renders `PlatformPermissionState`
 * correctly once a real `hasAccess` signal is threaded through.
 */
export function PlatformAccessBoundary({
  hasAccess = true,
  deniedTitle,
  deniedDescription,
  children,
}: {
  hasAccess?: boolean;
  deniedTitle?: string;
  deniedDescription?: string;
  children: ReactNode;
}) {
  if (!hasAccess) {
    return (
      <PlatformPermissionState
        description={deniedDescription}
        title={deniedTitle}
      />
    );
  }

  return <>{children}</>;
}

export function PlatformPanel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-[22px] border border-slate-200/80",
        "bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.055)] ring-1 ring-white",
        className,
      ].join(" ")}
    >
      <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="shrink-0">
            {actions}
          </div>
        ) : null}
      </header>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

export function PlatformKpiCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

export function PlatformStatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  const className =
    normalized === "active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : normalized === "suspended" ||
          normalized === "cancelled" ||
          normalized === "critical"
        ? "bg-red-100 text-red-900 ring-red-300"
        : normalized === "past-due" ||
            normalized === "warning"
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : normalized === "draft" ||
              normalized === "pending" ||
              normalized === "trial"
            ? "bg-blue-50 text-blue-700 ring-blue-200"
            : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1",
        "text-[10px] font-semibold uppercase tracking-wide ring-1",
        className,
      ].join(" ")}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}

export function PlatformSearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">
        {label}
      </span>

      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        size={17}
      />

      <input
        className={`${platformInputClassName} pl-10`}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </label>
  );
}

export function PlatformPrimaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl",
        "bg-blue-700 px-4 text-sm font-semibold text-white transition",
        "hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

export function PlatformSecondaryButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl",
        "border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition",
        "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

export function PlatformDangerButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl",
        "bg-red-800 px-4 text-sm font-semibold text-white transition",
        "hover:bg-red-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
    />
  );
}

export function TenantLogo({
  name,
  logoDataUrl,
  size = "md",
}: {
  name: string;
  logoDataUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimension = {
    sm: "h-10 w-10 rounded-xl",
    md: "h-12 w-12 rounded-2xl",
    lg: "h-20 w-20 rounded-[22px]",
  }[size];

  if (logoDataUrl) {
    return (
      <div
        className={[
          "relative shrink-0 overflow-hidden border border-violet-200 bg-white",
          "shadow-sm ring-2 ring-violet-100",
          dimension,
        ].join(" ")}
      >
        <Image
          alt={`${name} logo`}
          className="object-contain p-1"
          fill
          sizes={size === "lg" ? "80px" : "48px"}
          src={logoDataUrl}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`${name || "Hospital"} logo placeholder`}
      className={[
        "flex shrink-0 items-center justify-center border border-dashed border-violet-300",
        "bg-violet-50 text-violet-700 ring-2 ring-violet-100",
        dimension,
      ].join(" ")}
    >
      {size === "lg" ? (
        <ImagePlus
          aria-hidden="true"
          size={27}
        />
      ) : (
        <Building2
          aria-hidden="true"
          size={size === "sm" ? 18 : 21}
        />
      )}
    </div>
  );
}

export function UserAvatar({
  displayName,
  photoDataUrl,
}: {
  displayName: string;
  photoDataUrl?: string;
}) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  if (photoDataUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-violet-500 bg-white">
        <Image
          alt={`${displayName} profile`}
          className="object-cover"
          fill
          sizes="40px"
          src={photoDataUrl}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-violet-500 bg-violet-50 text-xs font-semibold text-violet-800">
      {initials || "—"}
    </div>
  );
}
