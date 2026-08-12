import type {
  WonFlowDeploymentEnvironment,
} from "@wonflow/config";

export interface WonFlowEnvironmentBannerProps {
  environment:
    WonFlowDeploymentEnvironment;

  fictionalData: boolean;

  showEnvironmentBanner: boolean;

  demoScenario?: string;
}

interface EnvironmentPresentation {
  label: string;
  description: string;
  className: string;
  dotClassName: string;
}

function formatScenarioName(
  scenario: string | undefined,
): string | undefined {
  if (scenario === undefined) {
    return undefined;
  }

  return scenario
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function getEnvironmentPresentation(
  environment:
    WonFlowDeploymentEnvironment,

  fictionalData: boolean,

  demoScenario?: string,
): EnvironmentPresentation {
  if (fictionalData) {
    const scenarioName =
      formatScenarioName(
        demoScenario,
      );

    return {
      label:
        "Fictional Patient Data",

      description:
        scenarioName === undefined
          ? "This workspace contains demonstration records and must not be used for clinical care."
          : `${scenarioName} scenario. These records are fictional and must not be used for clinical care.`,

      className: [
        "border-violet-200",
        "bg-gradient-to-r",
        "from-violet-50",
        "via-indigo-50",
        "to-blue-50",
        "text-violet-950",
      ].join(" "),

      dotClassName:
        "bg-violet-600",
    };
  }

  switch (environment) {
    case "development":
      return {
        label:
          "DEVELOPMENT — Not for Clinical Use",

        description:
          "This environment is intended for local engineering and interface development.",

        className:
          "border-blue-200 bg-blue-50 text-blue-950",

        dotClassName:
          "bg-blue-600",
      };

    case "test":
      return {
        label:
          "TEST — Automated Verification Environment",

        description:
          "This environment is reserved for automated and controlled testing.",

        className:
          "border-cyan-200 bg-cyan-50 text-cyan-950",

        dotClassName:
          "bg-cyan-600",
      };

    case "staging":
      return {
        label:
          "STAGING — Not for Clinical Use",

        description:
          "This environment is used for integration and acceptance testing.",

        className:
          "border-amber-200 bg-amber-50 text-amber-950",

        dotClassName:
          "bg-amber-500",
      };

    case "pilot":
      return {
        label:
          "PILOT — Controlled Hospital Validation",

        description:
          "Use is limited to the approved pilot scope and authorized participants.",

        className:
          "border-orange-200 bg-orange-50 text-orange-950",

        dotClassName:
          "bg-orange-600",
      };

    case "production":
      return {
        label:
          "PRODUCTION",

        description:
          "Authorized live WonFlow environment.",

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-950",

        dotClassName:
          "bg-emerald-600",
      };
  }
}

export function WonFlowEnvironmentBanner({
  environment,
  fictionalData,
  showEnvironmentBanner,
  demoScenario,
}: WonFlowEnvironmentBannerProps) {
  /**
   * Fictional data always requires a visible
   * warning, even when ordinary environment
   * banners are disabled.
   */
  if (
    !fictionalData &&
    !showEnvironmentBanner
  ) {
    return null;
  }

  const presentation =
    getEnvironmentPresentation(
      environment,
      fictionalData,
      demoScenario,
    );

  return (
    <div
      className={[
        "relative z-50 border-b",
        presentation.className,
      ].join(" ")}
      role="status"
    >
      <div
        className={[
          "mx-auto flex min-h-10",
          "max-w-[1800px]",
          "items-center gap-3",
          "px-4 py-2",
          "sm:px-6",
          "lg:px-8",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "h-2.5 w-2.5",
            "shrink-0 rounded-full",
            presentation.dotClassName,
          ].join(" ")}
        />

        <div
          className={[
            "flex min-w-0",
            "flex-col gap-0.5",
            "sm:flex-row",
            "sm:items-center",
            "sm:gap-3",
          ].join(" ")}
        >
          <strong className="text-xs font-bold tracking-wide">
            {presentation.label}
          </strong>

          <span className="text-xs leading-5 opacity-80">
            {presentation.description}
          </span>
        </div>
      </div>
    </div>
  );
}
