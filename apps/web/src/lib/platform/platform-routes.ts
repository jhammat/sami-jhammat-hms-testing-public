export const PLATFORM_HOME_PATH =
  "/platform";

export const PLATFORM_ORGANIZATIONS_PATH =
  `${PLATFORM_HOME_PATH}/organizations`;

export const PLATFORM_PROVISION_TENANT_PATH =
  `${PLATFORM_ORGANIZATIONS_PATH}/new`;

export const PLATFORM_ENTITLEMENTS_PATH =
  `${PLATFORM_HOME_PATH}/entitlements`;

export const PLATFORM_SUBSCRIPTIONS_PATH =
  `${PLATFORM_HOME_PATH}/subscriptions`;

export const PLATFORM_SUPPORT_ACCESS_PATH =
  `${PLATFORM_HOME_PATH}/support`;

export const PLATFORM_AUDIT_PATH =
  `${PLATFORM_HOME_PATH}/audit`;

export const PLATFORM_SETTINGS_PATH =
  `${PLATFORM_HOME_PATH}/settings`;

export function createPlatformOrganizationPath(
  id: string,
): string {
  return `${PLATFORM_ORGANIZATIONS_PATH}/${encodeURIComponent(
    id,
  )}`;
}

export function createPlatformOrganizationSubscriptionPath(
  id: string,
): string {
  return `${createPlatformOrganizationPath(
    id,
  )}?tab=subscription`;
}

export function createPlatformOrganizationEntitlementsPath(
  id: string,
): string {
  return `${createPlatformOrganizationPath(
    id,
  )}?tab=entitlements`;
}

export function createPlatformOrganizationSupportPath(
  id: string,
): string {
  return `${PLATFORM_SUPPORT_ACCESS_PATH}?tenant=${encodeURIComponent(
    id,
  )}`;
}
