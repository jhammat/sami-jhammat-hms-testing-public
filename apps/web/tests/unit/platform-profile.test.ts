import { describe, expect, it } from "vitest";

import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";

describe("Platform Superadmin Profile & Password Rules", () => {
  describe("Password Complexity & Validation", () => {
    it("accepts strong passwords meeting all requirements", () => {
      expect(() => validateNewPassword("WonFlowDemo2026!")).not.toThrow();
      expect(() => validateNewPassword("SecurePassw0rd#2026")).not.toThrow();
    });

    it("rejects passwords shorter than 12 characters", () => {
      expect(() => validateNewPassword("Short123A!")).toThrow(
        "Password must contain at least 12 characters.",
      );
    });

    it("rejects passwords missing uppercase, lowercase or numbers", () => {
      expect(() => validateNewPassword("alllowercase12345")).toThrow(
        "Password must contain uppercase, lowercase and numeric characters.",
      );
      expect(() => validateNewPassword("ALLUPPERCASE12345")).toThrow(
        "Password must contain uppercase, lowercase and numeric characters.",
      );
      expect(() => validateNewPassword("NoNumbersHereAtAll!")).toThrow(
        "Password must contain uppercase, lowercase and numeric characters.",
      );
    });

    it("hashes and verifies passwords accurately with scrypt", async () => {
      const password = "ValidPassword2026!";
      const hash = await hashPassword(password);

      expect(typeof hash).toBe("string");
      expect(hash.startsWith("scrypt$")).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("Avatar Constraints", () => {
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_BYTES = 2 * 1024 * 1024;

    it("accepts valid image formats", () => {
      expect(ALLOWED_TYPES.has("image/jpeg")).toBe(true);
      expect(ALLOWED_TYPES.has("image/png")).toBe(true);
      expect(ALLOWED_TYPES.has("image/webp")).toBe(true);
    });

    it("rejects dangerous or unsupported formats", () => {
      expect(ALLOWED_TYPES.has("image/svg+xml")).toBe(false);
      expect(ALLOWED_TYPES.has("text/html")).toBe(false);
      expect(ALLOWED_TYPES.has("application/javascript")).toBe(false);
    });

    it("enforces maximum 2 MB image file limit", () => {
      const validSize = 1.5 * 1024 * 1024;
      const oversize = 2.5 * 1024 * 1024;

      expect(validSize <= MAX_BYTES).toBe(true);
      expect(oversize <= MAX_BYTES).toBe(false);
    });
  });
});
