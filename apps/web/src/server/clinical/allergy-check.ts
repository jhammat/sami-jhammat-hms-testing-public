/**
 * Prescription-time allergy screening.
 *
 * Nothing in this product used to read a patient's allergy list before writing
 * a prescription. The list was fetched and painted as a red banner at the top
 * of the consultation screen, and that was the whole safeguard: a human
 * noticing. A doctor working a 60-patient OPD list does not always notice, and
 * the video-consultation path never showed the banner at all.
 *
 * What this can and cannot do, stated plainly, because the difference matters
 * clinically:
 *
 *   - It catches the direct case — the patient is recorded as allergic to
 *     "Penicillin" and someone prescribes penicillin.
 *   - It catches same-class substitutes through `DRUG_CLASS_MEMBERS` below —
 *     allergic to penicillin, prescribed amoxicillin. This is the case a
 *     plain string comparison misses and the one that actually reaches
 *     patients.
 *   - It does NOT do drug-drug interactions, duplicate therapy, dose ceilings
 *     or weight-based paediatric dosing. Those need a licensed drug database
 *     (First Databank, Multum, or similar) and are a procurement decision, not
 *     something to approximate in a source file. They remain open.
 *
 * The class table is deliberately small and covers what a Pakistani OPD
 * actually prescribes in volume. It is a screening aid, not a formulary.
 */

/** Lower-cased class -> the ingredient stems that belong to it. */
const DRUG_CLASS_MEMBERS: Record<string, readonly string[]> = {
  penicillin: [
    "penicillin", "amoxicillin", "amoxil", "ampicillin", "augmentin", "clavulanate",
    "cloxacillin", "flucloxacillin", "piperacillin", "tazobactam", "co-amoxiclav",
  ],
  cephalosporin: [
    "cephalosporin", "cefixime", "ceftriaxone", "cefotaxime", "cephradine", "cefuroxime",
    "cefaclor", "ceftazidime", "cefepime", "cephalexin", "cefspan", "rocephin",
  ],
  sulfonamide: ["sulfonamide", "sulfa", "sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "septran", "trimethoprim"],
  nsaid: [
    "nsaid", "ibuprofen", "brufen", "diclofenac", "voltaren", "naproxen", "ketorolac",
    "toradol", "mefenamic", "ponstan", "aspirin", "celecoxib", "indomethacin", "piroxicam",
  ],
  macrolide: ["macrolide", "erythromycin", "azithromycin", "azomax", "clarithromycin", "klaricid"],
  quinolone: ["quinolone", "fluoroquinolone", "ciprofloxacin", "ciproxin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin"],
  aminoglycoside: ["aminoglycoside", "gentamicin", "amikacin", "tobramycin", "streptomycin"],
  tetracycline: ["tetracycline", "doxycycline", "minocycline"],
  opioid: ["opioid", "morphine", "codeine", "tramadol", "nalbuphine", "pethidine", "fentanyl", "oxycodone"],
  statin: ["statin", "atorvastatin", "simvastatin", "rosuvastatin", "lipitor"],
};

const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The class table with every member run through `normalise` once, at load.
 *
 * Comparing normalised input against raw member strings silently failed for
 * every hyphenated name in the table — "Co-trimoxazole" normalises to
 * "co trimoxazole" and no longer contains the literal "co-trimoxazole", so a
 * recorded sulfa allergy did not stop a co-trimoxazole prescription. The
 * matching must happen entirely in normalised space on both sides.
 */
const NORMALISED_CLASS_MEMBERS: ReadonlyArray<readonly [string, readonly string[]]> =
  Object.entries(DRUG_CLASS_MEMBERS).map(([className, members]) => [
    className,
    members.map(normalise),
  ]);

/** Every token a drug or allergen might be recognised by, including its class siblings. */
function expand(term: string): Set<string> {
  const text = normalise(term);
  const tokens = new Set<string>();
  if (!text) return tokens;
  tokens.add(text);
  for (const word of text.split(" ")) {
    if (word.length >= 4) tokens.add(word);
  }
  for (const [className, members] of NORMALISED_CLASS_MEMBERS) {
    if (members.some((member) => text.includes(member) || member.includes(text))) {
      tokens.add(className);
      for (const member of members) tokens.add(member);
    }
  }
  return tokens;
}

export interface AllergyConflict {
  allergen: string;
  severity: string | null;
  reaction: string | null;
  medicationName: string;
  /** "exact" when the names themselves match, "class" when they share a drug class. */
  basis: "exact" | "class";
}

export interface AllergyCandidate {
  allergen: string;
  severity?: string | null;
  reaction?: string | null;
}

export interface MedicationCandidate {
  name: string;
  alternateNames?: readonly (string | null | undefined)[];
}

/**
 * Every conflict between this patient's recorded allergies and what is about
 * to be prescribed. An empty array means nothing matched — which is not the
 * same as "safe", only "nothing this screen can see".
 */
export function findAllergyConflicts(
  allergies: readonly AllergyCandidate[],
  medications: readonly MedicationCandidate[],
): AllergyConflict[] {
  const conflicts: AllergyConflict[] = [];

  for (const medication of medications) {
    const names = [medication.name, ...(medication.alternateNames ?? [])]
      .filter((value): value is string => Boolean(value && value.trim()));
    if (!names.length) continue;

    const medicationTokens = new Set<string>();
    const medicationLiterals = new Set<string>();
    for (const name of names) {
      medicationLiterals.add(normalise(name));
      for (const token of expand(name)) medicationTokens.add(token);
    }

    for (const allergy of allergies) {
      if (!allergy.allergen?.trim()) continue;
      const allergenLiteral = normalise(allergy.allergen);
      const allergenTokens = expand(allergy.allergen);

      const exact = [...medicationLiterals].some(
        (literal) => literal === allergenLiteral || literal.includes(allergenLiteral) || allergenLiteral.includes(literal),
      );
      const shared = exact || [...allergenTokens].some((token) => medicationTokens.has(token));
      if (!shared) continue;

      conflicts.push({
        allergen: allergy.allergen.trim(),
        severity: allergy.severity ?? null,
        reaction: allergy.reaction ?? null,
        medicationName: names[0]!,
        basis: exact ? "exact" : "class",
      });
    }
  }

  return conflicts;
}

/** One line per conflict, phrased for the prescriber rather than for a log. */
export function describeAllergyConflicts(conflicts: readonly AllergyConflict[]): string {
  return conflicts
    .map((conflict) => {
      const severity = conflict.severity ? ` (${conflict.severity})` : "";
      const reaction = conflict.reaction ? `, previously caused ${conflict.reaction}` : "";
      const basis = conflict.basis === "class" ? " — same drug class" : "";
      return `${conflict.medicationName} conflicts with a recorded allergy to ${conflict.allergen}${severity}${reaction}${basis}.`;
    })
    .join(" ");
}
