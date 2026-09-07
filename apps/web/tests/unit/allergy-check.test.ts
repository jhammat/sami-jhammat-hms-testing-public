import { describe, expect, it } from "vitest";

import { describeAllergyConflicts, findAllergyConflicts } from "@/server/clinical/allergy-check";

describe("findAllergyConflicts", () => {
  it("catches prescribing the exact substance the patient reacts to", () => {
    const conflicts = findAllergyConflicts(
      [{ allergen: "Penicillin", severity: "Severe", reaction: "anaphylaxis" }],
      [{ name: "Penicillin V" }],
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.basis).toBe("exact");
  });

  it("catches a same-class substitute — the case a string comparison misses", () => {
    // Allergic to penicillin, prescribed amoxicillin. The names share no
    // substring; only the class table connects them.
    const conflicts = findAllergyConflicts(
      [{ allergen: "Penicillin", severity: "Severe", reaction: "anaphylaxis" }],
      [{ name: "Amoxicillin", alternateNames: ["Amoxil", "MED-AMX-500"] }],
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.basis).toBe("class");
    expect(conflicts[0]!.medicationName).toBe("Amoxicillin");
  });

  it("matches on a brand name the patient was never prescribed under", () => {
    const conflicts = findAllergyConflicts(
      [{ allergen: "Brufen" }],
      [{ name: "Ibuprofen" }],
    );

    expect(conflicts).toHaveLength(1);
  });

  it("stays quiet for unrelated drugs", () => {
    const conflicts = findAllergyConflicts(
      [{ allergen: "Penicillin" }],
      [{ name: "Metformin" }, { name: "Omeprazole" }],
    );

    expect(conflicts).toEqual([]);
  });

  it("does not fire on an empty or blank allergy row", () => {
    expect(findAllergyConflicts([{ allergen: "   " }], [{ name: "Amoxicillin" }])).toEqual([]);
    expect(findAllergyConflicts([], [{ name: "Amoxicillin" }])).toEqual([]);
  });

  it("reports every conflicting item, not just the first", () => {
    const conflicts = findAllergyConflicts(
      [{ allergen: "Sulfa" }, { allergen: "NSAID" }],
      [{ name: "Co-trimoxazole" }, { name: "Diclofenac" }, { name: "Metformin" }],
    );

    expect(conflicts).toHaveLength(2);
    expect(conflicts.map((conflict) => conflict.medicationName).sort()).toEqual([
      "Co-trimoxazole",
      "Diclofenac",
    ]);
  });

  it("describes a conflict in words a prescriber can act on", () => {
    const message = describeAllergyConflicts(
      findAllergyConflicts(
        [{ allergen: "Penicillin", severity: "Severe", reaction: "anaphylaxis" }],
        [{ name: "Amoxicillin" }],
      ),
    );

    expect(message).toContain("Amoxicillin");
    expect(message).toContain("Penicillin");
    expect(message).toContain("Severe");
    expect(message).toContain("anaphylaxis");
    expect(message).toContain("same drug class");
  });
});
