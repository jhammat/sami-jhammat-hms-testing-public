import type {
  CarePlanAlertRule,
  CarePlanStageDefinition,
  CarePlanTaskTemplate,
  CreateCarePlanTemplateInput,
} from "@wonflow/contracts";

export const STARTER_CARE_PLAN_TEMPLATES: CreateCarePlanTemplateInput[] = [
  {
    category: "SURGERY_POSTOP",
    title: "Post-Operative General Surgery (14 days)",
    description:
      "Comprehensive post-operative recovery protocol including acute wound care, vital signs surveillance, drain tracking, early ambulation, and return to normal activity.",
    durationDays: 14,
    stages: [
      {
        stageNumber: 1,
        title: "Acute Post-Op Recovery & Wound Care",
        daysFromStart: [1, 3],
        description:
          "Incision monitoring, vital signs BID, drain output measurement, and pain evaluation.",
      },
      {
        stageNumber: 2,
        title: "Early Mobilization & Diet Progression",
        daysFromStart: [4, 7],
        description:
          "Daily ambulation increments, transition to solid diet, and wound healing inspection.",
      },
      {
        stageNumber: 3,
        title: "Return to Activity & Discharge Follow-up",
        daysFromStart: [8, 14],
        description:
          "Progressive functional activity, return-to-work preparation, and 2-week surgical review.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      // Stage 1: Days 1-3
      { templateId: "postop-d1-vitals-am", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Empty drain bulb, record volume in mL, and inspect fluid clarity.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d1-wound", stageNumber: 1, dayOffset: 1, taskType: "WOUND_PHOTO", title: "Surgical Site Inspection", instructions: "Check dressing for strike-through bleeding or redness.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "postop-d1-vitals-pm", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "postop-d2-vitals-am", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d2-drain", stageNumber: 1, dayOffset: 2, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record 24h cumulative drain volume in mL.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d2-pain", stageNumber: 1, dayOffset: 2, taskType: "QUESTIONNAIRE", title: "Pain & Comfort Assessment", instructions: "Rate current resting and movement pain on a 1-10 scale.", requiredSource: null, scheduleTimeOfDay: "16:00" },
      { templateId: "postop-d2-vitals-pm", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record evening vitals.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "postop-d3-vitals-am", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record morning vitals.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d3-drain", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record drain output in mL.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d3-vitals-pm", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record evening vitals.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      // Stage 2: Days 4-7
      { templateId: "postop-d4-vitals", stageNumber: 2, dayOffset: 4, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record daily blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d4-walk", stageNumber: 2, dayOffset: 4, taskType: "EXERCISE", title: "Early Ambulation (10 mins)", instructions: "Perform 10 minutes of gentle indoor walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },
      { templateId: "postop-d4-diet", stageNumber: 2, dayOffset: 4, taskType: "DIET_LOG", title: "Diet Tolerance Check", instructions: "Log food intake and report any nausea or vomiting.", requiredSource: null, scheduleTimeOfDay: "19:00" },

      { templateId: "postop-d5-vitals", stageNumber: 2, dayOffset: 5, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d5-walk", stageNumber: 2, dayOffset: 5, taskType: "EXERCISE", title: "Gentle Ambulation (15 mins)", instructions: "Perform 15 minutes of gentle walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      { templateId: "postop-d6-vitals", stageNumber: 2, dayOffset: 6, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d6-walk", stageNumber: 2, dayOffset: 6, taskType: "EXERCISE", title: "Gentle Ambulation (15 mins)", instructions: "Perform 15 minutes of gentle walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      { templateId: "postop-d7-vitals", stageNumber: 2, dayOffset: 7, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "1-Week Wound Photo", instructions: "Upload a well-lit photo of the incision for clinical review.", requiredSource: null, scheduleTimeOfDay: "15:00" },

      // Stage 3: Days 8-14
      { templateId: "postop-d8-vitals", stageNumber: 3, dayOffset: 8, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d8-edu", stageNumber: 3, dayOffset: 8, taskType: "EDUCATION", title: "Safe Activity Guidelines", instructions: "Review restrictions on lifting (>5 kg) and vigorous exertion.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      { templateId: "postop-d10-vitals", stageNumber: 3, dayOffset: 10, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d10-exercise", stageNumber: 3, dayOffset: 10, taskType: "EXERCISE", title: "Moderate Ambulation (20 mins)", instructions: "Perform 20 minutes of comfortable walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      { templateId: "postop-d12-vitals", stageNumber: 3, dayOffset: 12, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },

      { templateId: "postop-d14-vitals", stageNumber: 3, dayOffset: 14, taskType: "VITALS_LOG", title: "Final Vitals Log", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d14-quest", stageNumber: 3, dayOffset: 14, taskType: "QUESTIONNAIRE", title: "2-Week Recovery Questionnaire", instructions: "Complete functional recovery questionnaire.", requiredSource: null, scheduleTimeOfDay: "11:00" },
      { templateId: "postop-d14-appt", stageNumber: 3, dayOffset: 14, taskType: "APPOINTMENT", title: "Post-Operative Clinic Visit", instructions: "Attend surgical follow-up for suture removal and clearance.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "blood_pressure_systolic", condition: ">", threshold: 180, severity: "CRITICAL", message: "Severe hypertension detected: systolic BP exceeds 180 mmHg. Immediate medical review required." },
      { observationType: "blood_pressure_systolic", condition: "<", threshold: 90, severity: "HIGH", message: "Hypotension detected: systolic BP below 90 mmHg. Check hydration and notify clinical team." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Fever detected (> 38.0 °C): evaluate for surgical site or systemic infection." },
      { observationType: "drain_output", condition: ">", threshold: 250, severity: "HIGH", message: "Elevated drain output (> 250 mL/day): alert surgical team." },
      { observationType: "pain_score", condition: ">=", threshold: 8, severity: "MEDIUM", message: "Severe pain reported (score >= 8): review analgesic management." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "MATERNITY_POSTPARTUM",
    title: "Postpartum Maternity Care (42 days / 6 weeks)",
    description:
      "6-week postpartum recovery protocol monitoring maternal blood pressure, lochia, emotional wellbeing (EPDS screening), infant feeding, and 6-week review.",
    durationDays: 42,
    stages: [
      {
        stageNumber: 1,
        title: "Early Postpartum & Newborn Transition",
        daysFromStart: [1, 7],
        description: "Blood pressure surveillance, lochia tracking, and feeding establishment.",
      },
      {
        stageNumber: 2,
        title: "Wound Healing & Maternal Wellbeing",
        daysFromStart: [8, 21],
        description: "Incision/perineal check, Edinburgh depression screening, and lactation support.",
      },
      {
        stageNumber: 3,
        title: "Extended Recovery & 6-Week Review",
        daysFromStart: [22, 42],
        description: "Core recovery exercises, infant development milestones, and comprehensive 6-week clinical review.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      // Stage 1: Days 1-7
      { templateId: "mat-d1-bp", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d1-feed", stageNumber: 1, dayOffset: 1, taskType: "DIET_LOG", title: "Infant Feeding Log", instructions: "Log feeding frequency and infant latch.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "mat-d2-bp", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d3-bp", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d4-bp", stageNumber: 1, dayOffset: 4, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d5-bp", stageNumber: 1, dayOffset: 5, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d7-bp", stageNumber: 1, dayOffset: 7, taskType: "VITALS_LOG", title: "Week 1 Blood Pressure", instructions: "Record blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d7-wound", stageNumber: 1, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Perineal / C-Section Incision Check", instructions: "Inspect wound for swelling, redness, or discharge.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      // Stage 2: Days 8-21
      { templateId: "mat-d10-bp", stageNumber: 2, dayOffset: 10, taskType: "VITALS_LOG", title: "Day 10 Blood Pressure", instructions: "Record blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d14-epds", stageNumber: 2, dayOffset: 14, taskType: "QUESTIONNAIRE", title: "Edinburgh Postnatal Depression Screen (EPDS)", instructions: "Complete the 10-question maternal wellbeing screener.", requiredSource: null, scheduleTimeOfDay: "15:00" },
      { templateId: "mat-d21-lac", stageNumber: 2, dayOffset: 21, taskType: "EDUCATION", title: "Lactation & Nutrition Guidance", instructions: "Review maternal caloric and hydration recommendations.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      // Stage 3: Days 22-42
      { templateId: "mat-d28-exercise", stageNumber: 3, dayOffset: 28, taskType: "EXERCISE", title: "Pelvic Floor & Core Rehab", instructions: "Perform guided gentle pelvic floor exercises.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "mat-d35-mood", stageNumber: 3, dayOffset: 35, taskType: "QUESTIONNAIRE", title: "5-Week Mood & Sleep Check", instructions: "Log mood, fatigue levels, and sleep patterns.", requiredSource: null, scheduleTimeOfDay: "16:00" },
      { templateId: "mat-d42-appt", stageNumber: 3, dayOffset: 42, taskType: "APPOINTMENT", title: "6-Week Postpartum Comprehensive Review", instructions: "Complete 6-week pelvic exam, contraception counseling, and health clearance.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "blood_pressure_systolic", condition: ">=", threshold: 160, severity: "CRITICAL", message: "Severe systolic hypertension postpartum (>= 160 mmHg): urgent evaluation for postpartum preeclampsia." },
      { observationType: "blood_pressure_diastolic", condition: ">=", threshold: 105, severity: "CRITICAL", message: "Severe diastolic hypertension postpartum (>= 105 mmHg): urgent evaluation for postpartum preeclampsia." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Postpartum fever (> 38.0 °C): evaluate for mastitis or endometritis." },
      { observationType: "epds_score", condition: ">=", threshold: 13, severity: "HIGH", message: "Elevated EPDS score (>= 13): prompt maternal mental health support recommended." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "CHRONIC_CARE",
    title: "Post-CABG Cardiac Rehabilitation (90 days)",
    description:
      "90-day multi-stage cardiac rehabilitation protocol following Coronary Artery Bypass Grafting (CABG), managing strict fluid balance, telemetry/vitals, and graded exercise progression.",
    durationDays: 90,
    stages: [
      {
        stageNumber: 1,
        title: "Immediate Post-Discharge & Sternal Precautions",
        daysFromStart: [1, 14],
        description: "Strict daily BP/HR and morning weight monitoring, sternal wound surveillance, fluid tracking.",
      },
      {
        stageNumber: 2,
        title: "Phase II Early Cardiac Rehabilitation",
        daysFromStart: [15, 30],
        description: "Supervised light aerobic exercise initiation, dietary sodium and lipid education.",
      },
      {
        stageNumber: 3,
        title: "Cardiovascular Endurance & Medication Titration",
        daysFromStart: [31, 60],
        description: "Progressive exercise duration and resistance, glycemic and lipid target review.",
      },
      {
        stageNumber: 4,
        title: "Long-Term Maintenance & Secondary Prevention",
        daysFromStart: [61, 90],
        description: "Independent maintenance exercise regimen and 3-month cardiology follow-up.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      // Stage 1: Days 1-14 (daily vitals and weights)
      { templateId: "cabg-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse before cardiac medications.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d1-weight", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking after voiding.", requiredSource: null, scheduleTimeOfDay: "08:15" },
      { templateId: "cabg-d1-sternum", stageNumber: 1, dayOffset: 1, taskType: "WOUND_PHOTO", title: "Sternal Wound Inspection", instructions: "Check sternal incision for instability, separation, or discharge.", requiredSource: null, scheduleTimeOfDay: "12:00" },

      { templateId: "cabg-d2-vitals", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d2-weight", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      { templateId: "cabg-d3-vitals", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d3-weight", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      { templateId: "cabg-d7-vitals", stageNumber: 1, dayOffset: 7, taskType: "VITALS_LOG", title: "Week 1 Cardiac Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d7-wound", stageNumber: 1, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Sternal & Leg Vein Harvest Site Photo", instructions: "Upload photos of sternal and leg incisions.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      { templateId: "cabg-d14-vitals", stageNumber: 1, dayOffset: 14, taskType: "VITALS_LOG", title: "Day 14 Cardiac Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d14-weight", stageNumber: 1, dayOffset: 14, taskType: "VITALS_LOG", title: "Day 14 Weight", instructions: "Record morning weight.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      // Stage 2: Days 15-30
      { templateId: "cabg-d15-exercise", stageNumber: 2, dayOffset: 15, taskType: "EXERCISE", title: "Phase II Graded Walking (15 mins)", instructions: "Walk at target heart rate (HR < resting + 20 bpm).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "cabg-d20-diet", stageNumber: 2, dayOffset: 20, taskType: "DIET_LOG", title: "Sodium & Fluid Intake Review", instructions: "Log daily sodium (< 2000 mg) and fluid volume.", requiredSource: null, scheduleTimeOfDay: "18:00" },
      { templateId: "cabg-d30-vitals", stageNumber: 2, dayOffset: 30, taskType: "VITALS_LOG", title: "1-Month Comprehensive Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },

      // Stage 3: Days 31-60
      { templateId: "cabg-d45-exercise", stageNumber: 3, dayOffset: 45, taskType: "EXERCISE", title: "Aerobic Conditioning (25 mins)", instructions: "Continuous brisk walking or stationary cycling.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "cabg-d60-quest", stageNumber: 3, dayOffset: 60, taskType: "QUESTIONNAIRE", title: "2-Month Angina & Dyspnea Questionnaire", instructions: "Report any exertional shortness of breath or chest discomfort.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      // Stage 4: Days 61-90
      { templateId: "cabg-d75-exercise", stageNumber: 4, dayOffset: 75, taskType: "EXERCISE", title: "Maintenance Exercise (30 mins)", instructions: "Cardiovascular maintenance exercise.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "cabg-d90-vitals", stageNumber: 4, dayOffset: 90, taskType: "VITALS_LOG", title: "90-Day Final Vitals", instructions: "Record final recovery blood pressure and heart rate.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d90-appt", stageNumber: 4, dayOffset: 90, taskType: "APPOINTMENT", title: "3-Month Cardiologist Follow-up", instructions: "Comprehensive cardiovascular evaluation and stress test review.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "blood_pressure_systolic", condition: ">", threshold: 180, severity: "CRITICAL", message: "Severe hypertension post-CABG (> 180 mmHg): immediate clinical intervention required." },
      { observationType: "heart_rate", condition: ">", threshold: 120, severity: "HIGH", message: "Tachycardia at rest (> 120 bpm): evaluate for atrial fibrillation or arrhythmia." },
      { observationType: "heart_rate", condition: "<", threshold: 50, severity: "MEDIUM", message: "Bradycardia at rest (< 50 bpm): check beta-blocker dosing and symptoms." },
      { observationType: "weight_delta_48h", condition: ">", threshold: 2.0, severity: "HIGH", message: "Rapid weight gain (> 2.0 kg in 48h): evaluate for fluid retention/decompensated heart failure." },
      { observationType: "pain_score", condition: ">=", threshold: 7, severity: "HIGH", message: "Severe sternal/chest pain (score >= 7): rule out graft ischemia or sternal dehiscence." },
    ] as CarePlanAlertRule[],
  },
];
