import Image from "next/image";

import type {
  MockPractitioner,
} from "@wonflow/mock-data";

export type DoctorProfileAvatarSize =
  | "sm"
  | "md"
  | "lg"
  | "xl";

export interface DoctorProfileAvatarProps {
  doctor?: MockPractitioner;

  name?: string;
  profileImageUrl?: string;

  size?: DoctorProfileAvatarSize;
  shape?: "rounded" | "circle";
  showStatus?: boolean;

  className?: string;
}

const SIZE_STYLES:
  Record<
    DoctorProfileAvatarSize,
    {
      container: string;
      status: string;
      sizes: string;
    }
  > = {
    sm: {
      container: "h-9 w-9 text-[11px]",
      status: "h-2.5 w-2.5",
      sizes: "36px",
    },
    md: {
      container: "h-11 w-11 text-xs",
      status: "h-3 w-3",
      sizes: "44px",
    },
    lg: {
      container: "h-14 w-14 text-sm",
      status: "h-3.5 w-3.5",
      sizes: "56px",
    },
    xl: {
      container: "h-20 w-20 text-xl",
      status: "h-4 w-4",
      sizes: "80px",
    },
  };

const STATUS_STYLES:
  Record<
    MockPractitioner["operationalStatus"],
    string
  > = {
    available: "bg-emerald-500",
    "in-consultation": "bg-blue-500",
    "on-break": "bg-amber-500",
    "in-procedure": "bg-violet-500",
    "off-duty": "bg-slate-400",
  };

function getInitials(
  doctor?: MockPractitioner,
  name?: string,
): string {
  if (
    doctor === undefined &&
    name !== undefined
  ) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0),
      )
      .join("")
      .toLocaleUpperCase() || "PT";
  }

  if (doctor === undefined) {
    return "DR";
  }

  const namedInitials = [
    doctor.givenName,
    doctor.familyName,
  ]
    .filter(Boolean)
    .map((name) => name.charAt(0))
    .join("")
    .toLocaleUpperCase();

  if (namedInitials !== "") {
    return namedInitials.slice(0, 2);
  }

  return doctor.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join("")
    .toLocaleUpperCase() || "DR";
}

export function DoctorProfileAvatar({
  doctor,
  name,
  profileImageUrl,
  size = "md",
  shape = "rounded",
  showStatus = false,
  className = "",
}: DoctorProfileAvatarProps) {
  const presentation =
    SIZE_STYLES[size];

  const status =
    doctor?.operationalStatus ??
    "off-duty";

  const displayName =
    name ??
    doctor?.displayName ??
    "Doctor";

  const imageUrl =
    profileImageUrl ??
    doctor?.profileImageUrl;

  return (
    <div
      aria-label={
        doctor === undefined
          ? `${displayName} profile`
          : `${doctor.displayName}, ${status.replaceAll("-", " ")}`
      }
      className={[
        "relative shrink-0",
        presentation.container,
        className,
      ].join(" ")}
      role="img"
    >
      <div
        aria-hidden="true"
        className={[
          "relative h-full w-full overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 font-black text-white shadow-[0_7px_18px_rgba(79,70,229,0.24)] ring-1 ring-white/70",
          shape === "circle"
            ? "rounded-full"
            : "rounded-2xl",
        ].join(" ")}
      >
        {imageUrl !==
        undefined ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes={presentation.sizes}
            src={imageUrl}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center tracking-[-0.04em]">
            {getInitials(
              doctor,
              name,
            )}
          </span>
        )}
      </div>

      {showStatus ? (
        <span
          aria-hidden="true"
          className={[
            "absolute bottom-0 right-0 rounded-full border-2 border-white shadow-sm",
            "translate-x-1/4 translate-y-1/4",
            presentation.status,
            STATUS_STYLES[status],
          ].join(" ")}
        />
      ) : null}
    </div>
  );
}
