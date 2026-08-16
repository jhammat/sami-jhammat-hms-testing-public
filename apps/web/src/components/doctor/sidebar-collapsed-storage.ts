// Interface preference only: whether the doctor portal sidebar is collapsed.
// No patient, clinical or business data is stored here — see
// docs/architecture/client-storage.md.

const SIDEBAR_MODE_STORAGE_KEY =
  "wonflow-doctor-sidebar-collapsed";

export function readSidebarCollapsed(): boolean {
  return (
    window.localStorage.getItem(
      SIDEBAR_MODE_STORAGE_KEY,
    ) === "true"
  );
}

export function writeSidebarCollapsed(
  collapsed: boolean,
): void {
  window.localStorage.setItem(
    SIDEBAR_MODE_STORAGE_KEY,
    String(collapsed),
  );
}
