export type WonFlowDeploymentEnvironment =
  | "development"
  | "test"
  | "staging"
  | "pilot"
  | "production";

export type WonFlowNodeEnvironment =
  | "development"
  | "test"
  | "production";

export type WonFlowDataMode =
  | "mock"
  | "api";

export type WonFlowLocale =
  | "en"
  | "ur";

export type WonFlowDemoScenario =
  | "hospital-day"
  | "busy-opd"
  | "inpatient-focus";

export type WonFlowPortalCode =
  | "organization-admin"
  | "practice-doctor"
  | "reception"
  | "patient-portal"
  | "platform-admin";

export type WonFlowPortalRouteGroup =
  | "(organization-admin)"
  | "(doctor-workspace)"
  | "(hospital-operations)"
  | "(patient-access)"
  | "(platform-admin)";

export type WonFlowFeatureFlagKey =
  | "platformAdministration"
  | "organizationAdministration"
  | "hospitalOperations"
  | "doctorWorkspace"
  | "managementPortal"
  | "patientAccess"
  | "progressiveWebApp"
  | "androidPackaging"
  | "demoData"
  | "backendApi"
  | "realTimeUpdates"
  | "englishLocalization"
  | "urduLocalization"
  | "practice-booking"
  | "practice-documents"
  | "practice-messaging"
  | "practice-payments-online"
  | "practice-payments-offline"
  | "practice-team-management"
  | "patient-portal"
  | "public-booking-page"
  | "mobile-apps";

export interface WonFlowPublicEnvironment {
  NODE_ENV: WonFlowNodeEnvironment;

  WONFLOW_ENVIRONMENT:
    WonFlowDeploymentEnvironment;

  NEXT_PUBLIC_WONFLOW_APP_NAME: string;
  NEXT_PUBLIC_WONFLOW_APP_URL: string;

  NEXT_PUBLIC_WONFLOW_DEFAULT_LOCALE:
    WonFlowLocale;

  NEXT_PUBLIC_WONFLOW_DATA_MODE:
    WonFlowDataMode;

  NEXT_PUBLIC_WONFLOW_ENABLE_DEMO:
    boolean;

  NEXT_PUBLIC_WONFLOW_DEMO_SCENARIO:
    WonFlowDemoScenario;

  NEXT_PUBLIC_WONFLOW_SHOW_ENVIRONMENT_BANNER:
    boolean;

  NEXT_PUBLIC_WONFLOW_ENABLE_PATIENT_ACCESS:
    boolean;

  NEXT_PUBLIC_WONFLOW_BUILD_ID?: string;
}

export interface WonFlowServerEnvironment {
  WONFLOW_ENVIRONMENT:
    WonFlowDeploymentEnvironment;

  DATABASE_URL: string;
  DIRECT_URL?: string;

  SESSION_SECRET: string;
  AUTH_ENCRYPTION_KEY: string;

  ALLOW_MOCK_DATA: boolean;

  REDIS_URL?: string;

  OBJECT_STORAGE_ENDPOINT?: string;
  OBJECT_STORAGE_BUCKET?: string;
  OBJECT_STORAGE_ACCESS_KEY?: string;
  OBJECT_STORAGE_SECRET_KEY?: string;

  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
}

export interface WonFlowPortalConfiguration {
  code: WonFlowPortalCode;

  name: string;
  description: string;

  routePrefix: string;

  routeGroup:
    WonFlowPortalRouteGroup;

  featureFlag: WonFlowFeatureFlagKey;

  intendedUsers: readonly string[];

  patientFacing: boolean;
  staffFacing: boolean;
  administrationFacing: boolean;
}

export interface WonFlowFeatureFlagDefinition {
  key: WonFlowFeatureFlagKey;

  title: string;
  description: string;

  productionCritical: boolean;
  publiclyVisible: boolean;
}

export type WonFlowResolvedFeatureFlags =
  Record<WonFlowFeatureFlagKey, boolean>;

export interface WonFlowAppConfiguration {
  application: {
    name: string;
    version: string;
    buildId?: string;

    environment:
      WonFlowDeploymentEnvironment;

    nodeEnvironment:
      WonFlowNodeEnvironment;

    baseUrl: string;
    defaultLocale: WonFlowLocale;
    dataMode: WonFlowDataMode;

    demoScenario:
      WonFlowDemoScenario;

    showEnvironmentBanner: boolean;
  };

  featureFlags:
    WonFlowResolvedFeatureFlags;

  portals:
    readonly WonFlowPortalConfiguration[];
}
