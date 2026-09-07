import type { NutritionItemType } from "@wonflow/contracts";

/**
 * Clinical content for the dietetics workspace.
 *
 * Same split as the physiotherapy side: a `GENERAL` band for the dietetics
 * any hospital dietitian does, and an `HPB` band for the hepato-pancreato-
 * biliary surgical service — pancreatic exocrine insufficiency, post-
 * hepatectomy protein demand, transplant food safety, cirrhotic sarcopenia.
 *
 * Nothing here is applied automatically. Every template is something the
 * dietitian explicitly chooses for an explicitly chosen patient. A dietary
 * plan pre-filled with someone else's meals is worse than an empty one.
 */

export type ClinicalBand = "GENERAL" | "HPB";

export const BAND_LABELS: Record<ClinicalBand, string> = {
  GENERAL: "General dietetics",
  HPB: "HPB surgical service",
};

/* ------------------------------------------------------------------ */
/* Diet progression                                                    */
/* ------------------------------------------------------------------ */

export interface DietPhase {
  id: string;
  label: string;
  band: ClinicalBand;
  detail: string;
  typicalDays: string;
  hue: string;
}

export const DIET_PHASES: DietPhase[] = [
  {
    id: "phase-1",
    label: "Phase 1 — clear fluids",
    band: "HPB",
    detail: "Water, clear broth, dilute juice. Volume built up slowly as gut function returns.",
    typicalDays: "POD 1–2",
    hue: "#38bdf8",
  },
  {
    id: "phase-2",
    label: "Phase 2 — full fluids and high-protein drinks",
    band: "HPB",
    detail: "Milk-based drinks, strained soup, oral nutrition supplements. Enzymes started if resected.",
    typicalDays: "POD 2–4",
    hue: "#22d3ee",
  },
  {
    id: "phase-3",
    label: "Phase 3 — soft / pureed pancreatic diet",
    band: "HPB",
    detail: "Soft low-fat solids in small frequent portions, full enzyme replacement with every intake.",
    typicalDays: "POD 4–7",
    hue: "#34d399",
  },
  {
    id: "phase-4",
    label: "Phase 4 — low-fat post-resection diet",
    band: "HPB",
    detail: "Normal textures, fat kept modest and spread across the day, enzymes titrated to stool.",
    typicalDays: "POD 7–28",
    hue: "#a3e635",
  },
  {
    id: "phase-5",
    label: "Phase 5 — regular diet with long-term enzyme replacement",
    band: "HPB",
    detail: "Unrestricted textures. Enzymes lifelong after pancreatic resection, dose led by symptoms.",
    typicalDays: "From week 4",
    hue: "#fbbf24",
  },
  {
    id: "phase-transplant",
    label: "Post-transplant food-safety diet",
    band: "HPB",
    detail: "Normal nutrition with strict food hygiene while immunosuppression is at induction levels.",
    typicalDays: "From transplant",
    hue: "#a78bfa",
  },
  {
    id: "phase-cirrhosis",
    label: "Cirrhosis / pre-transplant sarcopenia diet",
    band: "HPB",
    detail: "High protein, frequent meals and a late evening snack to shorten the overnight fast.",
    typicalDays: "Pre-operative",
    hue: "#f472b6",
  },
  {
    id: "phase-general-postop",
    label: "General post-operative progression",
    band: "GENERAL",
    detail: "Fluids to soft to normal as tolerated, with no pancreatic or hepatic restriction.",
    typicalDays: "Any general surgical patient",
    hue: "#94a3b8",
  },
];

export function dietPhaseById(id: string): DietPhase | undefined {
  return DIET_PHASES.find((phase) => phase.id === id);
}

/* ------------------------------------------------------------------ */
/* Plan item types                                                     */
/* ------------------------------------------------------------------ */

export const ITEM_TYPE_LABELS: Record<NutritionItemType, string> = {
  MEAL: "Meal",
  SNACK: "Snack",
  SUPPLEMENT: "Supplement",
  ENZYME: "Enzyme (PERT)",
};

export const ITEM_TYPE_BLURB: Record<NutritionItemType, string> = {
  MEAL: "A main plate at a set time of day",
  SNACK: "A small intake between meals",
  SUPPLEMENT: "Oral nutrition supplement or micronutrient",
  ENZYME: "Pancreatic enzyme replacement taken with food",
};

/**
 * Four distinct things a patient does, not four points on a scale, so this
 * is the one place in the workspace that takes categorical hues — assigned
 * in a fixed order and never cycled.
 */
export const ITEM_TYPE_HUE: Record<NutritionItemType, string> = {
  MEAL: "#38bdf8",
  SNACK: "#fbbf24",
  SUPPLEMENT: "#34d399",
  ENZYME: "#a78bfa",
};

export const ITEM_TYPE_ORDER: NutritionItemType[] = ["MEAL", "SNACK", "SUPPLEMENT", "ENZYME"];

export const TIMES_OF_DAY = [
  "Breakfast",
  "Mid-morning",
  "Lunch",
  "Mid-afternoon",
  "Dinner",
  "Evening",
  "Overnight",
] as const;

/* ------------------------------------------------------------------ */
/* Meal templates — offered, never applied                             */
/* ------------------------------------------------------------------ */

export interface MealTemplate {
  id: string;
  band: ClinicalBand;
  itemType: NutritionItemType;
  name: string;
  timeOfDay: string;
  quantity: number;
  unit: string;
  withMeal: boolean;
  instruction?: string;
  /** Which diet phases this belongs to, so the picker can narrow itself. */
  phases: string[];
  rationale: string;
}

export const MEAL_TEMPLATES: MealTemplate[] = [
  /* -------- HPB: pancreatic resection -------- */
  {
    id: "tpl-creon-breakfast",
    band: "HPB",
    itemType: "ENZYME",
    name: "Pancreatic enzyme replacement with breakfast",
    timeOfDay: "Breakfast",
    quantity: 2,
    unit: "capsules",
    withMeal: true,
    instruction: "Take with the first bite of food, never before and never after the meal.",
    phases: ["phase-2", "phase-3", "phase-4", "phase-5"],
    rationale: "Enzymes only work mixed with the food; timing is the commonest reason a dose 'fails'.",
  },
  {
    id: "tpl-creon-lunch",
    band: "HPB",
    itemType: "ENZYME",
    name: "Pancreatic enzyme replacement with lunch",
    timeOfDay: "Lunch",
    quantity: 2,
    unit: "capsules",
    withMeal: true,
    instruction: "Take with the first bite of food.",
    phases: ["phase-2", "phase-3", "phase-4", "phase-5"],
    rationale: "Every fat-containing intake needs cover, not just the largest meal.",
  },
  {
    id: "tpl-creon-dinner",
    band: "HPB",
    itemType: "ENZYME",
    name: "Pancreatic enzyme replacement with dinner",
    timeOfDay: "Dinner",
    quantity: 2,
    unit: "capsules",
    withMeal: true,
    instruction: "Take with the first bite of food.",
    phases: ["phase-2", "phase-3", "phase-4", "phase-5"],
    rationale: "Every fat-containing intake needs cover.",
  },
  {
    id: "tpl-creon-snack",
    band: "HPB",
    itemType: "ENZYME",
    name: "Half enzyme dose with a snack",
    timeOfDay: "Mid-afternoon",
    quantity: 1,
    unit: "capsule",
    withMeal: true,
    instruction: "One capsule with any snack containing fat.",
    phases: ["phase-3", "phase-4", "phase-5"],
    rationale: "Snacks are where enzyme cover is most often forgotten and steatorrhoea returns.",
  },
  {
    id: "tpl-oatmeal",
    band: "HPB",
    itemType: "MEAL",
    name: "Oatmeal with skimmed milk and sliced banana",
    timeOfDay: "Breakfast",
    quantity: 1,
    unit: "bowl",
    withMeal: false,
    phases: ["phase-3", "phase-4"],
    rationale: "Soft, low fat, and reliably tolerated early after pancreatic resection.",
  },
  {
    id: "tpl-whitefish",
    band: "HPB",
    itemType: "MEAL",
    name: "Poached whitefish, mashed potato and steamed courgette",
    timeOfDay: "Lunch",
    quantity: 1,
    unit: "plate",
    withMeal: false,
    phases: ["phase-3", "phase-4"],
    rationale: "High biological value protein with almost no fat load.",
  },
  {
    id: "tpl-broth-rice",
    band: "HPB",
    itemType: "MEAL",
    name: "Chicken broth with tender rice and stewed carrot",
    timeOfDay: "Dinner",
    quantity: 1,
    unit: "bowl",
    withMeal: false,
    phases: ["phase-2", "phase-3"],
    rationale: "Warm, low residue, and easy on a stomach with delayed emptying.",
  },
  {
    id: "tpl-ons",
    band: "HPB",
    itemType: "SUPPLEMENT",
    name: "High-protein oral nutrition supplement",
    timeOfDay: "Mid-morning",
    quantity: 200,
    unit: "mL",
    withMeal: false,
    instruction: "Sip slowly over thirty minutes rather than drinking it down.",
    phases: ["phase-2", "phase-3", "phase-4", "phase-cirrhosis"],
    rationale: "Closes the protein gap when meal volumes are still small.",
  },
  {
    id: "tpl-late-snack",
    band: "HPB",
    itemType: "SNACK",
    name: "Late evening protein and carbohydrate snack",
    timeOfDay: "Evening",
    quantity: 1,
    unit: "portion",
    withMeal: false,
    instruction: "Taken within an hour of going to bed.",
    phases: ["phase-cirrhosis", "phase-transplant"],
    rationale:
      "A late snack shortens the overnight fast, which is the single most effective anti-catabolic measure in cirrhosis.",
  },
  {
    id: "tpl-adek",
    band: "HPB",
    itemType: "SUPPLEMENT",
    name: "Fat-soluble vitamin supplement (A, D, E, K)",
    timeOfDay: "Breakfast",
    quantity: 1,
    unit: "dose",
    withMeal: true,
    phases: ["phase-4", "phase-5"],
    rationale: "Exocrine insufficiency causes fat-soluble vitamin deficiency long before it causes weight loss.",
  },
  {
    id: "tpl-yoghurt",
    band: "HPB",
    itemType: "SNACK",
    name: "Low-fat yoghurt with stewed apple",
    timeOfDay: "Mid-afternoon",
    quantity: 1,
    unit: "pot",
    withMeal: false,
    phases: ["phase-3", "phase-4"],
    rationale: "Adds protein and energy without a fat load.",
  },

  /* -------- General dietetics -------- */
  {
    id: "tpl-gen-breakfast",
    band: "GENERAL",
    itemType: "MEAL",
    name: "Standard hospital breakfast",
    timeOfDay: "Breakfast",
    quantity: 1,
    unit: "tray",
    withMeal: false,
    phases: ["phase-general-postop"],
    rationale: "The baseline where no pancreatic or hepatic restriction applies.",
  },
  {
    id: "tpl-gen-fortified",
    band: "GENERAL",
    itemType: "SNACK",
    name: "Food-fortified snack (full-fat milk, cheese, nut butter)",
    timeOfDay: "Mid-morning",
    quantity: 1,
    unit: "portion",
    withMeal: false,
    phases: ["phase-general-postop"],
    rationale: "Food fortification before supplements is the standard escalation in general dietetics.",
  },
  {
    id: "tpl-gen-hydration",
    band: "GENERAL",
    itemType: "SUPPLEMENT",
    name: "Oral rehydration solution",
    timeOfDay: "Mid-afternoon",
    quantity: 200,
    unit: "mL",
    withMeal: false,
    phases: ["phase-general-postop"],
    rationale: "For losses through a stoma, drain or diarrhoea.",
  },
];

export function templateById(id: string): MealTemplate | undefined {
  return MEAL_TEMPLATES.find((template) => template.id === id);
}

/* ------------------------------------------------------------------ */
/* PERT dosing                                                         */
/* ------------------------------------------------------------------ */

export const ENZYME_STRENGTHS = [10_000, 25_000, 40_000, 50_000] as const;

export interface PertDose {
  /** Lipase units for this intake. */
  units: number;
  capsules: number;
  note: string;
}

/**
 * Lipase requirement for one intake.
 *
 * The commonly taught starting point is roughly 2,000 lipase units per gram
 * of dietary fat, with a floor for a main meal and a lower floor for a
 * snack, and an upper bound because dosing above about 10,000 units per
 * kilogram per day is associated with fibrosing colonopathy. The floors and
 * the ceiling are the reason this is a function rather than a multiplication
 * in the markup: a calculator that silently returns an unsafe number is
 * worse than no calculator.
 */
export function calculatePertDose(
  fatGrams: number | null,
  capsuleStrength: number | null,
  kind: "meal" | "snack",
  ratioPerGram: number = 2_000,
  customFloor?: number | null,
): PertDose | null {
  if (fatGrams === null || capsuleStrength === null || capsuleStrength <= 0) return null;
  if (fatGrams < 0) return null;

  // Medically, a fat-free intake (0g fat) requires 0 units of lipase
  if (fatGrams === 0) {
    return {
      units: 0,
      capsules: 0,
      note: `0 g fat intake requires no pancreatic enzymes (0 IU).`,
    };
  }

  const defaultFloor = kind === "meal" ? 25_000 : 10_000;
  const floor = customFloor !== undefined && customFloor !== null ? customFloor : defaultFloor;
  const calculated = Math.round(fatGrams * ratioPerGram);
  const units = Math.max(floor, calculated);
  const capsules = Math.max(1, Math.ceil(units / capsuleStrength));

  const note =
    calculated < floor
      ? `Below the ${kind} minimum (${floor.toLocaleString()} IU safety floor applied).`
      : `${fatGrams} g fat at ${ratioPerGram.toLocaleString()} IU/g (${calculated.toLocaleString()} IU calculated).`;

  return { units, capsules, note };
}

/**
 * The daily safety ceiling. Reported separately from the per-meal dose so a
 * dietitian sees the total they are building towards, not just each step.
 */
export function pertDailyCeiling(weightKg: number | null): number | null {
  if (weightKg === null || weightKg <= 0) return null;
  return Math.round(weightKg * 10_000);
}

/* ------------------------------------------------------------------ */
/* Enteral and parenteral feeding                                      */
/* ------------------------------------------------------------------ */

export const ENTERAL_FORMULAS = [
  { id: "std-1-0", label: "Standard polymeric 1.0 kcal/mL", kcalPerMl: 1.0, proteinPerL: 40 },
  { id: "std-1-5", label: "Energy-dense polymeric 1.5 kcal/mL", kcalPerMl: 1.5, proteinPerL: 64 },
  { id: "std-2-0", label: "Concentrated 2.0 kcal/mL", kcalPerMl: 2.0, proteinPerL: 100 },
  { id: "semi-elem", label: "Semi-elemental (peptide) 1.0 kcal/mL", kcalPerMl: 1.0, proteinPerL: 40 },
  { id: "high-protein", label: "High-protein 1.25 kcal/mL", kcalPerMl: 1.25, proteinPerL: 75 },
] as const;

export interface EnteralResult {
  volumePerDayMl: number;
  kcalPerDay: number;
  proteinPerDay: number;
  kcalPerKg: number | null;
  proteinPerKg: number | null;
}

export function calculateEnteral(
  rateMlPerHour: number | null,
  hoursPerDay: number | null,
  kcalPerMl: number | null,
  proteinPerL: number | null,
  weightKg: number | null,
): EnteralResult | null {
  if (rateMlPerHour === null || hoursPerDay === null || kcalPerMl === null || proteinPerL === null) {
    return null;
  }

  const volumePerDayMl = rateMlPerHour * hoursPerDay;
  const kcalPerDay = Math.round(volumePerDayMl * kcalPerMl);
  const proteinPerDay = Math.round((volumePerDayMl * proteinPerL) / 1000);

  return {
    volumePerDayMl,
    kcalPerDay,
    proteinPerDay,
    kcalPerKg: weightKg && weightKg > 0 ? Number((kcalPerDay / weightKg).toFixed(1)) : null,
    proteinPerKg: weightKg && weightKg > 0 ? Number((proteinPerDay / weightKg).toFixed(2)) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Screening and targets                                               */
/* ------------------------------------------------------------------ */

export function bmiFrom(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  return Number((weightKg / (heightCm / 100) ** 2).toFixed(1));
}

export function bmiBand(bmi: number | null): { label: string; tone: "good" | "warning" | "critical" } | null {
  if (bmi === null) return null;
  if (bmi < 18.5) return { label: "Underweight — nutritional risk", tone: "critical" };
  if (bmi < 25) return { label: "Within the healthy range", tone: "good" };
  if (bmi < 30) return { label: "Overweight", tone: "warning" };
  return { label: "Obese — note that this can mask sarcopenia", tone: "warning" };
}

/**
 * MUST — the malnutrition universal screening tool. Three components, summed.
 * Reported with its own actions because the score alone is not the point.
 */
export function mustScore(
  bmi: number | null,
  unplannedWeightLossPercent: number | null,
  acutelyUnwellNoIntakeFiveDays: boolean,
): { score: number; risk: string; action: string } | null {
  if (bmi === null || unplannedWeightLossPercent === null) return null;

  const bmiPoints = bmi > 20 ? 0 : bmi >= 18.5 ? 1 : 2;
  const lossPoints =
    unplannedWeightLossPercent < 5 ? 0 : unplannedWeightLossPercent <= 10 ? 1 : 2;
  const acutePoints = acutelyUnwellNoIntakeFiveDays ? 2 : 0;

  const score = bmiPoints + lossPoints + acutePoints;

  if (score === 0) {
    return { score, risk: "Low risk", action: "Routine repeat screening while an in-patient." };
  }
  if (score === 1) {
    return { score, risk: "Medium risk", action: "Document intake for three days and re-screen." };
  }
  return {
    score,
    risk: "High risk",
    action: "Treat: set targets, start supplements or feeding, monitor and review.",
  };
}

/** Energy and protein targets. Ranges, not a single fabricated number. */
export function estimateTargets(
  weightKg: number | null,
  band: "post-op" | "hpb-resection" | "cirrhosis" | "transplant",
): { kcalLow: number; kcalHigh: number; proteinLow: number; proteinHigh: number; note: string } | null {
  if (!weightKg || weightKg <= 0) return null;

  const profiles = {
    "post-op": { kcal: [25, 30], protein: [1.2, 1.5], note: "Standard post-operative catabolic requirement." },
    "hpb-resection": { kcal: [30, 35], protein: [1.5, 2.0], note: "Raised demand after major HPB resection, with malabsorption on top." },
    cirrhosis: { kcal: [30, 35], protein: [1.2, 1.5], note: "Protein is not restricted in encephalopathy; under-feeding worsens it." },
    transplant: { kcal: [30, 35], protein: [1.3, 2.0], note: "Steroid catabolism plus wound healing in the first months." },
  } as const;

  const profile = profiles[band];

  return {
    kcalLow: Math.round(weightKg * profile.kcal[0]),
    kcalHigh: Math.round(weightKg * profile.kcal[1]),
    proteinLow: Math.round(weightKg * profile.protein[0]),
    proteinHigh: Math.round(weightKg * profile.protein[1]),
    note: profile.note,
  };
}

export const TARGET_BANDS = [
  { value: "post-op" as const, label: "General post-operative", detail: "25–30 kcal/kg, 1.2–1.5 g protein/kg" },
  { value: "hpb-resection" as const, label: "HPB resection", detail: "30–35 kcal/kg, 1.5–2.0 g protein/kg" },
  { value: "cirrhosis" as const, label: "Cirrhosis / pre-transplant", detail: "30–35 kcal/kg, 1.2–1.5 g protein/kg" },
  { value: "transplant" as const, label: "Post-transplant", detail: "30–35 kcal/kg, 1.3–2.0 g protein/kg" },
];

/* ------------------------------------------------------------------ */
/* Counselling sets — offered for the plan, never auto-attached        */
/* ------------------------------------------------------------------ */

export interface CounsellingSet {
  id: string;
  label: string;
  band: ClinicalBand;
  points: string[];
}

export const COUNSELLING_SETS: CounsellingSet[] = [
  {
    id: "pert-timing",
    label: "Enzyme timing and titration",
    band: "HPB",
    points: [
      "Take enzymes with the first bite, spread through a long meal, never after it",
      "Do not crush or chew the capsules; open them onto soft acidic food if swallowing is hard",
      "Titrate to the stool: greasy, floating or urgent stool means the dose is too low",
      "Cover every fat-containing snack, not only the main meals",
    ],
  },
  {
    id: "post-resection-fat",
    label: "Fat distribution after pancreatic resection",
    band: "HPB",
    points: [
      "Spread fat evenly across six small intakes rather than two large ones",
      "Avoid deep-fried food and heavy cream sauces while enzymes are being titrated",
      "Medium-chain triglyceride oil can be added if weight is still falling on full enzyme cover",
    ],
  },
  {
    id: "transplant-food-safety",
    label: "Food safety on immunosuppression",
    band: "HPB",
    points: [
      "No unpasteurised dairy, soft-ripened cheese, raw or undercooked egg, meat or shellfish",
      "Wash and peel raw fruit and vegetables; avoid salad bars and buffets",
      "No grapefruit or pomelo — they raise tacrolimus levels unpredictably",
      "Reheat leftovers once, to steaming, and discard after 24 hours",
    ],
  },
  {
    id: "cirrhosis-fasting",
    label: "Shortening the overnight fast in cirrhosis",
    band: "HPB",
    points: [
      "Eat every two to three hours through the day",
      "Always take a late evening carbohydrate and protein snack",
      "Do not restrict protein, even during an episode of encephalopathy",
      "Salt is restricted for ascites; protein is not",
    ],
  },
  {
    id: "gen-fortification",
    label: "Food fortification before supplements",
    band: "GENERAL",
    points: [
      "Add full-fat milk powder, cheese, butter or nut butter to ordinary food first",
      "Offer small plates more often rather than large plates less often",
      "Keep drinks until after the meal so they do not displace food",
    ],
  },
  {
    id: "gen-refeeding",
    label: "Refeeding syndrome precautions",
    band: "GENERAL",
    points: [
      "Start at no more than 10 kcal/kg/day where intake has been negligible for five days or more",
      "Give thiamine and a B-vitamin complex before feeding starts",
      "Check potassium, magnesium and phosphate daily for the first three days",
    ],
  },
];

export const COMMON_AVOID_LISTS: { id: string; label: string; band: ClinicalBand; text: string }[] = [
  {
    id: "avoid-pancreatic",
    label: "Post-pancreatectomy",
    band: "HPB",
    text: "High-fat fried foods, heavy cream sauces, raw cruciferous vegetables, carbonated drinks, alcohol",
  },
  {
    id: "avoid-transplant",
    label: "Post-transplant food safety",
    band: "HPB",
    text: "Grapefruit and pomelo, unpasteurised dairy, soft-ripened cheese, raw or undercooked egg, meat and shellfish, buffets and salad bars",
  },
  {
    id: "avoid-ascites",
    label: "Ascites and oedema",
    band: "HPB",
    text: "Added salt, processed and cured meats, tinned soup, stock cubes, salted snacks",
  },
  {
    id: "avoid-none",
    label: "No restriction",
    band: "GENERAL",
    text: "No specific restriction — normal diet as tolerated",
  },
];
