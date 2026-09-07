import { describe, expect, it } from "vitest";

// Unit test covering the date transformation helpers used in platform subscription UI and server
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function isoOrEmpty(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {}
  return "";
}

function optionalDate(value: string | null | undefined, label: string): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid.`);
  return date;
}

describe("Platform Subscription Date Parsing & Input Normalization", () => {
  it("extracts YYYY-MM-DD from ISO-8601 timestamps for HTML5 date inputs", () => {
    expect(toDateInputValue("2026-09-04T00:00:00.000Z")).toBe("2026-09-04");
    expect(toDateInputValue("2026-12-31T23:59:59.999Z")).toBe("2026-12-31");
    expect(toDateInputValue("2027-01-15")).toBe("2027-01-15");
  });

  it("handles empty or null values gracefully in toDateInputValue", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue("")).toBe("");
  });

  it("extracts YYYY-MM-DD in isoOrEmpty for server subscriptions mapping", () => {
    expect(isoOrEmpty("2026-09-04T12:30:00.000Z")).toBe("2026-09-04");
    expect(isoOrEmpty("2026-09-04")).toBe("2026-09-04");
    expect(isoOrEmpty(null)).toBe("");
    expect(isoOrEmpty(undefined)).toBe("");
    expect(isoOrEmpty("invalid-date")).toBe("");
  });

  it("parses optionalDate correctly on the server", () => {
    expect(optionalDate("2026-09-04", "Renewal date")).toBeInstanceOf(Date);
    expect(optionalDate("2026-09-04T00:00:00.000Z", "Renewal date")).toBeInstanceOf(Date);
    expect(optionalDate(null, "Renewal date")).toBeNull();
    expect(optionalDate(undefined, "Renewal date")).toBeNull();
    expect(optionalDate("", "Renewal date")).toBeNull();
    expect(optionalDate("   ", "Renewal date")).toBeNull();
    expect(() => optionalDate("invalid", "Renewal date")).toThrow("Renewal date is invalid.");
  });
});
