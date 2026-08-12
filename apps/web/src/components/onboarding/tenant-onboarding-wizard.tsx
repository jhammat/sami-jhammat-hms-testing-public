"use client";

/**
 * Owner-led tenant onboarding.
 *
 * Every persisted record is created through WonFlowPracticeService.
 * No tenant value is read from source constants or hardcoded arrays.
 */

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import type {
  PracticeCareTeam,
  PracticeLocation,
  PracticeService,
  TenantOnboardingState,
  TenantOnboardingStepCode,
} from "@wonflow/contracts";

import {
  initialPracticeCareTeamFormSchema,
  practiceBookingPolicyFormSchema,
  practiceClinicSessionFormSchema,
  practiceLocationFormSchema,
  practiceServiceFormSchema,
  practiceServiceOfferingFormSchema,
  practiceTeamInvitationFormSchema,
  tenantContentVersionFormSchema,
  tenantPolicySettingsFormSchema,
  tenantProfileFormSchema,
} from "@wonflow/validation";

import {
  useWonFlowApplication,
} from "@/app/_providers";

const STEP_LABELS:
  Readonly<
    Record<
      TenantOnboardingStepCode,
      string
    >
  > = {
    profile:
      "Profile and branding",

    "regional-settings":
      "Regional settings",

    locations:
      "First location",

    "clinic-sessions":
      "Clinic sessions",

    "service-catalogue":
      "Services and fees",

    team:
      "Owner team and invitations",

    policies:
      "Booking and practice policies",

    content:
      "Consent and safety content",

    review:
      "Review and finish",
  };

const STEP_GROUPS = [
  {
    key: "profile",

    title:
      "Profile and regional settings",

    codes: [
      "profile",
      "regional-settings",
    ],
  },
  {
    key: "locations",

    title:
      "Location and clinic session",

    codes: [
      "locations",
      "clinic-sessions",
    ],
  },
  {
    key: "service-catalogue",

    title:
      "Service and fee",

    codes: [
      "service-catalogue",
    ],
  },
  {
    key: "team",

    title:
      "Team",

    codes: [
      "team",
    ],
  },
  {
    key: "policies",

    title:
      "Policies",

    codes: [
      "policies",
    ],
  },
  {
    key: "content",

    title:
      "Content",

    codes: [
      "content",
    ],
  },
  {
    key: "review",

    title:
      "Review",

    codes: [
      "review",
    ],
  },
] as const;

type StepGroup =
  (typeof STEP_GROUPS)[number];

interface WizardOverview {
  profileName?: string;

  timeZone?: string;

  defaultCurrencyCode?: string;

  locations:
    PracticeLocation[];

  services:
    PracticeService[];

  careTeams:
    PracticeCareTeam[];

  bookingPolicyCount: number;

  contentBlockCount: number;
}

function readString(
  formData: FormData,
  key: string,
): string {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function readOptionalString(
  formData: FormData,
  key: string,
): string | undefined {
  const value =
    readString(
      formData,
      key,
    );

  return value === ""
    ? undefined
    : value;
}

function readInteger(
  formData: FormData,
  key: string,
): number {
  return Number.parseInt(
    readString(
      formData,
      key,
    ),
    10,
  );
}

function readOptionalInteger(
  formData: FormData,
  key: string,
): number | undefined {
  const value =
    readOptionalString(
      formData,
      key,
    );

  return value === undefined
    ? undefined
    : Number.parseInt(
        value,
        10,
      );
}

function readBoolean(
  formData: FormData,
  key: string,
): boolean {
  return (
    formData.get(key) ===
    "on"
  );
}

function readCommaSeparatedValues(
  value: string,
): string[] {
  return value
    .split(",")
    .map(
      (part) =>
        part.trim(),
    )
    .filter(Boolean);
}

function toIsoDateTime(
  value: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      "Enter a valid date and time.",
    );
  }

  return parsed.toISOString();
}

function formatValidationIssues(
  issues:
    readonly {
      message: string;
    }[],
): string {
  return issues
    .map(
      (issue) =>
        issue.message,
    )
    .join(" ");
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;

  hint?: string;

  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">
        {label}
      </span>

      {hint !== undefined ? (
        <span className="ml-2 text-xs text-slate-500">
          {hint}
        </span>
      ) : null}

      <div className="mt-1">
        {children}
      </div>
    </label>
  );
}

const INPUT_CLASS_NAME = [
  "h-11 w-full rounded-xl border",
  "border-slate-300 bg-white px-3",
  "text-sm text-slate-950",
  "outline-none transition",
  "focus:border-violet-500",
  "focus:ring-2 focus:ring-violet-100",
].join(" ");

const TEXTAREA_CLASS_NAME = [
  "min-h-28 w-full rounded-xl border",
  "border-slate-300 bg-white px-3 py-2",
  "text-sm text-slate-950",
  "outline-none transition",
  "focus:border-violet-500",
  "focus:ring-2 focus:ring-violet-100",
].join(" ");

const CHECKBOX_LABEL_CLASS_NAME = [
  "flex items-center gap-2 text-sm",
  "font-semibold text-slate-800",
].join(" ");

function FormActions({
  busy,
  saveLabel,
  onSkip,
}: {
  busy: boolean;

  saveLabel:
    string;

  onSkip:
    () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
      <button
        className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        disabled={busy}
        onClick={onSkip}
        type="button"
      >
        Skip this section
      </button>

      <button
        className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy
          ? "Saving…"
          : saveLabel}
      </button>
    </div>
  );
}

export function TenantOnboardingWizard() {
  const {
    practiceService,
    practiceTenant,
  } = useWonFlowApplication();

  const [
    tenantContext,
    setTenantContext,
  ] = useState<
    Awaited<
      typeof practiceTenant
    >
  >();

  const [
    onboarding,
    setOnboarding,
  ] = useState<
    TenantOnboardingState
  >();

  const [
    overview,
    setOverview,
  ] = useState<
    WizardOverview
  >({
    locations: [],

    services: [],

    careTeams: [],

    bookingPolicyCount: 0,

    contentBlockCount: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | undefined
  >();

  async function loadOverview(
    tenant:
      Awaited<
        typeof practiceTenant
      >,
  ): Promise<void> {
    const [
      settings,
      locations,
      services,
      careTeams,
      policies,
      contentBlocks,
    ] = await Promise.all([
      practiceService
        .getTenantSettings(
          tenant.scope,
        ),

      practiceService
        .practiceLocations
        .list(
          tenant.scope,
          {
            limit: 1_000,
          },
        ),

      practiceService
        .practiceServices
        .list(
          tenant.scope,
          {
            limit: 1_000,
          },
        ),

      practiceService
        .careTeams
        .list(
          tenant.scope,
          {
            limit: 1_000,
          },
        ),

      practiceService
        .bookingPolicies
        .list(
          tenant.scope,
          {
            limit: 1_000,
          },
        ),

      practiceService
        .tenantContentBlocks
        .list(
          tenant.scope,
          {
            limit: 1_000,
          },
        ),
    ]);

    setOverview({
      profileName:
        settings.profile
          ?.displayName,

      timeZone:
        settings.profile
          ?.timeZone,

      defaultCurrencyCode:
        settings.profile
          ?.defaultCurrencyCode,

      locations:
        locations.items,

      services:
        services.items,

      careTeams:
        careTeams.items,

      bookingPolicyCount:
        policies.totalItems,

      contentBlockCount:
        contentBlocks.totalItems,
    });
  }

  useEffect(
    () => {
      let cancelled = false;

      async function load():
        Promise<void> {
        try {
          const tenant =
            await practiceTenant;

          let state =
            await practiceService
              .onboardingStates
              .get(
                tenant.scope,
                tenant
                  .onboardingStateId,
              );

          if (
            state.status ===
            "not-started"
          ) {
            state =
              await practiceService
                .transitionTenantOnboarding(
                  tenant.scope,
                  {
                    onboardingStateId:
                      state.id,

                    actorUserId:
                      tenant
                        .ownerUserId,

                    action:
                      "start",

                    stepCode:
                      "profile",
                  },
                );
          }

          if (cancelled) {
            return;
          }

          setTenantContext(
            tenant,
          );

          setOnboarding(
            state,
          );

          await loadOverview(
            tenant,
          );
        } catch (error) {
          if (!cancelled) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "The onboarding workflow could not be loaded.",
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        cancelled = true;
      };
    },
    [
      practiceService,
      practiceTenant,
    ],
  );

  const activeGroup =
    useMemo<
      StepGroup | undefined
    >(
      () => {
        const currentCode =
          onboarding
            ?.currentStepCode;

        if (
          currentCode ===
          undefined
        ) {
          return onboarding?.status ===
            "completed"
            ? undefined
            : STEP_GROUPS.find(
                (group) =>
                  group.key ===
                  "review",
              );
        }

        return STEP_GROUPS.find(
          (group) =>
            (
              group.codes as readonly string[]
            ).includes(
              currentCode,
            ),
        );
      },
      [onboarding],
    );

  const completedCount =
    onboarding?.steps.filter(
      (step) =>
        step.status ===
          "completed" ||
        step.status ===
          "skipped",
    ).length ?? 0;

  const progressPercentage =
    onboarding === undefined
      ? 0
      : Math.round(
          (
            completedCount /
            onboarding.steps
              .length
          ) *
            100,
        );

  async function runTask(
    task:
      () => Promise<void>,
  ): Promise<void> {
    setBusy(true);

    setErrorMessage(
      undefined,
    );

    try {
      await task();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function transitionSteps(
    action:
      | "complete-step"
      | "skip-step",
    codes:
      readonly TenantOnboardingStepCode[],
  ): Promise<void> {
    if (
      tenantContext ===
        undefined ||
      onboarding === undefined
    ) {
      return;
    }

    let updated =
      onboarding;

    for (const code of codes) {
      updated =
        await practiceService
          .transitionTenantOnboarding(
            tenantContext.scope,
            {
              onboardingStateId:
                onboarding.id,

              actorUserId:
                tenantContext
                  .ownerUserId,

              action,

              stepCode: code,
            },
          );
    }

    setOnboarding(
      updated,
    );

    await loadOverview(
      tenantContext,
    );
  }

  function skipActiveGroup():
    void {
    if (
      activeGroup ===
      undefined
    ) {
      return;
    }

    void runTask(
      async () => {
        await transitionSteps(
          "skip-step",
          activeGroup
            .codes as readonly TenantOnboardingStepCode[],
        );
      },
    );
  }

  async function saveProfile(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const parsed =
          tenantProfileFormSchema
            .safeParse({
              displayName:
                readString(
                  formData,
                  "displayName",
                ),

              specialtyDescription:
                readOptionalString(
                  formData,
                  "specialtyDescription",
                ),

              logoReference:
                readOptionalString(
                  formData,
                  "logoReference",
                ),

              colours: {
                primary:
                  readString(
                    formData,
                    "primaryColour",
                  ),

                secondary:
                  readOptionalString(
                    formData,
                    "secondaryColour",
                  ),

                accent:
                  readOptionalString(
                    formData,
                    "accentColour",
                  ),
              },

              publicContact: {
                email:
                  readOptionalString(
                    formData,
                    "publicEmail",
                  ),

                phoneNumber:
                  readOptionalString(
                    formData,
                    "publicPhone",
                  ),

                whatsappNumber:
                  readOptionalString(
                    formData,
                    "whatsappNumber",
                  ),

                addressLines:
                  readString(
                    formData,
                    "addressLines",
                  )
                    .split("\n")
                    .map(
                      (line) =>
                        line.trim(),
                    )
                    .filter(Boolean),

                city:
                  readOptionalString(
                    formData,
                    "city",
                  ),

                region:
                  readOptionalString(
                    formData,
                    "region",
                  ),

                postalCode:
                  readOptionalString(
                    formData,
                    "postalCode",
                  ),

                countryCode:
                  readOptionalString(
                    formData,
                    "countryCode",
                  ),

                mapUrl:
                  readOptionalString(
                    formData,
                    "mapUrl",
                  ),
              },

              publicSiteUrl:
                readOptionalString(
                  formData,
                  "publicSiteUrl",
                ),

              timeZone:
                readString(
                  formData,
                  "timeZone",
                ),

              defaultCurrencyCode:
                readString(
                  formData,
                  "defaultCurrencyCode",
                ),

              supportedLanguageCodes:
                readCommaSeparatedValues(
                  readString(
                    formData,
                    "supportedLanguageCodes",
                  ),
                ),

              defaultLanguageCode:
                readString(
                  formData,
                  "defaultLanguageCode",
                ),
            });

        if (!parsed.success) {
          throw new Error(
            formatValidationIssues(
              parsed.error.issues,
            ),
          );
        }

        const settings =
          await practiceService
            .getTenantSettings(
              tenantContext.scope,
            );

        if (
          settings.profile ===
          undefined
        ) {
          await practiceService
            .tenantProfiles
            .create(
              tenantContext.scope,
              {
                ...parsed.data,

                status:
                  "active",
              },
            );
        } else {
          await practiceService
            .tenantProfiles
            .update(
              tenantContext.scope,
              settings.profile.id,
              {
                ...parsed.data,

                status:
                  "active",
              },
            );
        }

        await transitionSteps(
          "complete-step",
          [
            "profile",
            "regional-settings",
          ],
        );
      },
    );
  }

  async function saveLocation(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const hasAddress =
          readString(
            formData,
            "addressLine1",
          ) !== "";

        const locationParsed =
          practiceLocationFormSchema
            .safeParse({
              name:
                readString(
                  formData,
                  "locationName",
                ),

              code:
                readString(
                  formData,
                  "locationCode",
                ),

              type:
                readString(
                  formData,
                  "locationType",
                ),

              externalOrganizationName:
                readOptionalString(
                  formData,
                  "externalOrganizationName",
                ),

              address:
                hasAddress
                  ? {
                      addressLine1:
                        readString(
                          formData,
                          "addressLine1",
                        ),

                      addressLine2:
                        readOptionalString(
                          formData,
                          "addressLine2",
                        ),

                      city:
                        readString(
                          formData,
                          "locationCity",
                        ),

                      district:
                        readOptionalString(
                          formData,
                          "district",
                        ),

                      stateOrProvince:
                        readOptionalString(
                          formData,
                          "stateOrProvince",
                        ),

                      postalCode:
                        readOptionalString(
                          formData,
                          "locationPostalCode",
                        ),

                      countryCode:
                        readString(
                          formData,
                          "locationCountryCode",
                        ),
                    }
                  : undefined,

              phone:
                readOptionalString(
                  formData,
                  "locationPhone",
                ),

              email:
                readOptionalString(
                  formData,
                  "locationEmail",
                ),

              timezone:
                readString(
                  formData,
                  "locationTimezone",
                ),

              supportedConsultationModes:
                formData
                  .getAll(
                    "supportedConsultationModes",
                  )
                  .map(String),

              defaultCurrencyCode:
                readString(
                  formData,
                  "locationCurrencyCode",
                ),

              defaultSlotDurationMinutes:
                readInteger(
                  formData,
                  "defaultSlotDurationMinutes",
                ),

              minimumBookingNoticeMinutes:
                readInteger(
                  formData,
                  "minimumBookingNoticeMinutes",
                ),

              bookingHorizonDays:
                readInteger(
                  formData,
                  "bookingHorizonDays",
                ),

              publicBookingEnabled:
                readBoolean(
                  formData,
                  "publicBookingEnabled",
                ),

              onlinePaymentEnabled:
                readBoolean(
                  formData,
                  "onlinePaymentEnabled",
                ),

              mapUrl:
                readOptionalString(
                  formData,
                  "locationMapUrl",
                ),

              patientDirections:
                readOptionalString(
                  formData,
                  "patientDirections",
                ),

              clinicInstructions:
                readOptionalString(
                  formData,
                  "clinicInstructions",
                ),

              publicVisible:
                readBoolean(
                  formData,
                  "publicVisible",
                ),

              status:
                readString(
                  formData,
                  "locationStatus",
                ),
            });

        if (
          !locationParsed.success
        ) {
          throw new Error(
            formatValidationIssues(
              locationParsed
                .error.issues,
            ),
          );
        }

        const location =
          await practiceService
            .practiceLocations
            .create(
              tenantContext.scope,
              locationParsed.data,
            );

        const includeSession =
          readBoolean(
            formData,
            "includeSession",
          );

        if (includeSession) {
          const sessionParsed =
            practiceClinicSessionFormSchema
              .safeParse({
                practiceLocationId:
                  location.id,

                weekday:
                  readString(
                    formData,
                    "weekday",
                  ),

                localStartTime:
                  readString(
                    formData,
                    "localStartTime",
                  ),

                localEndTime:
                  readString(
                    formData,
                    "localEndTime",
                  ),

                timezone:
                  location.timezone,

                effectiveFrom:
                  readString(
                    formData,
                    "effectiveFrom",
                  ),

                effectiveTo:
                  readOptionalString(
                    formData,
                    "effectiveTo",
                  ),

                defaultAppointmentDurationMinutes:
                  readInteger(
                    formData,
                    "appointmentDuration",
                  ),

                capacity:
                  readInteger(
                    formData,
                    "capacity",
                  ),

                allowOnlineBooking:
                  readBoolean(
                    formData,
                    "allowOnlineBooking",
                  ),

                allowStaffBooking:
                  readBoolean(
                    formData,
                    "allowStaffBooking",
                  ),

                allowWalkIns:
                  readBoolean(
                    formData,
                    "allowWalkIns",
                  ),

                notes:
                  readOptionalString(
                    formData,
                    "sessionNotes",
                  ),

                status:
                  readString(
                    formData,
                    "sessionStatus",
                  ),
              });

          if (
            !sessionParsed.success
          ) {
            throw new Error(
              formatValidationIssues(
                sessionParsed
                  .error.issues,
              ),
            );
          }

          await practiceService
            .clinicSessions
            .create(
              tenantContext.scope,
              sessionParsed.data,
            );
        }

        await transitionSteps(
          "complete-step",
          ["locations"],
        );

        await transitionSteps(
          includeSession
            ? "complete-step"
            : "skip-step",
          ["clinic-sessions"],
        );
      },
    );
  }

  async function saveService(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const serviceParsed =
          practiceServiceFormSchema
            .safeParse({
              code:
                readString(
                  formData,
                  "serviceCode",
                ),

              name:
                readString(
                  formData,
                  "serviceName",
                ),

              description:
                readOptionalString(
                  formData,
                  "serviceDescription",
                ),

              category:
                readString(
                  formData,
                  "serviceCategory",
                ),

              defaultDurationMinutes:
                readInteger(
                  formData,
                  "serviceDuration",
                ),

              consultationModes: [
                readString(
                  formData,
                  "consultationMode",
                ),
              ],

              eligibility: [
                readString(
                  formData,
                  "eligibility",
                ),
              ],

              preparationInstructions:
                readOptionalString(
                  formData,
                  "preparationInstructions",
                ),

              requiresDocumentUpload:
                readBoolean(
                  formData,
                  "requiresDocumentUpload",
                ),

              deliveryScope:
                readString(
                  formData,
                  "serviceDeliveryScope",
                ),

              eligiblePractitionerIds:
                [],

              publicVisible:
                readBoolean(
                  formData,
                  "servicePublicVisible",
                ),

              publiclyBookable:
                readBoolean(
                  formData,
                  "servicePubliclyBookable",
                ),

              status:
                readString(
                  formData,
                  "serviceStatus",
                ),
            });

        if (
          !serviceParsed.success
        ) {
          throw new Error(
            formatValidationIssues(
              serviceParsed
                .error.issues,
            ),
          );
        }

        const service =
          await practiceService
            .savePracticeService(
              tenantContext.scope,
              {
                service:
                  serviceParsed.data,
              },
            );

        const locationId =
          readOptionalString(
            formData,
            "offeringLocationId",
          );

        if (
          locationId !==
          undefined
        ) {
          const offeringParsed =
            practiceServiceOfferingFormSchema
              .safeParse({
                practiceServiceId:
                  service.id,

                practiceLocationId:
                  locationId,

                fee: {
                  amountMinorUnits:
                    readInteger(
                      formData,
                      "feeMinorUnits",
                    ),

                  currencyCode:
                    readString(
                      formData,
                      "feeCurrencyCode",
                    ),
                },

                feeCollector:
                  readString(
                    formData,
                    "feeCollector",
                  ),

                paymentTiming:
                  readString(
                    formData,
                    "paymentTiming",
                  ),

                durationOverrideMinutes:
                  readOptionalInteger(
                    formData,
                    "durationOverride",
                  ),

                locationInstructions:
                  readOptionalString(
                    formData,
                    "offeringInstructions",
                  ),

                publiclyBookable:
                  readBoolean(
                    formData,
                    "offeringPubliclyBookable",
                  ),

                effectiveFrom:
                  toIsoDateTime(
                    readString(
                      formData,
                      "offeringEffectiveFrom",
                    ),
                  ),

                status:
                  readString(
                    formData,
                    "offeringStatus",
                  ),
              });

          if (
            !offeringParsed.success
          ) {
            throw new Error(
              formatValidationIssues(
                offeringParsed
                  .error.issues,
              ),
            );
          }

          await practiceService
            .savePracticeServiceOffering(
              tenantContext.scope,
              {
                offering:
                  offeringParsed.data,

                actorUserId:
                  tenantContext
                    .ownerUserId,

                feeChangeReason:
                  readString(
                    formData,
                    "initialFeeReason",
                  ),
              },
            );
        }

        await transitionSteps(
          "complete-step",
          [
            "service-catalogue",
          ],
        );
      },
    );
  }

  async function saveTeam(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        let careTeam =
          overview.careTeams[0];

        let ownerMemberId:
          string | undefined;

        if (
          careTeam === undefined
        ) {
          const allLocations =
            readBoolean(
              formData,
              "ownerAllLocations",
            );

          const selectedLocationId =
            readOptionalString(
              formData,
              "ownerLocationId",
            );

          const initialTeamParsed =
            initialPracticeCareTeamFormSchema
              .safeParse({
                careTeam: {
                  name:
                    readString(
                      formData,
                      "careTeamName",
                    ),

                  code:
                    readString(
                      formData,
                      "careTeamCode",
                    ),

                  description:
                    readOptionalString(
                      formData,
                      "careTeamDescription",
                    ),

                  timezone:
                    readString(
                      formData,
                      "careTeamTimezone",
                    ),

                  defaultPracticeLocationId:
                    readOptionalString(
                      formData,
                      "defaultLocationId",
                    ),
                },

                ownerMember: {
                  userId:
                    tenantContext
                      .ownerUserId,

                  displayName:
                    readString(
                      formData,
                      "ownerDisplayName",
                    ),

                  allPracticeLocations:
                    allLocations,

                  practiceLocationIds:
                    allLocations ||
                    selectedLocationId ===
                      undefined
                      ? []
                      : [
                          selectedLocationId,
                        ],

                  independentlyBookable:
                    readBoolean(
                      formData,
                      "ownerIndependentlyBookable",
                    ),
                },
              });

          if (
            !initialTeamParsed.success
          ) {
            throw new Error(
              formatValidationIssues(
                initialTeamParsed
                  .error.issues,
              ),
            );
          }

          const aggregate =
            await practiceService
              .createInitialPracticeCareTeam(
                tenantContext.scope,
                initialTeamParsed.data,
              );

          careTeam =
            aggregate.careTeam;

          ownerMemberId =
            aggregate.members[0]
              ?.id;
        } else {
          const aggregate =
            await practiceService
              .getCareTeamAggregate(
                tenantContext.scope,
                careTeam.id,
              );

          ownerMemberId =
            aggregate.members.find(
              (member) =>
                member.id ===
                careTeam
                  ?.ownerTeamMemberId,
            )?.id;
        }

        const inviteEmail =
          readOptionalString(
            formData,
            "inviteEmail",
          );

        if (
          inviteEmail !==
          undefined
        ) {
          if (
            careTeam ===
              undefined ||
            ownerMemberId ===
              undefined
          ) {
            throw new Error(
              "Create the owner team before inviting another member.",
            );
          }

          const supervisionLevel =
            readString(
              formData,
              "inviteSupervision",
            );

          const inviteAllLocations =
            readBoolean(
              formData,
              "inviteAllLocations",
            );

          const inviteLocationId =
            readOptionalString(
              formData,
              "inviteLocationId",
            );

          const invitationParsed =
            practiceTeamInvitationFormSchema
              .safeParse({
                careTeamId:
                  careTeam.id,

                email:
                  inviteEmail,

                displayName:
                  readString(
                    formData,
                    "inviteDisplayName",
                  ),

                roleCode:
                  readString(
                    formData,
                    "inviteRoleCode",
                  ),

                supervisionLevel,

                patientAccessScope:
                  readString(
                    formData,
                    "invitePatientScope",
                  ),

                supervisorTeamMemberId:
                  supervisionLevel ===
                    "countersigned"
                    ? ownerMemberId
                    : undefined,

                allPracticeLocations:
                  inviteAllLocations,

                practiceLocationIds:
                  inviteAllLocations ||
                  inviteLocationId ===
                    undefined
                    ? []
                    : [
                        inviteLocationId,
                      ],

                independentlyBookable:
                  readBoolean(
                    formData,
                    "inviteIndependentlyBookable",
                  ),

                invitedByTeamMemberId:
                  ownerMemberId,

                expiresAt:
                  toIsoDateTime(
                    readString(
                      formData,
                      "inviteExpiresAt",
                    ),
                  ),
              });

          if (
            !invitationParsed.success
          ) {
            throw new Error(
              formatValidationIssues(
                invitationParsed
                  .error.issues,
              ),
            );
          }

          await practiceService
            .invitePracticeTeamMember(
              tenantContext.scope,
              invitationParsed.data,
            );
        }

        await transitionSteps(
          "complete-step",
          ["team"],
        );
      },
    );
  }

  async function savePolicies(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const bookingParsed =
          practiceBookingPolicyFormSchema
            .safeParse({
              minimumBookingNoticeMinutes:
                readInteger(
                  formData,
                  "minimumNotice",
                ),

              cancellationWindowMinutes:
                readInteger(
                  formData,
                  "cancellationWindow",
                ),

              maximumReschedules:
                readInteger(
                  formData,
                  "maximumReschedules",
                ),

              noShowHandling:
                readString(
                  formData,
                  "noShowHandling",
                ),

              enforcePrepayment:
                readBoolean(
                  formData,
                  "enforcePrepayment",
                ),

              status:
                readString(
                  formData,
                  "bookingPolicyStatus",
                ),
            });

        if (
          !bookingParsed.success
        ) {
          throw new Error(
            formatValidationIssues(
              bookingParsed
                .error.issues,
            ),
          );
        }

        const bookingPolicy =
          await practiceService
            .savePracticeBookingPolicy(
              tenantContext.scope,
              {
                actorUserId:
                  tenantContext
                    .ownerUserId,

                policy:
                  bookingParsed.data,
              },
            );

        const settingsParsed =
          tenantPolicySettingsFormSchema
            .safeParse({
              defaultBookingPolicyId:
                bookingPolicy.id,

              messageResponseCommitmentMinutes:
                readOptionalInteger(
                  formData,
                  "messageResponseCommitment",
                ),

              documentRetentionDays:
                readOptionalInteger(
                  formData,
                  "documentRetentionDays",
                ),
            });

        if (
          !settingsParsed.success
        ) {
          throw new Error(
            formatValidationIssues(
              settingsParsed
                .error.issues,
            ),
          );
        }

        await practiceService
          .saveTenantPolicySettings(
            tenantContext.scope,
            {
              actorUserId:
                tenantContext
                  .ownerUserId,

              settings:
                settingsParsed.data,
            },
          );

        await transitionSteps(
          "complete-step",
          ["policies"],
        );
      },
    );
  }

  async function saveContent(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    await runTask(
      async () => {
        if (
          tenantContext ===
          undefined
        ) {
          return;
        }

        const formData =
          new FormData(
            event.currentTarget,
          );

        const languageCode =
          readString(
            formData,
            "contentLanguage",
          );

        const contentInputs = [
          {
            purpose:
              "patient-consent",

            title:
              "Patient consent",

            body:
              readString(
                formData,
                "consentBody",
              ),
          },
          {
            purpose:
              "message-safety-notice",

            title:
              "Message safety notice",

            body:
              readString(
                formData,
                "safetyNoticeBody",
              ),
          },
        ];

        const bookingTerms =
          readOptionalString(
            formData,
            "bookingTermsBody",
          );

        if (
          bookingTerms !==
          undefined
        ) {
          contentInputs.push({
            purpose:
              "booking-terms",

            title:
              "Booking terms",

            body:
              bookingTerms,
          });
        }

        for (
          const input of
          contentInputs
        ) {
          const parsed =
            tenantContentVersionFormSchema
              .safeParse({
                purpose:
                  input.purpose,

                languageCode,

                title:
                  input.title,

                body:
                  input.body,

                status:
                  "draft",
              });

          if (
            !parsed.success
          ) {
            throw new Error(
              formatValidationIssues(
                parsed.error
                  .issues,
              ),
            );
          }

          await practiceService
            .createTenantContentVersion(
              tenantContext.scope,
              {
                actorUserId:
                  tenantContext
                    .ownerUserId,

                content:
                  parsed.data,
              },
            );
        }

        await transitionSteps(
          "complete-step",
          ["content"],
        );
      },
    );
  }

  async function finishOnboarding():
    Promise<void> {
    await runTask(
      async () => {
        if (
          tenantContext ===
            undefined ||
          onboarding === undefined
        ) {
          return;
        }

        const updated =
          await practiceService
            .transitionTenantOnboarding(
              tenantContext.scope,
              {
                onboardingStateId:
                  onboarding.id,

                actorUserId:
                  tenantContext
                    .ownerUserId,

                action:
                  "complete-onboarding",
              },
            );

        setOnboarding(
          updated,
        );
      },
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-sm text-slate-600">
            Loading onboarding workflow…
          </div>
        </div>
      </div>
    );
  }

  if (
    errorMessage !== undefined &&
    onboarding === undefined
  ) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          {errorMessage}
        </p>
      </div>
    );
  }

  if (onboarding === undefined) {
    return null;
  }

  const isComplete =
    onboarding.status ===
    "completed";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Practice Setup
        </h1>

        <p className="mb-6 text-sm text-slate-600">
          {activeGroup?.title ??
            "Review and finish"}
        </p>

        <div className="mb-4 overflow-hidden rounded-lg bg-slate-100">
          <div
            className="h-2 bg-violet-700 transition-all"
            style={{
              width:
                `${progressPercentage}%`,
            }}
          />
        </div>

        <p className="text-xs text-slate-600">
          {completedCount} of{" "}
          {onboarding.steps
            .length}{" "}
          steps complete
        </p>
      </div>

      {errorMessage !== undefined ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {errorMessage}
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        {isComplete ? (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-bold text-green-900">
              Setup complete
            </h2>

            <p className="text-sm text-slate-600">
              Your practice is now ready to use.
            </p>
          </div>
        ) : activeGroup?.key ===
          "profile" ? (
          <form
            className="space-y-5"
            onSubmit={saveProfile}
          >
            <Field label="Practice display name">
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="displayName"
                required
                type="text"
              />
            </Field>

            <Field
              hint="optional"
              label="Specialty description"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="specialtyDescription"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Primary colour">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="primaryColour"
                  placeholder="#4338CA"
                  required
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Secondary colour"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="secondaryColour"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Accent colour"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="accentColour"
                  type="text"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                hint="optional"
                label="Public email"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="publicEmail"
                  type="email"
                />
              </Field>

              <Field
                hint="optional"
                label="Public phone"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="publicPhone"
                  type="text"
                />
              </Field>
            </div>

            <Field
              hint="optional"
              label="WhatsApp number"
            >
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="whatsappNumber"
                type="text"
              />
            </Field>

            <Field
              hint="one address line per row"
              label="Address lines"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="addressLines"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                hint="optional"
                label="City"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="city"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Region"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="region"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Postal code"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="postalCode"
                  type="text"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                hint="optional, 2 letters"
                label="Country code"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  maxLength={2}
                  name="countryCode"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Map URL"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="mapUrl"
                  type="text"
                />
              </Field>
            </div>

            <Field
              hint="optional"
              label="Public site URL"
            >
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="publicSiteUrl"
                type="text"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time zone">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    overview.timeZone ??
                    ""
                  }
                  name="timeZone"
                  required
                  type="text"
                />
              </Field>

              <Field label="Default currency code">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue={
                    overview
                      .defaultCurrencyCode ??
                    ""
                  }
                  name="defaultCurrencyCode"
                  required
                  type="text"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                hint="comma-separated"
                label="Supported language codes"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="en"
                  name="supportedLanguageCodes"
                  required
                  type="text"
                />
              </Field>

              <Field label="Default language code">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="en"
                  name="defaultLanguageCode"
                  required
                  type="text"
                />
              </Field>
            </div>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : activeGroup?.key ===
          "locations" ? (
          <form
            className="space-y-5"
            onSubmit={saveLocation}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location name">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="locationName"
                  required
                  type="text"
                />
              </Field>

              <Field label="Location code">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="locationCode"
                  required
                  type="text"
                />
              </Field>
            </div>

            <Field label="Location type">
              <select
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue="owned-clinic"
                name="locationType"
              >
                <option value="owned-clinic">
                  Owned clinic
                </option>

                <option value="external-hospital">
                  External hospital
                </option>

                <option value="external-clinic">
                  External clinic
                </option>

                <option value="diagnostic-center">
                  Diagnostic center
                </option>

                <option value="virtual">
                  Virtual
                </option>

                <option value="home-visit-base">
                  Home-visit base
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </Field>

            <Field
              hint="optional"
              label="External organization name"
            >
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="externalOrganizationName"
                type="text"
              />
            </Field>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Address (optional)
              </p>

              <Field label="Address line 1">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="addressLine1"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Address line 2"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="addressLine2"
                  type="text"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="locationCity"
                    type="text"
                  />
                </Field>

                <Field
                  hint="optional"
                  label="District"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="district"
                    type="text"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  hint="optional"
                  label="State/province"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="stateOrProvince"
                    type="text"
                  />
                </Field>

                <Field
                  hint="optional"
                  label="Postal code"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="locationPostalCode"
                    type="text"
                  />
                </Field>

                <Field label="Country code">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    maxLength={2}
                    name="locationCountryCode"
                    type="text"
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                hint="optional"
                label="Location phone"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="locationPhone"
                  type="text"
                />
              </Field>

              <Field
                hint="optional"
                label="Location email"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="locationEmail"
                  type="email"
                />
              </Field>
            </div>

            <Field label="Timezone">
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="locationTimezone"
                required
                type="text"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default currency code">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  maxLength={3}
                  name="locationCurrencyCode"
                  required
                  type="text"
                />
              </Field>

              <Field label="Default slot length in minutes">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={1}
                  name="defaultSlotDurationMinutes"
                  required
                  type="number"
                />
              </Field>

              <Field label="Minimum booking notice in minutes">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={0}
                  name="minimumBookingNoticeMinutes"
                  required
                  type="number"
                />
              </Field>

              <Field label="Booking horizon in days">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={1}
                  name="bookingHorizonDays"
                  required
                  type="number"
                />
              </Field>
            </div>

            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-2 text-sm font-black text-slate-900">
                Supported consultation modes
              </legend>

              <div className="mt-2 flex flex-wrap gap-4">
                {[
                  ["in-person", "In person"],
                  ["video", "Video"],
                  ["phone", "Phone"],
                  ["home-visit", "Home visit"],
                ].map(
                  ([
                    value,
                    label,
                  ]) => (
                    <label
                      className={
                        CHECKBOX_LABEL_CLASS_NAME
                      }
                      key={value}
                    >
                      <input
                        name="supportedConsultationModes"
                        type="checkbox"
                        value={value}
                      />

                      {label}
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-5">
              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="publicBookingEnabled"
                  type="checkbox"
                />

                Allow patient booking
              </label>

              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="onlinePaymentEnabled"
                  type="checkbox"
                />

                Allow online payment
              </label>
            </div>

            <Field
              hint="optional"
              label="Map URL"
            >
              <input
                className={
                  INPUT_CLASS_NAME
                }
                name="locationMapUrl"
                type="text"
              />
            </Field>

            <Field
              hint="optional"
              label="Patient directions"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="patientDirections"
              />
            </Field>

            <Field
              hint="optional"
              label="Clinic instructions"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="clinicInstructions"
              />
            </Field>

            <label
              className={
                CHECKBOX_LABEL_CLASS_NAME
              }
            >
              <input
                name="publicVisible"
                type="checkbox"
              />
              Publicly visible
            </label>

            <Field label="Status">
              <select
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue="active"
                name="locationStatus"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </Field>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  id="includeSession"
                  name="includeSession"
                  type="checkbox"
                />
                Add a recurring clinic session
                for this location
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Weekday">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="monday"
                    name="weekday"
                  >
                    <option value="monday">
                      Monday
                    </option>

                    <option value="tuesday">
                      Tuesday
                    </option>

                    <option value="wednesday">
                      Wednesday
                    </option>

                    <option value="thursday">
                      Thursday
                    </option>

                    <option value="friday">
                      Friday
                    </option>

                    <option value="saturday">
                      Saturday
                    </option>

                    <option value="sunday">
                      Sunday
                    </option>
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="active"
                    name="sessionStatus"
                  >
                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start time">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="09:00"
                    name="localStartTime"
                    type="text"
                  />
                </Field>

                <Field label="End time">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="17:00"
                    name="localEndTime"
                    type="text"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Effective from">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="effectiveFrom"
                    type="date"
                  />
                </Field>

                <Field
                  hint="optional"
                  label="Effective to"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="effectiveTo"
                    type="date"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Appointment duration (minutes)">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="30"
                    min={1}
                    name="appointmentDuration"
                    type="number"
                  />
                </Field>

                <Field label="Capacity">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="1"
                    min={1}
                    name="capacity"
                    type="number"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-4">
                <label
                  className={
                    CHECKBOX_LABEL_CLASS_NAME
                  }
                >
                  <input
                    name="allowOnlineBooking"
                    type="checkbox"
                  />
                  Allow online booking
                </label>

                <label
                  className={
                    CHECKBOX_LABEL_CLASS_NAME
                  }
                >
                  <input
                    name="allowStaffBooking"
                    type="checkbox"
                  />
                  Allow staff booking
                </label>

                <label
                  className={
                    CHECKBOX_LABEL_CLASS_NAME
                  }
                >
                  <input
                    name="allowWalkIns"
                    type="checkbox"
                  />
                  Allow walk-ins
                </label>
              </div>

              <Field
                hint="optional"
                label="Session notes"
              >
                <textarea
                  className={
                    TEXTAREA_CLASS_NAME
                  }
                  name="sessionNotes"
                />
              </Field>
            </div>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : activeGroup?.key ===
          "service-catalogue" ? (
          <form
            className="space-y-5"
            onSubmit={saveService}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service code">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="serviceCode"
                  required
                  type="text"
                />
              </Field>

              <Field label="Service name">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="serviceName"
                  required
                  type="text"
                />
              </Field>
            </div>

            <Field
              hint="optional"
              label="Service description"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="serviceDescription"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="initial-consultation"
                  name="serviceCategory"
                >
                  <option value="initial-consultation">
                    Initial consultation
                  </option>

                  <option value="follow-up-consultation">
                    Follow-up consultation
                  </option>

                  <option value="dietitian-consultation">
                    Dietitian consultation
                  </option>

                  <option value="teleconsultation">
                    Teleconsultation
                  </option>

                  <option value="report-review">
                    Report review
                  </option>

                  <option value="procedure">
                    Procedure
                  </option>

                  <option value="post-operative-review">
                    Post-operative review
                  </option>

                  <option value="multidisciplinary-review">
                    Multidisciplinary review
                  </option>

                  <option value="home-visit">
                    Home visit
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </Field>

              <Field label="Default duration (minutes)">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="30"
                  min={1}
                  name="serviceDuration"
                  type="number"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Consultation mode">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="consultationMode"
                >
                  <option value="in-person">
                    In person
                  </option>

                  <option value="video">
                    Video
                  </option>

                  <option value="phone">
                    Phone
                  </option>
                </select>
              </Field>

              <Field label="Eligibility">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="all-patients"
                  name="eligibility"
                >
                  <option value="new-patient">
                    New patient
                  </option>

                  <option value="existing-patient">
                    Existing patient
                  </option>

                  <option value="post-operative-patient">
                    Post-operative patient
                  </option>

                  <option value="referred-patient">
                    Referred patient
                  </option>

                  <option value="adult">
                    Adult
                  </option>

                  <option value="child">
                    Child
                  </option>

                  <option value="all-patients">
                    All patients
                  </option>
                </select>
              </Field>
            </div>

            <Field
              hint="optional"
              label="Preparation instructions"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="preparationInstructions"
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="requiresDocumentUpload"
                  type="checkbox"
                />
                Requires document upload
              </label>

              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="servicePubliclyBookable"
                  type="checkbox"
                />
                Publicly bookable
              </label>
            </div>

            <Field label="Status">
              <select
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue="active"
                name="serviceStatus"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </Field>

            <Field label="Who may deliver this service?">
              <select
                className={
                  INPUT_CLASS_NAME
                }
                name="serviceDeliveryScope"
                required
              >
                <option value="">
                  Select…
                </option>

                <option value="unassigned">
                  Not assigned yet
                </option>

                <option value="any-active-clinician">
                  Any active clinician
                </option>
              </select>
            </Field>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  name="servicePublicVisible"
                  type="checkbox"
                />

                Display this service publicly
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  name="servicePubliclyBookable"
                  type="checkbox"
                />

                Allow patient booking
              </label>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Offering (optional — requires a
                saved location)
              </p>

              <Field
                hint={
                  overview.locations
                    .length === 0
                    ? "no locations available yet"
                    : "select to create an offering"
                }
                label="Location"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue=""
                  name="offeringLocationId"
                >
                  <option value="">
                    None
                  </option>

                  {overview.locations.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {
                          location.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fee (minor units)">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="0"
                    min={0}
                    name="feeMinorUnits"
                    type="number"
                  />
                </Field>

                <Field label="Fee currency code">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={
                      overview
                        .defaultCurrencyCode ??
                      ""
                    }
                    name="feeCurrencyCode"
                    type="text"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fee collector">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="practice"
                    name="feeCollector"
                  >
                    <option value="practice">
                      Practice
                    </option>

                    <option value="hospital">
                      Hospital
                    </option>
                  </select>
                </Field>

                <Field label="Payment timing">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="at-booking"
                    name="paymentTiming"
                  >
                    <option value="not-required">
                      Not required
                    </option>

                    <option value="at-booking">
                      At booking
                    </option>

                    <option value="before-appointment">
                      Before appointment
                    </option>

                    <option value="at-location">
                      At location
                    </option>

                    <option value="after-service">
                      After service
                    </option>
                  </select>
                </Field>
              </div>

              <Field
                hint="optional"
                label="Duration override (minutes)"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={1}
                  name="durationOverride"
                  type="number"
                />
              </Field>

              <Field
                hint="optional"
                label="Location instructions"
              >
                <textarea
                  className={
                    TEXTAREA_CLASS_NAME
                  }
                  name="offeringInstructions"
                />
              </Field>

              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="offeringPubliclyBookable"
                  type="checkbox"
                />
                Publicly bookable
              </label>

              <Field label="Effective from">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="offeringEffectiveFrom"
                  type="datetime-local"
                />
              </Field>

              <Field label="Initial fee reason">
                <textarea
                  className={
                    TEXTAREA_CLASS_NAME
                  }
                  name="initialFeeReason"
                />
              </Field>

              <Field label="Offering status">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="active"
                  name="offeringStatus"
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>
                </select>
              </Field>
            </div>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : activeGroup?.key ===
          "team" ? (
          <form
            className="space-y-5"
            onSubmit={saveTeam}
          >
            {overview.careTeams
              .length === 0 ? (
              <div className="space-y-4 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Owner care team
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Team name">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="careTeamName"
                      required
                      type="text"
                    />
                  </Field>

                  <Field label="Team code">
                    <input
                      className={
                        INPUT_CLASS_NAME
                      }
                      name="careTeamCode"
                      required
                      type="text"
                    />
                  </Field>
                </div>

                <Field
                  hint="optional"
                  label="Team description"
                >
                  <textarea
                    className={
                      TEXTAREA_CLASS_NAME
                    }
                    name="careTeamDescription"
                  />
                </Field>

                <Field label="Team timezone">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue={
                      overview.timeZone ??
                      ""
                    }
                    name="careTeamTimezone"
                    required
                    type="text"
                  />
                </Field>

                <Field
                  hint="optional"
                  label="Default location"
                >
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue=""
                    name="defaultLocationId"
                  >
                    <option value="">
                      None
                    </option>

                    {overview.locations.map(
                      (location) => (
                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {
                            location.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Owner display name">
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="ownerDisplayName"
                    required
                    type="text"
                  />
                </Field>

                <label
                  className={
                    CHECKBOX_LABEL_CLASS_NAME
                  }
                >
                  <input
                    name="ownerAllLocations"
                    type="checkbox"
                  />
                  Owner works at all
                  locations
                </label>

                <Field
                  hint="used only when not all locations"
                  label="Owner location"
                >
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue=""
                    name="ownerLocationId"
                  >
                    <option value="">
                      None
                    </option>

                    {overview.locations.map(
                      (location) => (
                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {
                            location.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <label
                  className={
                    CHECKBOX_LABEL_CLASS_NAME
                  }
                >
                  <input
                    name="ownerIndependentlyBookable"
                    type="checkbox"
                  />
                  Owner is independently
                  bookable
                </label>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Owner team already created.
                You may optionally invite
                another team member below.
              </p>
            )}

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Invite a team member (optional)
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  hint="optional"
                  label="Email"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="inviteEmail"
                    type="email"
                  />
                </Field>

                <Field
                  hint="optional"
                  label="Display name"
                >
                  <input
                    className={
                      INPUT_CLASS_NAME
                    }
                    name="inviteDisplayName"
                    type="text"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="consultant"
                    name="inviteRoleCode"
                  >
                    <option value="owner">
                      Owner
                    </option>

                    <option value="consultant">
                      Consultant
                    </option>

                    <option value="senior-registrar">
                      Senior registrar
                    </option>

                    <option value="resident">
                      Resident
                    </option>

                    <option value="house-surgeon">
                      House surgeon
                    </option>

                    <option value="clinical-dietitian">
                      Clinical dietitian
                    </option>

                    <option value="coordinator">
                      Coordinator
                    </option>
                  </select>
                </Field>

                <Field label="Supervision level">
                  <select
                    className={
                      INPUT_CLASS_NAME
                    }
                    defaultValue="independent"
                    name="inviteSupervision"
                  >
                    <option value="independent">
                      Independent
                    </option>

                    <option value="countersigned">
                      Countersigned
                    </option>

                    <option value="non-clinical">
                      Non-clinical
                    </option>
                  </select>
                </Field>
              </div>

              <Field label="Patient access scope">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="all-patients"
                  name="invitePatientScope"
                >
                  <option value="all-patients">
                    All patients
                  </option>

                  <option value="assigned-patients">
                    Assigned patients
                  </option>

                  <option value="administrative-only">
                    Administrative only
                  </option>

                  <option value="no-patient-access">
                    No patient access
                  </option>
                </select>
              </Field>

              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="inviteAllLocations"
                  type="checkbox"
                />
                Works at all locations
              </label>

              <Field
                hint="used only when not all locations"
                label="Invitee location"
              >
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue=""
                  name="inviteLocationId"
                >
                  <option value="">
                    None
                  </option>

                  {overview.locations.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {
                          location.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <label
                className={
                  CHECKBOX_LABEL_CLASS_NAME
                }
              >
                <input
                  name="inviteIndependentlyBookable"
                  type="checkbox"
                />
                Independently bookable
              </label>

              <Field label="Invitation expires at">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  name="inviteExpiresAt"
                  type="datetime-local"
                />
              </Field>
            </div>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : activeGroup?.key ===
          "policies" ? (
          <form
            className="space-y-5"
            onSubmit={savePolicies}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum booking notice (minutes)">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="0"
                  min={0}
                  name="minimumNotice"
                  type="number"
                />
              </Field>

              <Field label="Cancellation window (minutes)">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="0"
                  min={0}
                  name="cancellationWindow"
                  type="number"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Maximum reschedules">
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="0"
                  min={0}
                  name="maximumReschedules"
                  type="number"
                />
              </Field>

              <Field label="No-show handling">
                <select
                  className={
                    INPUT_CLASS_NAME
                  }
                  defaultValue="record-only"
                  name="noShowHandling"
                >
                  <option value="record-only">
                    Record only
                  </option>

                  <option value="require-staff-review">
                    Require staff review
                  </option>

                  <option value="restrict-future-online-booking">
                    Restrict future online
                    booking
                  </option>
                </select>
              </Field>
            </div>

            <label
              className={
                CHECKBOX_LABEL_CLASS_NAME
              }
            >
              <input
                name="enforcePrepayment"
                type="checkbox"
              />
              Enforce prepayment
            </label>

            <Field label="Booking policy status">
              <select
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue="active"
                name="bookingPolicyStatus"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                hint="optional"
                label="Message response commitment (minutes)"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={0}
                  name="messageResponseCommitment"
                  type="number"
                />
              </Field>

              <Field
                hint="optional"
                label="Document retention (days)"
              >
                <input
                  className={
                    INPUT_CLASS_NAME
                  }
                  min={0}
                  name="documentRetentionDays"
                  type="number"
                />
              </Field>
            </div>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : activeGroup?.key ===
          "content" ? (
          <form
            className="space-y-5"
            onSubmit={saveContent}
          >
            <Field label="Content language code">
              <input
                className={
                  INPUT_CLASS_NAME
                }
                defaultValue="en"
                name="contentLanguage"
                required
                type="text"
              />
            </Field>

            <Field label="Patient consent wording">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="consentBody"
                required
              />
            </Field>

            <Field label="Message safety notice wording">
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="safetyNoticeBody"
                required
              />
            </Field>

            <Field
              hint="optional"
              label="Booking terms wording"
            >
              <textarea
                className={
                  TEXTAREA_CLASS_NAME
                }
                name="bookingTermsBody"
              />
            </Field>

            <FormActions
              busy={busy}
              onSkip={
                skipActiveGroup
              }
              saveLabel="Save and continue"
            />
          </form>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">
              Review your setup
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Profile
                </dt>

                <dd className="text-sm text-slate-800">
                  {overview.profileName ??
                    "Not set"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Locations
                </dt>

                <dd className="text-sm text-slate-800">
                  {
                    overview.locations
                      .length
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Services
                </dt>

                <dd className="text-sm text-slate-800">
                  {
                    overview.services
                      .length
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Care teams
                </dt>

                <dd className="text-sm text-slate-800">
                  {
                    overview.careTeams
                      .length
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Booking policies
                </dt>

                <dd className="text-sm text-slate-800">
                  {
                    overview.bookingPolicyCount
                  }
                </dd>
              </div>

              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Content blocks
                </dt>

                <dd className="text-sm text-slate-800">
                  {
                    overview.contentBlockCount
                  }
                </dd>
              </div>
            </dl>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
              <button
                className="h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={busy}
                onClick={
                  skipActiveGroup
                }
                type="button"
              >
                Skip review
              </button>

              <button
                className="h-11 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 disabled:opacity-50"
                disabled={busy}
                onClick={() =>
                  void finishOnboarding()
                }
                type="button"
              >
                {busy
                  ? "Finishing…"
                  : "Finish setup"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-2">
        <h3 className="font-semibold text-slate-900">
          Steps
        </h3>

        {onboarding.steps.map(
          (step) => (
            <div
              key={step.code}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={
                  step.status ===
                    "completed"
                    ? "text-green-600"
                    : step.status ===
                        "skipped"
                      ? "text-slate-500"
                      : step.status ===
                          "in-progress"
                        ? "text-blue-600"
                        : "text-slate-400"
                }
              >
                {step.status ===
                  "completed"
                  ? "✓"
                  : step.status ===
                      "skipped"
                    ? "–"
                    : "○"}
              </span>

              <span
                className={
                  step.status ===
                    "in-progress"
                    ? "font-semibold text-slate-900"
                    : "text-slate-600"
                }
              >
                {
                  STEP_LABELS[
                    step.code
                  ]
                }
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
