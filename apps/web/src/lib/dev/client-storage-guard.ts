/**
 * Development-only guard: warns loudly, naming the source file, whenever
 * something outside the client-storage allow-list writes to localStorage or
 * sessionStorage. User data lives in PostgreSQL, reached through an API
 * route — client storage is for interface preference only. See
 * docs/architecture/client-storage.md.
 *
 * This is a runtime backstop for cases the ESLint rule cannot see (for
 * example, code loaded dynamically or generated at runtime). It never runs
 * in production.
 */

const ALLOW_LISTED_STORAGE_FILES = [
  "sidebar-collapsed-storage",
  "theme-toggle",
];

const ALLOW_LISTED_STORAGE_KEYS = [
  "wonflow-color-theme",
  "wonflow-sidebar-collapsed",
  "wonflow-sidebar-state",
  "wonflow-data-cleanup-v1",
];

/**
 * Keys written by the dev toolchain rather than by this application.
 *
 * Next.js opens a debug channel in sessionStorage under a per-tab random
 * suffix. The guard has no way to allow-list that by exact key, and flagging
 * it fired a console error on a large share of pages in development — which
 * is exactly how a backstop stops being read. Prefixes are matched rather
 * than exact keys so the noise goes without weakening the check on anything
 * the product itself writes.
 */
const IGNORED_STORAGE_KEY_PREFIXES = [
  "__next_debug_channel",
  "__next",
  "__nextjs",
];

function extractCallerFile(
  stack: string | undefined,
): string {
  if (!stack) {
    return "an unknown file";
  }

  const frames = stack
    .split("\n")
    .slice(1);

  for (const frame of frames) {
    if (frame.includes("client-storage-guard")) {
      continue;
    }

    const match = frame.match(
      /([^\s(]+\.(?:tsx?|jsx?))(?::\d+:\d+)?/,
    );

    if (match) {
      return match[1];
    }
  }

  return "an unknown file";
}

let installed = false;

export function installClientStorageGuard(): void {
  if (
    installed ||
    typeof window === "undefined"
  ) {
    return;
  }

  installed = true;

  const originalSetItem =
    Storage.prototype.setItem;

  Storage.prototype.setItem = function patchedSetItem(
    this: Storage,
    key: string,
    value: string,
  ): void {
    const rawStack = new Error().stack ?? "";
    const callerFile = extractCallerFile(rawStack);

    const isAllowListed =
      ALLOW_LISTED_STORAGE_KEYS.includes(key) ||
      IGNORED_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
      ALLOW_LISTED_STORAGE_FILES.some(
        (name) =>
          callerFile.includes(name) || rawStack.includes(name),
      );

    if (!isAllowListed) {
      console.error(
        `[wonflow] Unexpected client storage write outside the allow-list in ${callerFile} (key: "${key}"). User data must be persisted through the API, not localStorage/sessionStorage. See docs/architecture/client-storage.md.`,
      );
    }

    originalSetItem.call(
      this,
      key,
      value,
    );
  };
}
