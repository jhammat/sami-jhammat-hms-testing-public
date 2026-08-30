import type { ExerciseCategory, IndependenceLevel } from "@wonflow/contracts";

/**
 * Clinical content for the physiotherapy workspace.
 *
 * Two audiences share this file on purpose. The `GENERAL` band is ordinary
 * physiotherapy — the MSK, neuro, cardiopulmonary and ICU-rehab work any
 * physiotherapist does on any ward. The `HPB` band is the hepato-pancreato-
 * biliary surgical service: Whipple, hepatectomy, living-donor and recipient
 * transplant, biliary reconstruction. Nothing here is auto-applied. Every
 * item is a template the therapist explicitly chooses for an explicitly
 * chosen patient — the workspace never pre-selects a patient, a template or
 * a dose on their behalf.
 */

export type ClinicalBand = "GENERAL" | "HPB";

export const BAND_LABELS: Record<ClinicalBand, string> = {
  GENERAL: "General physiotherapy",
  HPB: "HPB surgical service",
};

/* ------------------------------------------------------------------ */
/* Categories, regions and scales                                      */
/* ------------------------------------------------------------------ */

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  RESPIRATORY: "Respiratory",
  CIRCULATORY: "Circulatory",
  MOBILITY: "Mobility",
  STRENGTHENING: "Strengthening",
  POSTURE: "Posture & balance",
};

export const CATEGORY_BLURB: Record<ExerciseCategory, string> = {
  RESPIRATORY: "Airway clearance, lung volume recruitment, spirometry",
  CIRCULATORY: "Venous return, DVT prophylaxis, oedema control",
  MOBILITY: "Transfers, gait, ambulation distance, stairs",
  STRENGTHENING: "Resistance, sarcopenia reversal, core and limb power",
  POSTURE: "Balance, proprioception, fall-risk reduction",
};

/** Accent hue per category. Categorical, never cycled — one hue per meaning. */
export const CATEGORY_HUE: Record<ExerciseCategory, string> = {
  RESPIRATORY: "#38bdf8",
  CIRCULATORY: "#fb7185",
  MOBILITY: "#34d399",
  STRENGTHENING: "#fbbf24",
  POSTURE: "#a78bfa",
};

export const CATEGORY_ORDER: ExerciseCategory[] = [
  "RESPIRATORY",
  "CIRCULATORY",
  "MOBILITY",
  "STRENGTHENING",
  "POSTURE",
];

export type BodyRegion =
  | "THORAX"
  | "ABDOMEN"
  | "SHOULDER"
  | "UPPER_LIMB"
  | "SPINE"
  | "HIP"
  | "KNEE"
  | "ANKLE"
  | "WHOLE_BODY";

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  THORAX: "Thorax & lungs",
  ABDOMEN: "Abdomen & core",
  SHOULDER: "Shoulder girdle",
  UPPER_LIMB: "Upper limb",
  SPINE: "Spine & trunk",
  HIP: "Hip & pelvis",
  KNEE: "Knee",
  ANKLE: "Ankle & foot",
  WHOLE_BODY: "Whole body",
};

export const INDEPENDENCE_LADDER: {
  value: IndependenceLevel;
  label: string;
  detail: string;
  hue: string;
}[] = [
  {
    value: "BED_BOUND",
    label: "Bed bound",
    detail: "Bed mobility only; requires full assistance to reposition",
    hue: "#f43f5e",
  },
  {
    value: "CHAIR_TRANSFER",
    label: "Chair transfer",
    detail: "Transfers bed to chair with assistance; sits out of bed",
    hue: "#fb923c",
  },
  {
    value: "ASSISTED_AMBULATION",
    label: "Assisted ambulation",
    detail: "Walks with a person, frame or gait belt",
    hue: "#38bdf8",
  },
  {
    value: "INDEPENDENT_AMBULATION",
    label: "Independent ambulation",
    detail: "Walks the ward unaided and safely",
    hue: "#34d399",
  },
  {
    value: "STAIR_NAVIGATING",
    label: "Stair navigating",
    detail: "Ascends and descends a flight; discharge-ready mobility",
    hue: "#a78bfa",
  },
];

/* ------------------------------------------------------------------ */
/* Exercise templates                                                  */
/* ------------------------------------------------------------------ */

export interface ExerciseTemplate {
  id: string;
  name: string;
  band: ClinicalBand;
  category: ExerciseCategory;
  region: BodyRegion;
  instruction: string;
  precautions: string;
  /** Suggested starting dose. Shown as a suggestion, never applied silently. */
  suggestedRepetitions: number;
  suggestedSets: number;
  suggestedHoldSeconds: number;
  /** Why this exists, in one line, for the therapist and the record. */
  rationale: string;
  tags: string[];
}

export const EXERCISE_TEMPLATES: ExerciseTemplate[] = [
  /* ---------------- General physiotherapy ---------------- */
  {
    id: "gen-incentive-spirometry",
    name: "Incentive spirometry",
    band: "GENERAL",
    category: "RESPIRATORY",
    region: "THORAX",
    instruction:
      "Sit upright at 60–90°. Seal lips on the mouthpiece, inhale slowly and maximally, hold at peak volume for 3 seconds, then exhale gently. Repeat hourly while awake.",
    precautions:
      "Stop for dizziness or desaturation. Splint any abdominal or thoracic incision with a pillow.",
    suggestedRepetitions: 10,
    suggestedSets: 6,
    suggestedHoldSeconds: 3,
    rationale: "Recruits basal lung volume and reduces post-operative atelectasis.",
    tags: ["spirometry", "atelectasis", "post-op"],
  },
  {
    id: "gen-active-cycle-breathing",
    name: "Active cycle of breathing technique",
    band: "GENERAL",
    category: "RESPIRATORY",
    region: "THORAX",
    instruction:
      "Cycle breathing control → 3–4 thoracic expansion breaths → breathing control → 1–2 huffs. Repeat until the huff is dry.",
    precautions: "Avoid forced coughing where an incision is unsupported. Stop if the patient tires.",
    suggestedRepetitions: 4,
    suggestedSets: 3,
    suggestedHoldSeconds: 3,
    rationale: "Mobilises and clears secretions without the fatigue of repeated coughing.",
    tags: ["airway clearance", "secretions"],
  },
  {
    id: "gen-ankle-pumps",
    name: "Ankle pumps and quadriceps sets",
    band: "GENERAL",
    category: "CIRCULATORY",
    region: "ANKLE",
    instruction:
      "Lying or sitting, dorsiflex and plantarflex both ankles briskly through full range, then tighten the quadriceps and hold before releasing.",
    precautions: "Avoid knee hyperextension. Omit on a limb with a known acute DVT until cleared.",
    suggestedRepetitions: 20,
    suggestedSets: 4,
    suggestedHoldSeconds: 5,
    rationale: "Drives the calf muscle pump for venous return and DVT prophylaxis.",
    tags: ["dvt", "venous return", "bed exercise"],
  },
  {
    id: "gen-bed-mobility",
    name: "Bed mobility and bridging",
    band: "GENERAL",
    category: "STRENGTHENING",
    region: "HIP",
    instruction:
      "Crook lying, feet flat. Tighten the gluteals and lift the pelvis to a straight line from knee to shoulder, hold, then lower with control. Progress to rolling with the log-roll technique.",
    precautions: "No trunk twisting where spinal or abdominal precautions apply.",
    suggestedRepetitions: 8,
    suggestedSets: 3,
    suggestedHoldSeconds: 5,
    rationale: "Restores the hip extension and trunk control needed for transfers.",
    tags: ["transfers", "core", "bed exercise"],
  },
  {
    id: "gen-sit-to-stand",
    name: "Sit-to-stand repetitions",
    band: "GENERAL",
    category: "STRENGTHENING",
    region: "KNEE",
    instruction:
      "From a firm chair, feet behind the knees, nose over toes, stand without pushing through the arms if able. Lower under control over 3 seconds.",
    precautions: "Guard for postural hypotension on the first repetitions. Check any weight-bearing order first.",
    suggestedRepetitions: 10,
    suggestedSets: 3,
    suggestedHoldSeconds: 0,
    rationale: "The single most transferable strength task for functional independence.",
    tags: ["functional", "strength", "falls"],
  },
  {
    id: "gen-corridor-ambulation",
    name: "Corridor ambulation with assistance",
    band: "GENERAL",
    category: "MOBILITY",
    region: "WHOLE_BODY",
    instruction:
      "Walk the ward corridor to the prescribed distance with the agreed aid, therapist or gait belt. Record the distance achieved and the rest breaks taken.",
    precautions:
      "Check lines, drains and telemetry before standing. Abort for chest pain, syncope or a drop in saturation.",
    suggestedRepetitions: 1,
    suggestedSets: 3,
    suggestedHoldSeconds: 0,
    rationale: "Distance walked per day is the strongest single predictor of recovery pace.",
    tags: ["gait", "eras", "distance"],
  },
  {
    id: "gen-stair-practice",
    name: "Stair ascent and descent practice",
    band: "GENERAL",
    category: "MOBILITY",
    region: "KNEE",
    instruction:
      "With rail support, ascend leading with the stronger limb and descend leading with the weaker limb. Build to one full flight.",
    precautions: "Two-person guard on first attempt. Not before independent level ambulation is safe.",
    suggestedRepetitions: 1,
    suggestedSets: 2,
    suggestedHoldSeconds: 0,
    rationale: "The usual discharge criterion for patients returning to a home with stairs.",
    tags: ["discharge", "gait", "stairs"],
  },
  {
    id: "gen-balance-progression",
    name: "Standing balance progression",
    band: "GENERAL",
    category: "POSTURE",
    region: "WHOLE_BODY",
    instruction:
      "Progress feet-apart → feet-together → semi-tandem → tandem stance, holding each position and using a rail only as needed.",
    precautions: "Always within reach of a rail or a guarding therapist. High fall-risk patients need a second person.",
    suggestedRepetitions: 4,
    suggestedSets: 2,
    suggestedHoldSeconds: 30,
    rationale: "Rebuilds postural control and lowers in-patient fall risk.",
    tags: ["balance", "falls", "berg"],
  },
  {
    id: "gen-shoulder-rom",
    name: "Active-assisted shoulder range of motion",
    band: "GENERAL",
    category: "MOBILITY",
    region: "SHOULDER",
    instruction:
      "Supine or seated, take the shoulder through flexion, abduction and rotation to the point of discomfort using the opposite hand or a stick.",
    precautions: "Respect any sternal or drain-site restriction. Never force through guarding.",
    suggestedRepetitions: 10,
    suggestedSets: 3,
    suggestedHoldSeconds: 5,
    rationale: "Prevents the capsular stiffness that follows any prolonged bed stay.",
    tags: ["rom", "upper limb"],
  },
  {
    id: "gen-postural-reeducation",
    name: "Seated postural re-education",
    band: "GENERAL",
    category: "POSTURE",
    region: "SPINE",
    instruction:
      "Sitting tall, level the pelvis, lengthen through the crown, gently retract the scapulae and hold without bracing the breath.",
    precautions: "Stop for radicular symptoms. Keep breathing throughout.",
    suggestedRepetitions: 10,
    suggestedSets: 3,
    suggestedHoldSeconds: 10,
    rationale: "Counters the flexed guarding posture that restricts lung volume after surgery.",
    tags: ["posture", "spine"],
  },

  /* ---------------- HPB surgical service ---------------- */
  {
    id: "hpb-prehab-aerobic",
    name: "Pre-habilitation aerobic conditioning",
    band: "HPB",
    category: "MOBILITY",
    region: "WHOLE_BODY",
    instruction:
      "Before admission for resection or transplant: 20–30 minutes of continuous walking or cycling at a conversational pace, most days of the week.",
    precautions:
      "Screen for varices, ascites and cardiac limitation first. Keep exertion at Borg 11–13 in decompensated liver disease.",
    suggestedRepetitions: 1,
    suggestedSets: 1,
    suggestedHoldSeconds: 1800,
    rationale:
      "Higher pre-operative functional capacity is associated with fewer pulmonary complications after major HPB resection.",
    tags: ["prehab", "whipple", "hepatectomy", "transplant"],
  },
  {
    id: "hpb-prehab-inspiratory",
    name: "Inspiratory muscle training (pre-operative)",
    band: "HPB",
    category: "RESPIRATORY",
    region: "THORAX",
    instruction:
      "Threshold inspiratory trainer at the prescribed load. Two sets of 30 breaths daily for at least two weeks before surgery.",
    precautions: "Not for untreated pneumothorax or unstable haemoptysis. Reassess load weekly.",
    suggestedRepetitions: 30,
    suggestedSets: 2,
    suggestedHoldSeconds: 0,
    rationale:
      "Strengthens the diaphragm before a subcostal or Mercedes incision splints it.",
    tags: ["prehab", "imt", "whipple"],
  },
  {
    id: "hpb-splinted-cough",
    name: "Splinted cough over subcostal incision",
    band: "HPB",
    category: "RESPIRATORY",
    region: "ABDOMEN",
    instruction:
      "Hug a folded pillow firmly over the subcostal or rooftop incision. Take a relaxed breath in, then huff twice before a supported cough.",
    precautions:
      "Ensure analgesia is timed before the session. Stop for fresh bleeding or sudden wound pain.",
    suggestedRepetitions: 5,
    suggestedSets: 4,
    suggestedHoldSeconds: 0,
    rationale:
      "Subcostal and Mercedes incisions suppress cough force; splinting restores an effective clearance manoeuvre.",
    tags: ["whipple", "hepatectomy", "incision", "clearance"],
  },
  {
    id: "hpb-diaphragmatic-basal",
    name: "Basal expansion breathing (right upper quadrant)",
    band: "HPB",
    category: "RESPIRATORY",
    region: "THORAX",
    instruction:
      "Therapist's hands over the lower right rib cage. Breathe into the hands, hold for 3 seconds at the top, then release with a relaxed sigh.",
    precautions: "Watch for referred shoulder-tip pain. Stop if the right sub-diaphragmatic drain site is painful.",
    suggestedRepetitions: 10,
    suggestedSets: 4,
    suggestedHoldSeconds: 3,
    rationale:
      "Right basal collapse is the commonest pulmonary complication after liver resection and hepaticojejunostomy.",
    tags: ["hepatectomy", "atelectasis", "right base"],
  },
  {
    id: "hpb-drain-aware-ambulation",
    name: "Drain-aware corridor ambulation",
    band: "HPB",
    category: "MOBILITY",
    region: "WHOLE_BODY",
    instruction:
      "Secure abdominal drains and the biliary bag below the insertion site on a mobile stand. Walk the corridor to the daily distance target with the drains carried, never dragged.",
    precautions:
      "Confirm drain output and character before mobilising. Abort for a sudden rise in output, bile staining, or fresh blood.",
    suggestedRepetitions: 1,
    suggestedSets: 3,
    suggestedHoldSeconds: 0,
    rationale:
      "Keeps the ERAS ambulation target achievable without dislodging surgically placed drains.",
    tags: ["whipple", "drains", "eras", "gait"],
  },
  {
    id: "hpb-log-roll-transfer",
    name: "Log-roll transfer with abdominal splinting",
    band: "HPB",
    category: "STRENGTHENING",
    region: "ABDOMEN",
    instruction:
      "Bend the knees, keep shoulders and hips aligned, roll as one unit to the side, then push up through the arms to sitting without a sit-up movement.",
    precautions:
      "No trunk flexion or rotation against resistance for six weeks after a rooftop incision. No Valsalva.",
    suggestedRepetitions: 5,
    suggestedSets: 3,
    suggestedHoldSeconds: 0,
    rationale:
      "Protects the fascial closure of a large upper-abdominal incision while restoring independent transfers.",
    tags: ["whipple", "hepatectomy", "transfers", "incision"],
  },
  {
    id: "hpb-sarcopenia-limb",
    name: "Low-load limb strengthening for hepatic sarcopenia",
    band: "HPB",
    category: "STRENGTHENING",
    region: "KNEE",
    instruction:
      "Seated knee extension, hip abduction and heel raises against body weight or a light band. Keep the effort at Borg 11–13 and breathe throughout.",
    precautions:
      "Avoid heavy resistance and breath-holding where varices, low platelets or a raised INR are documented. No isometric straining.",
    suggestedRepetitions: 12,
    suggestedSets: 3,
    suggestedHoldSeconds: 3,
    rationale:
      "Sarcopenia is near-universal in cirrhosis and independently predicts poor transplant outcome; low-load work is safe where heavy loading is not.",
    tags: ["cirrhosis", "sarcopenia", "transplant", "low load"],
  },
  {
    id: "hpb-ascites-positioning",
    name: "Positioning and breathing with tense ascites",
    band: "HPB",
    category: "RESPIRATORY",
    region: "ABDOMEN",
    instruction:
      "Sit at 60–90° or in high side-lying to unload the diaphragm. Add relaxed diaphragmatic breathing and short, frequent mobility bouts rather than one long walk.",
    precautions:
      "Watch for hypotension after large-volume paracentesis. Coordinate the session with the drainage schedule.",
    suggestedRepetitions: 8,
    suggestedSets: 4,
    suggestedHoldSeconds: 4,
    rationale:
      "Tense ascites splints the diaphragm; position and pacing recover ventilation that exercise alone cannot.",
    tags: ["ascites", "cirrhosis", "positioning"],
  },
  {
    id: "hpb-donor-early-mobility",
    name: "Living-donor early mobilisation ladder",
    band: "HPB",
    category: "MOBILITY",
    region: "WHOLE_BODY",
    instruction:
      "Healthy donor pathway: dangle on the evening of surgery, chair on POD 1, corridor walking from POD 1, independent walking and stairs by POD 3–4.",
    precautions:
      "Donors are fit and will over-reach. Hold them to the incision precautions rather than to their symptoms.",
    suggestedRepetitions: 1,
    suggestedSets: 4,
    suggestedHoldSeconds: 0,
    rationale:
      "Donor recovery is measured in days; a structured ladder prevents both under- and over-activity.",
    tags: ["living donor", "transplant", "eras"],
  },
  {
    id: "hpb-transplant-recipient-rehab",
    name: "Post-transplant recipient conditioning",
    band: "HPB",
    category: "MOBILITY",
    region: "WHOLE_BODY",
    instruction:
      "Graded walking and low-load resistance building from bedside standing to 15 minutes of continuous walking, guided by daily symptom and observation review.",
    precautions:
      "Immunosuppression: use a dedicated gym area, clean equipment between patients, and defer group work. Steroid myopathy and tremor change the fall risk daily.",
    suggestedRepetitions: 1,
    suggestedSets: 2,
    suggestedHoldSeconds: 900,
    rationale:
      "Rebuilds the capacity lost to end-stage disease while respecting an immunosuppressed environment.",
    tags: ["transplant", "immunosuppression", "conditioning"],
  },
  {
    id: "hpb-encephalopathy-safety",
    name: "Mobility with hepatic encephalopathy precautions",
    band: "HPB",
    category: "POSTURE",
    region: "WHOLE_BODY",
    instruction:
      "Short, supervised bouts with simple one-step instructions, a low bed, and a second person for any standing work while the grade is fluctuating.",
    precautions:
      "Re-screen orientation and asterixis before every session. Do not progress a patient whose grade rose since the last review.",
    suggestedRepetitions: 3,
    suggestedSets: 3,
    suggestedHoldSeconds: 0,
    rationale:
      "Encephalopathy changes hour to hour and is the dominant in-patient fall risk on a liver ward.",
    tags: ["encephalopathy", "falls", "cirrhosis"],
  },
  {
    id: "hpb-shoulder-tip-relief",
    name: "Shoulder-tip pain relief after laparoscopic HPB surgery",
    band: "HPB",
    category: "MOBILITY",
    region: "SHOULDER",
    instruction:
      "Gentle scapular circles, upright positioning and short walks to disperse residual pneumoperitoneum, with active-assisted shoulder elevation between bouts.",
    precautions: "Exclude a cardiac or diaphragmatic cause before treating referred pain as gas.",
    suggestedRepetitions: 10,
    suggestedSets: 3,
    suggestedHoldSeconds: 3,
    rationale:
      "Referred diaphragmatic pain is the commonest reason a laparoscopic cholecystectomy patient refuses to mobilise.",
    tags: ["laparoscopic", "cholecystectomy", "shoulder"],
  },
];

/* ------------------------------------------------------------------ */
/* Recovery pathways                                                   */
/* ------------------------------------------------------------------ */

export interface PathwayMilestone {
  day: string;
  target: string;
  /** Templates this milestone would prescribe if the therapist applies it. */
  templateIds: string[];
}

export interface RecoveryPathway {
  id: string;
  title: string;
  band: ClinicalBand;
  service: string;
  summary: string;
  incision?: string;
  redFlags: string[];
  milestones: PathwayMilestone[];
}

export const RECOVERY_PATHWAYS: RecoveryPathway[] = [
  {
    id: "whipple",
    title: "Whipple — pancreaticoduodenectomy",
    band: "HPB",
    service: "HPB surgery",
    incision: "Rooftop or upper midline, multiple abdominal drains",
    summary:
      "The longest HPB stay and the highest pulmonary risk. Mobility targets exist to prevent atelectasis, ileus and delayed gastric emptying.",
    redFlags: [
      "Drain amylase rise or bile-stained output — hold progression and inform the surgical team",
      "Delayed gastric emptying with vomiting — mobilise upright, do not lie the patient flat",
      "New tachycardia with abdominal pain — stop the session and escalate",
    ],
    milestones: [
      {
        day: "POD 0 (evening)",
        target: "Sit upright, dangle at the bed edge, first 10 spirometry breaths",
        templateIds: ["hpb-splinted-cough", "gen-incentive-spirometry"],
      },
      {
        day: "POD 1",
        target: "Chair for 2 hours in total, assisted standing transfer, hourly spirometry",
        templateIds: ["hpb-log-roll-transfer", "gen-incentive-spirometry", "gen-ankle-pumps"],
      },
      {
        day: "POD 2",
        target: "50 m assisted corridor walk, chair for 4 hours in total",
        templateIds: ["hpb-drain-aware-ambulation", "gen-sit-to-stand"],
      },
      {
        day: "POD 3",
        target: "150 m walking, spirometry volume climbing, independent transfers",
        templateIds: ["hpb-drain-aware-ambulation", "gen-incentive-spirometry"],
      },
      {
        day: "POD 4–5",
        target: "Independent ward mobility, stair flight assessed, home programme issued",
        templateIds: ["gen-stair-practice", "gen-balance-progression"],
      },
    ],
  },
  {
    id: "major-hepatectomy",
    title: "Major hepatectomy and liver resection",
    band: "HPB",
    service: "Hepatobiliary surgery",
    incision: "Right subcostal, extended or Mercedes",
    summary:
      "Right basal collapse dominates the first three days. Positioning and basal expansion matter as much as distance walked.",
    redFlags: [
      "Rising bilirubin with confusion — suspect post-hepatectomy liver failure, defer progression",
      "Bile leak at the drain — hold trunk work and inform the team",
      "Right shoulder-tip pain with desaturation — assess before treating as referred pain",
    ],
    milestones: [
      {
        day: "POD 0 (evening)",
        target: "Head up 45°, basal expansion breathing, ankle pumps commenced",
        templateIds: ["hpb-diaphragmatic-basal", "gen-ankle-pumps"],
      },
      {
        day: "POD 1",
        target: "Chair for 2 hours, splinted cough taught, log-roll transfers",
        templateIds: ["hpb-splinted-cough", "hpb-log-roll-transfer"],
      },
      {
        day: "POD 2",
        target: "75 m corridor walk with drains secured",
        templateIds: ["hpb-drain-aware-ambulation", "gen-incentive-spirometry"],
      },
      {
        day: "POD 3",
        target: "200 m daily, independent bed transfers, balance screened",
        templateIds: ["gen-corridor-ambulation", "gen-balance-progression"],
      },
      {
        day: "POD 4+",
        target: "Unaided mobility, stairs cleared, discharge sign-off",
        templateIds: ["gen-stair-practice"],
      },
    ],
  },
  {
    id: "ldlt-donor",
    title: "Living-donor hepatectomy (donor)",
    band: "HPB",
    service: "Liver transplant",
    incision: "Right subcostal or upper midline; healthy pre-operative baseline",
    summary:
      "A fit patient with a major incision. The programme is about pacing an over-motivated donor, not about building capacity.",
    redFlags: [
      "Donor pushing past the incision precaution — restate the six-week lifting limit",
      "Persistent bile leak — hold trunk loading",
      "Low mood or regret — refer to the transplant psychology service",
    ],
    milestones: [
      {
        day: "POD 0 (evening)",
        target: "Dangle at the bed edge, spirometry started",
        templateIds: ["gen-incentive-spirometry"],
      },
      {
        day: "POD 1",
        target: "Chair and corridor walking commenced, splinted cough taught",
        templateIds: ["hpb-donor-early-mobility", "hpb-splinted-cough"],
      },
      {
        day: "POD 2–3",
        target: "Independent walking, stairs practised, lifting limits taught",
        templateIds: ["hpb-donor-early-mobility", "gen-stair-practice"],
      },
      {
        day: "POD 4+",
        target: "Discharge with a six-week graded return-to-activity plan",
        templateIds: ["gen-corridor-ambulation"],
      },
    ],
  },
  {
    id: "ldlt-recipient",
    title: "Liver transplant (recipient)",
    band: "HPB",
    service: "Liver transplant",
    incision: "Mercedes or rooftop; immunosuppressed from day zero",
    summary:
      "Deconditioned, sarcopenic and immunosuppressed. Progression is dictated by graft function and daily observations, not by a calendar.",
    redFlags: [
      "Fever or rising inflammatory markers — defer the session and inform the unit",
      "Tremor and proximal weakness from tacrolimus and steroids — re-screen fall risk daily",
      "New encephalopathy — revert to supervised short bouts",
    ],
    milestones: [
      {
        day: "ICU day 1–2",
        target: "Positioning, passive and active-assisted limb work, sitting out if stable",
        templateIds: ["hpb-ascites-positioning", "gen-ankle-pumps"],
      },
      {
        day: "Ward day 1–2",
        target: "Standing transfers, splinted cough, spirometry hourly",
        templateIds: ["hpb-splinted-cough", "gen-incentive-spirometry"],
      },
      {
        day: "Ward day 3–5",
        target: "Corridor walking, low-load limb strengthening commenced",
        templateIds: ["hpb-transplant-recipient-rehab", "hpb-sarcopenia-limb"],
      },
      {
        day: "Ward week 2+",
        target: "15 minutes of continuous walking, stairs, home programme with infection precautions",
        templateIds: ["hpb-transplant-recipient-rehab", "gen-stair-practice"],
      },
    ],
  },
  {
    id: "biliary-reconstruction",
    title: "Biliary reconstruction and hepaticojejunostomy",
    band: "HPB",
    service: "HPB surgery",
    incision: "Right subcostal; biliary drains commonly in situ",
    summary:
      "A shorter stay than a Whipple with the same pulmonary risk. Drain-aware mobility is the whole programme.",
    redFlags: [
      "Bile in the drain or on the dressing — stop and escalate",
      "Cholangitis with rigors — no exercise until treated",
    ],
    milestones: [
      {
        day: "POD 0–1",
        target: "Sitting out, spirometry, splinted cough taught",
        templateIds: ["gen-incentive-spirometry", "hpb-splinted-cough"],
      },
      {
        day: "POD 2",
        target: "Corridor walking with drains secured, 50–75 m",
        templateIds: ["hpb-drain-aware-ambulation"],
      },
      {
        day: "POD 3+",
        target: "Independent mobility, stairs, discharge education",
        templateIds: ["gen-stair-practice", "gen-corridor-ambulation"],
      },
    ],
  },
  {
    id: "lap-cholecystectomy",
    title: "Laparoscopic cholecystectomy",
    band: "HPB",
    service: "Biliary surgery",
    incision: "Four port sites; day-case or one night",
    summary:
      "Short stay. The physiotherapy contribution is shoulder-tip pain relief, early walking and clear home advice.",
    redFlags: [
      "Shoulder pain with breathlessness — exclude a cardiac or diaphragmatic cause",
      "Increasing abdominal distension — escalate before mobilising further",
    ],
    milestones: [
      {
        day: "Day 0",
        target: "Sit out, walk to the bathroom, deep breathing taught",
        templateIds: ["hpb-shoulder-tip-relief", "gen-incentive-spirometry"],
      },
      {
        day: "Day 1",
        target: "Independent walking, home advice on graded return to activity",
        templateIds: ["gen-corridor-ambulation"],
      },
    ],
  },
  {
    id: "gen-major-laparotomy",
    title: "Major open laparotomy (general surgical)",
    band: "GENERAL",
    service: "General surgery",
    incision: "Midline laparotomy",
    summary:
      "The general-surgical baseline pathway where no HPB-specific track applies.",
    redFlags: [
      "Distension with absent bowel sounds — mobilise gently, escalate if worsening",
      "Wound dehiscence risk — reinforce splinting and no straining",
    ],
    milestones: [
      {
        day: "POD 1",
        target: "Chair for 4 hours in total, splinted coughing",
        templateIds: ["hpb-splinted-cough", "gen-ankle-pumps"],
      },
      {
        day: "POD 2",
        target: "100 m corridor walk twice daily",
        templateIds: ["gen-corridor-ambulation", "gen-incentive-spirometry"],
      },
      {
        day: "POD 3",
        target: "300 m daily, independent chair transfers",
        templateIds: ["gen-corridor-ambulation", "gen-sit-to-stand"],
      },
      {
        day: "POD 4–5",
        target: "Stairs cleared, discharge functional assessment",
        templateIds: ["gen-stair-practice"],
      },
    ],
  },
  {
    id: "gen-icu-rehab",
    title: "ICU-acquired weakness rehabilitation",
    band: "GENERAL",
    service: "Critical care",
    summary:
      "For any patient after a prolonged critical-care stay, whatever the admitting service.",
    redFlags: [
      "Unstable haemodynamics or a rising vasopressor requirement — passive work only",
      "Delirium — shorten sessions and simplify instruction",
    ],
    milestones: [
      {
        day: "Phase 1",
        target: "Positioning, passive range of motion, sitting balance",
        templateIds: ["gen-ankle-pumps", "gen-postural-reeducation"],
      },
      {
        day: "Phase 2",
        target: "Sitting out of bed, standing transfers, bed exercises",
        templateIds: ["gen-bed-mobility", "gen-sit-to-stand"],
      },
      {
        day: "Phase 3",
        target: "Marching on the spot, short walks, balance progression",
        templateIds: ["gen-corridor-ambulation", "gen-balance-progression"],
      },
    ],
  },
  {
    id: "gen-cardiopulmonary",
    title: "Cardiopulmonary and thoracic rehabilitation",
    band: "GENERAL",
    service: "Thoracic and cardiac",
    incision: "Sternotomy or thoracotomy",
    summary:
      "Sternal precautions govern everything for the first six to eight weeks.",
    redFlags: [
      "Sternal click or instability — stop upper-limb loading and escalate",
      "Chest drain air leak — coordinate with the ward before mobilising",
    ],
    milestones: [
      {
        day: "POD 0–1",
        target: "Upright sitting, spirometry, sternal precautions taught",
        templateIds: ["gen-incentive-spirometry", "gen-postural-reeducation"],
      },
      {
        day: "POD 2",
        target: "60 m corridor walk with drains monitored",
        templateIds: ["gen-corridor-ambulation"],
      },
      {
        day: "POD 3+",
        target: "200 m continuous walking, graded home programme",
        templateIds: ["gen-corridor-ambulation", "gen-balance-progression"],
      },
    ],
  },
  {
    id: "gen-msk-lower-limb",
    title: "Lower-limb orthopaedic rehabilitation",
    band: "GENERAL",
    service: "Orthopaedics",
    summary:
      "Weight-bearing status set by the operating surgeon drives the whole programme.",
    redFlags: [
      "Weight-bearing status unclear — do not mobilise until confirmed in writing",
      "Calf pain and swelling — screen for DVT before exercise",
    ],
    milestones: [
      {
        day: "Day 1",
        target: "Bed exercises, transfers within the weight-bearing order",
        templateIds: ["gen-ankle-pumps", "gen-bed-mobility"],
      },
      {
        day: "Day 2",
        target: "Walking with the prescribed aid, range of motion commenced",
        templateIds: ["gen-corridor-ambulation"],
      },
      {
        day: "Day 3+",
        target: "Stairs, balance work, home exercise programme",
        templateIds: ["gen-stair-practice", "gen-balance-progression"],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Orders: weight bearing and precautions                              */
/* ------------------------------------------------------------------ */

export interface WeightBearingOption {
  value: string;
  code: string;
  label: string;
  detail: string;
  /** Share of body weight permitted, for the visual gauge. */
  loadPercent: number;
}

export const WEIGHT_BEARING_OPTIONS: WeightBearingOption[] = [
  {
    value: "NWB",
    code: "NWB",
    label: "Non-weight bearing",
    detail: "No load through the limb at all; transfers with an aid and assistance",
    loadPercent: 0,
  },
  {
    value: "TTWB",
    code: "TTWB",
    label: "Toe-touch weight bearing",
    detail: "Toe rests for balance only, no load taken",
    loadPercent: 10,
  },
  {
    value: "PWB_50",
    code: "PWB 50%",
    label: "Partial weight bearing",
    detail: "Up to half body weight through the limb",
    loadPercent: 50,
  },
  {
    value: "WBAT",
    code: "WBAT",
    label: "Weight bearing as tolerated",
    detail: "Load limited by the patient's own comfort",
    loadPercent: 80,
  },
  {
    value: "FWB",
    code: "FWB",
    label: "Full weight bearing",
    detail: "No restriction on load through the limb",
    loadPercent: 100,
  },
];

export interface PrecautionSet {
  value: string;
  label: string;
  band: ClinicalBand;
  rules: string[];
}

export const PRECAUTION_SETS: PrecautionSet[] = [
  {
    value: "SUBCOSTAL",
    label: "Subcostal / rooftop incision",
    band: "HPB",
    rules: [
      "Log-roll for every bed-to-chair transfer; no sit-up movement",
      "Splint the incision for coughing, spirometry and laughing",
      "No lifting over 5 kg for six weeks",
      "No trunk rotation against resistance",
    ],
  },
  {
    value: "DRAIN_AWARE",
    label: "Abdominal and biliary drains in situ",
    band: "HPB",
    rules: [
      "Check output volume and character before every session",
      "Carry drains below the insertion site on a mobile stand",
      "Stop for a sudden rise in output, bile staining or fresh blood",
      "Never let a drain take tension during a transfer",
    ],
  },
  {
    value: "COAGULOPATHY",
    label: "Coagulopathy, varices or low platelets",
    band: "HPB",
    rules: [
      "No heavy resistance and no breath-holding or Valsalva",
      "Keep exertion at Borg 11–13",
      "Guard hard against falls and knocks; document any bump",
      "Escalate for new bruising, melaena or haematemesis",
    ],
  },
  {
    value: "IMMUNOSUPPRESSED",
    label: "Post-transplant immunosuppression",
    band: "HPB",
    rules: [
      "Clean all equipment before and after use; no shared bands or weights",
      "No group or gym sessions while counts are low",
      "Defer the session for fever or a new cough and inform the unit",
      "Re-screen for steroid myopathy and tacrolimus tremor daily",
    ],
  },
  {
    value: "ENCEPHALOPATHY",
    label: "Hepatic encephalopathy fall risk",
    band: "HPB",
    rules: [
      "Re-screen orientation and asterixis before every session",
      "Low bed, two-person standing work while the grade fluctuates",
      "One-step instructions only; no dual-task work",
      "Do not progress a patient whose grade rose since the last review",
    ],
  },
  {
    value: "ASCITES",
    label: "Tense ascites or peripheral oedema",
    band: "HPB",
    rules: [
      "Position at 60–90° to unload the diaphragm",
      "Short, frequent bouts rather than one long walk",
      "Watch for hypotension after large-volume paracentesis",
      "Elevate oedematous limbs at rest",
    ],
  },
  {
    value: "STERNAL",
    label: "Sternal precautions",
    band: "GENERAL",
    rules: [
      "No lifting, pushing or pulling over 5 kg",
      "No bilateral backward arm reaching",
      "Hug a chest pillow for coughing and transfers",
      "Keep the upper arms close to the torso during sit-to-stand",
    ],
  },
  {
    value: "POSTURAL_HYPO",
    label: "Postural hypotension",
    band: "GENERAL",
    rules: [
      "Sit for a full minute before standing",
      "Check blood pressure lying and standing on the first mobilisation",
      "Chair within reach at all times",
    ],
  },
  {
    value: "HIGH_FALL_RISK",
    label: "High fall risk",
    band: "GENERAL",
    rules: [
      "Two-person assistance for all standing work",
      "Non-slip footwear checked before every session",
      "Call bell and walking aid within reach on leaving",
    ],
  },
  {
    value: "SPINAL",
    label: "Spinal precautions",
    band: "GENERAL",
    rules: [
      "No flexion, rotation or lateral bending of the spine",
      "Log-roll for all position changes",
      "Brace fitted before sitting up if prescribed",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Outcome measures                                                    */
/* ------------------------------------------------------------------ */

export interface ScaleItem {
  id: string;
  label: string;
  options: { value: number; label: string }[];
}

/** Berg Balance Scale — all fourteen items, each scored 0–4. */
export const BERG_ITEMS: ScaleItem[] = [
  "Sitting to standing",
  "Standing unsupported",
  "Sitting unsupported",
  "Standing to sitting",
  "Transfers",
  "Standing with eyes closed",
  "Standing with feet together",
  "Reaching forward with outstretched arm",
  "Retrieving object from floor",
  "Turning to look behind",
  "Turning 360 degrees",
  "Placing alternate foot on stool",
  "Standing with one foot in front",
  "Standing on one leg",
].map((label, index) => ({
  id: `berg-${index + 1}`,
  label,
  options: [
    { value: 4, label: "4 — independent and safe" },
    { value: 3, label: "3 — independent with supervision" },
    { value: 2, label: "2 — needs minimal assistance" },
    { value: 1, label: "1 — needs moderate assistance" },
    { value: 0, label: "0 — unable" },
  ],
}));

export function bergRisk(total: number): { label: string; tone: "good" | "warning" | "critical" } {
  if (total >= 45) return { label: "Low fall risk — independent ambulation likely safe", tone: "good" };
  if (total >= 21)
    return { label: "Medium fall risk — walking with assistance", tone: "warning" };
  return { label: "High fall risk — wheelchair bound or two-person assistance", tone: "critical" };
}

export function tugRisk(seconds: number): { label: string; tone: "good" | "warning" | "critical" } {
  if (seconds <= 0) return { label: "Not yet measured", tone: "warning" };
  if (seconds < 10) return { label: "Normal mobility for an adult", tone: "good" };
  if (seconds < 14) return { label: "Below normal — monitor", tone: "warning" };
  return { label: "Raised fall risk — supervise all mobility", tone: "critical" };
}

export const MRC_DYSPNOEA = [
  { value: 1, label: "1 — breathless only on strenuous exercise" },
  { value: 2, label: "2 — short of breath hurrying or on a slight hill" },
  { value: 3, label: "3 — walks slower than peers, stops for breath" },
  { value: 4, label: "4 — stops for breath after 100 m or a few minutes" },
  { value: 5, label: "5 — too breathless to leave the house or to dress" },
];

export const BORG_RPE = [
  { value: 6, label: "6 — no exertion" },
  { value: 9, label: "9 — very light" },
  { value: 11, label: "11 — light" },
  { value: 13, label: "13 — somewhat hard (target for HPB low-load work)" },
  { value: 15, label: "15 — hard" },
  { value: 17, label: "17 — very hard" },
  { value: 20, label: "20 — maximal exertion" },
];

export interface RomJoint {
  id: string;
  label: string;
  normal: number;
  unit: "deg";
}

export const ROM_JOINTS: RomJoint[] = [
  { id: "shoulder-flexion", label: "Shoulder flexion", normal: 180, unit: "deg" },
  { id: "shoulder-abduction", label: "Shoulder abduction", normal: 180, unit: "deg" },
  { id: "elbow-flexion", label: "Elbow flexion", normal: 145, unit: "deg" },
  { id: "hip-flexion", label: "Hip flexion", normal: 120, unit: "deg" },
  { id: "knee-flexion", label: "Knee flexion", normal: 135, unit: "deg" },
  { id: "knee-extension", label: "Knee extension lag", normal: 0, unit: "deg" },
  { id: "ankle-dorsiflexion", label: "Ankle dorsiflexion", normal: 20, unit: "deg" },
  { id: "trunk-rotation", label: "Trunk rotation", normal: 45, unit: "deg" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function templateById(id: string): ExerciseTemplate | undefined {
  return EXERCISE_TEMPLATES.find((template) => template.id === id);
}

export function precautionByValue(value: string): PrecautionSet | undefined {
  return PRECAUTION_SETS.find((set) => set.value === value);
}

export function weightBearingByValue(value: string): WeightBearingOption | undefined {
  return WEIGHT_BEARING_OPTIONS.find((option) => option.value === value);
}
