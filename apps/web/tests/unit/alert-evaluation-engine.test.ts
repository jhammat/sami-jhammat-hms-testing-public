import { describe, expect, it } from "vitest";
import { AlertEvaluationService } from "@/server/clinical/alert-evaluation-service";

describe("AlertEvaluationService - Threshold & Rule Engine", () => {
  const service = new AlertEvaluationService();

  describe("evaluateComparator", () => {
    it("evaluates GT (Greater Than) comparator correctly for numeric values", () => {
      // e.g. Amylase > 300
      expect(service.evaluateComparator("GT", 350, "300")).toBe(true);
      expect(service.evaluateComparator("GT", 300, "300")).toBe(false);
      expect(service.evaluateComparator("GT", 250, "300")).toBe(false);
      expect(service.evaluateComparator("GT", "38.5", "38.0")).toBe(true);
      expect(service.evaluateComparator("GT", "37.5", "38.0")).toBe(false);
    });

    it("evaluates LT (Less Than) comparator correctly", () => {
      // e.g. SpO2 < 92%
      expect(service.evaluateComparator("LT", 89, "92")).toBe(true);
      expect(service.evaluateComparator("LT", 92, "92")).toBe(false);
      expect(service.evaluateComparator("LT", 98, "92")).toBe(false);
    });

    it("evaluates GTE and LTE comparators", () => {
      // Severe pain >= 7
      expect(service.evaluateComparator("GTE", 7, "7")).toBe(true);
      expect(service.evaluateComparator("GTE", 8, "7")).toBe(true);
      expect(service.evaluateComparator("GTE", 6, "7")).toBe(false);

      expect(service.evaluateComparator("LTE", 60, "60")).toBe(true);
      expect(service.evaluateComparator("LTE", 65, "60")).toBe(false);
    });

    it("evaluates EQ (Exact String Match) comparator", () => {
      expect(service.evaluateComparator("EQ", "RED", "red")).toBe(true);
      expect(service.evaluateComparator("EQ", "YELLOW", "RED")).toBe(false);
    });

    it("evaluates CHANGE_TO comparator for categorical transitions (e.g. abnormal drain fluids)", () => {
      const allowedTargets = "DARK_BROWN,GREEN,MILKY,BILIOUS";
      expect(service.evaluateComparator("CHANGE_TO", "GREEN", allowedTargets)).toBe(true);
      expect(service.evaluateComparator("CHANGE_TO", "BILIOUS", allowedTargets)).toBe(true);
      expect(service.evaluateComparator("CHANGE_TO", "MILKY", allowedTargets)).toBe(true);
      expect(service.evaluateComparator("CHANGE_TO", "SEROUS", allowedTargets)).toBe(false);
      expect(service.evaluateComparator("CHANGE_TO", "STRAW", allowedTargets)).toBe(false);
    });

    it("evaluates MISSED_COUNT for medication adherence alerts", () => {
      expect(service.evaluateComparator("MISSED_COUNT", 2, "2")).toBe(true);
      expect(service.evaluateComparator("MISSED_COUNT", 3, "2")).toBe(true);
      expect(service.evaluateComparator("MISSED_COUNT", 1, "2")).toBe(false);
    });

    it("evaluates CHANGE_BY for rapid weight delta", () => {
      expect(service.evaluateComparator("CHANGE_BY", -3.5, "3.0")).toBe(true);
      expect(service.evaluateComparator("CHANGE_BY", 3.2, "3.0")).toBe(true);
      expect(service.evaluateComparator("CHANGE_BY", 1.5, "3.0")).toBe(false);
    });
  });
});
