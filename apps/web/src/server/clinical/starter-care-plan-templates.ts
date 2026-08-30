import type {
  CarePlanAlertRule,
  CarePlanStageDefinition,
  CarePlanTaskTemplate,
  CreateCarePlanTemplateInput,
} from "@wonflow/contracts";

export const STARTER_CARE_PLAN_TEMPLATES: CreateCarePlanTemplateInput[] = [
  // ==========================================
  // HPBSP (HEPATO-PANCREATO-BILIARY & SURGICAL ONCOLOGY) PROTOCOLS
  // ==========================================
  {
    category: "WHIPPLE_RECOVERY",
    title: "Whipple (Pancreaticoduodenectomy) HPB Protocol (30 days)",
    description:
      "Advanced Hepato-Pancreato-Biliary (HPB) surgical recovery protocol for classic and pylorus-preserving pancreaticoduodenectomy. Incorporates ISGPS 2016 POPF drain fluid amylase surveillance, delayed gastric emptying (DGE) tracking, post-pancreatectomy hemorrhage (PPH) vigilance, PERT (Creon) titration, and ERAS ambulation.",
    durationDays: 30,
    stages: [
      {
        stageNumber: 1,
        title: "Acute Phase & ISGPS POPF Surveillance (POD 1–5)",
        daysFromStart: [1, 5],
        description:
          "Drain fluid amylase testing on POD 1/3/5, nasogastric tube weaning, hemodynamic surveillance, and initial ERAS out-of-bed mobilization.",
      },
      {
        stageNumber: 2,
        title: "Diet Progression, PERT Titration & Drain Weaning (POD 6–12)",
        daysFromStart: [6, 12],
        description:
          "Transition to small frequent low-fat meals, Pancreatic Enzyme Replacement Therapy (PERT: Creon 50k–75k IU/meal) initiation, and drain volume/color inspection.",
      },
      {
        stageNumber: 3,
        title: "Outpatient Convalescence & Glycemic Stabilization (POD 13–20)",
        daysFromStart: [13, 20],
        description:
          "Drain removal criteria confirmation (output <30 mL/24h & amylase <3x serum), steatorrhea scoring, and Type 3c glycemic monitoring.",
      },
      {
        stageNumber: 4,
        title: "Functional Reconditioning & Adjuvant Readiness (POD 21–30)",
        daysFromStart: [21, 30],
        description:
          "Progressive stamina recovery, weight and caloric intake maintenance, surgical wound review, and medical oncology clearance.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      { templateId: "whip-d1-vitals-am", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals & Hemodynamics", instructions: "Record blood pressure, heart rate, temperature, and SpO2.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "whip-d1-drain-pancreatic", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Pancreatic Anastomosis Drain #1", instructions: "Record 24h volume in mL, fluid character (serous/bilious/milky), and check POD 1 amylase.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "whip-d1-drain-biliary", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Biliary Anastomosis Drain #2", instructions: "Record 24h volume in mL and inspect for bile leak.", requiredSource: null, scheduleTimeOfDay: "10:30" },
      { templateId: "whip-d1-eras-sit", stageNumber: 1, dayOffset: 1, taskType: "EXERCISE", title: "ERAS Out-of-Bed Mobilization", instructions: "Target: ≥2 hours sitting out of bed with deep breathing exercises.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "whip-d1-vitals-pm", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "whip-d2-vitals-am", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning Vitals & Glycemia", instructions: "Record vitals and fasting capillary blood glucose.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "whip-d2-drain", stageNumber: 1, dayOffset: 2, taskType: "DRAIN_LOG", title: "Surgical Drains Output & Color", instructions: "Record 24h volume for Pancreatic (Drain #1) and Biliary (Drain #2).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "whip-d2-walk", stageNumber: 1, dayOffset: 2, taskType: "EXERCISE", title: "ERAS Corridor Ambulation", instructions: "Gentle assisted corridor walking (target: 3 short walks of 5-10 mins).", requiredSource: null, scheduleTimeOfDay: "15:00" },

      { templateId: "whip-d3-vitals", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "whip-d3-popf-amylase", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "ISGPS POD 3 Drain Fluid Amylase", instructions: "CRITICAL: Send drain fluid for amylase testing to rule out POPF (>3x serum upper limit). Record volume and result.", requiredSource: null, scheduleTimeOfDay: "09:30" },
      { templateId: "whip-d3-wound", stageNumber: 1, dayOffset: 3, taskType: "WOUND_PHOTO", title: "Rooftop / Midline Incision Inspection", instructions: "Inspect dressing for strike-through bleeding, hematoma, or dehiscence.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      { templateId: "whip-d5-vitals", stageNumber: 1, dayOffset: 5, taskType: "VITALS_LOG", title: "Morning Vitals & Bowel Function", instructions: "Record vitals. Check for return of flatus or bowel motion.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "whip-d5-drain", stageNumber: 1, dayOffset: 5, taskType: "DRAIN_LOG", title: "POD 5 Drain Amylase & Volume Audit", instructions: "Record drain output. Evaluate for drain removal if output <30 mL and amylase normal.", requiredSource: null, scheduleTimeOfDay: "10:00" },

      { templateId: "whip-d6-pert", stageNumber: 2, dayOffset: 6, taskType: "MEDICATION", title: "PERT (Creon) Dosing with Meals", instructions: "Take prescribed Creon (50,000–75,000 IU) with first mouthful of breakfast, lunch, and dinner.", requiredSource: null, scheduleTimeOfDay: "08:30" },
      { templateId: "whip-d6-diet", stageNumber: 2, dayOffset: 6, taskType: "DIET_LOG", title: "Low-Fat Diet Tolerance Log", instructions: "Log food intake. Report any nausea, bloating, or early satiety (DGE).", requiredSource: null, scheduleTimeOfDay: "19:00" },
      { templateId: "whip-d7-drain", stageNumber: 2, dayOffset: 7, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record 24h drain volume in mL.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "whip-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "1-Week Surgical Wound Photo", instructions: "Upload a well-lit photo of the rooftop/midline incision for review.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "whip-d9-walk", stageNumber: 2, dayOffset: 9, taskType: "EXERCISE", title: "Independent Ambulation (15 mins)", instructions: "Walk comfortably for 15 minutes twice daily.", requiredSource: null, scheduleTimeOfDay: "11:00" },
      { templateId: "whip-d12-stool", stageNumber: 2, dayOffset: 12, taskType: "QUESTIONNAIRE", title: "Steatorrhea & Digestion Screener", instructions: "Report stool frequency, consistency, and floating/pale stools (PERT adequacy).", requiredSource: null, scheduleTimeOfDay: "16:00" },

      { templateId: "whip-d14-vitals", stageNumber: 3, dayOffset: 14, taskType: "VITALS_LOG", title: "2-Week Vitals & Weight Log", instructions: "Record morning resting blood pressure and body weight.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "whip-d14-appt", stageNumber: 3, dayOffset: 14, taskType: "APPOINTMENT", title: "HPB Post-Op Surgical Clinic Review", instructions: "Attend clinic for wound assessment, drain site check, and histopathology discussion.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "whip-d18-pert", stageNumber: 3, dayOffset: 18, taskType: "DIET_LOG", title: "Nutritional Caloric & Enzyme Log", instructions: "Confirm adequate caloric intake (target: 30 kcal/kg/day) and enzyme compliance.", requiredSource: null, scheduleTimeOfDay: "19:00" },

      { templateId: "whip-d21-wound", stageNumber: 4, dayOffset: 21, taskType: "WOUND_PHOTO", title: "3-Week Incision Healing Photo", instructions: "Upload surgical wound photograph.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "whip-d25-exercise", stageNumber: 4, dayOffset: 25, taskType: "EXERCISE", title: "Functional Stamina Walking (25 mins)", instructions: "Perform 25 minutes of continuous brisk walking.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "whip-d30-appt", stageNumber: 4, dayOffset: 30, taskType: "APPOINTMENT", title: "1-Month Multidisciplinary HPB Review", instructions: "Comprehensive surgical and medical oncology review for adjuvant chemotherapy planning.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "drain_amylase", condition: ">", threshold: 300, severity: "CRITICAL", message: "ISGPS POPF Alert: Drain fluid amylase exceeds 3x upper normal serum limit. Evaluate for pancreatic fistula." },
      { observationType: "drain_output", condition: ">", threshold: 200, severity: "HIGH", message: "High-volume drain output (> 200 mL/24h): inspect fluid character for chylous/bilious/bloody content." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Post-Whipple pyrexia (> 38.0 °C): evaluate for intra-abdominal collection, bile leak, or cholangitis." },
      { observationType: "blood_pressure_systolic", condition: "<", threshold: 90, severity: "CRITICAL", message: "Hypotension detected (systolic BP < 90 mmHg): urgently rule out post-pancreatectomy hemorrhage (PPH) or sepsis." },
      { observationType: "blood_glucose", condition: ">", threshold: 250, severity: "HIGH", message: "Hyperglycemia detected (> 250 mg/dL): evaluate for new Type 3c pancreatogenic diabetes destabilization." },
      { observationType: "pain_score", condition: ">=", threshold: 8, severity: "MEDIUM", message: "Severe abdominal pain (score >= 8): reassess analgesic protocol and rule out acute peritonitis." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "HEPATECTOMY_RECOVERY",
    title: "Major Hepatectomy & Liver Resection Surveillance (28 days)",
    description:
      "Hepatic surgical surveillance for right/left hemihepatectomy, extended trisegmentectomy, and anatomical segmentectomies. Monitors ISGLS 50-50 Post-Hepatectomy Liver Failure criteria, subhepatic bile leaks, ascites, and hepatic regeneration.",
    durationDays: 28,
    stages: [
      {
        stageNumber: 1,
        title: "Acute Hepatic Surveillance & ISGLS 50-50 Audit (POD 1–5)",
        daysFromStart: [1, 5],
        description:
          "Daily LFTs, PT/INR, serum bilirubin, subhepatic drain bilirubin tracking, and phosphate repletion for liver regeneration.",
      },
      {
        stageNumber: 2,
        title: "Ascites, Fluid Balance & High-Protein Nutrition (POD 6–14)",
        daysFromStart: [6, 14],
        description:
          "Daily abdominal girth and weight checks for post-resection ascites, high-protein nutrition (1.5 g/kg/day), and mobilization.",
      },
      {
        stageNumber: 3,
        title: "Outpatient Functional Recovery & Surveillance (POD 15–28)",
        daysFromStart: [15, 28],
        description:
          "Hepatic functional restitution, drain site closure, dynamic liver imaging follow-up, and return to full baseline activity.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      { templateId: "hep-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals & Urine Output", instructions: "Record BP, HR, temperature, and 24h urine output.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "hep-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Subhepatic Drain Output & Bilirubin", instructions: "Record drain volume and inspect for bilious discoloration (bile leak).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "hep-d3-drain", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "POD 3 Drain Fluid Bilirubin", instructions: "Check drain bilirubin if fluid is yellow/green (ISGLS Bile Leak criteria).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "hep-d5-isgls", stageNumber: 1, dayOffset: 5, taskType: "VITALS_LOG", title: "ISGLS 50-50 Criteria Evaluation (POD 5)", instructions: "Evaluate PT/INR and Serum Bilirubin on POD 5 (PT < 50% & Bilirubin > 50 µmol/L = PHLF).", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "hep-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Mercedes / J-Incision Inspection", instructions: "Upload incision photo for review.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "hep-d7-diet", stageNumber: 2, dayOffset: 7, taskType: "DIET_LOG", title: "High-Protein Nutritional Target Log", instructions: "Confirm high-protein intake (≥1.5g protein/kg/day) to support liver regeneration.", requiredSource: null, scheduleTimeOfDay: "19:00" },
      { templateId: "hep-d10-weight", stageNumber: 2, dayOffset: 10, taskType: "VITALS_LOG", title: "Morning Weight & Abdominal Girth", instructions: "Record weight and abdominal circumference (screening for ascites).", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "hep-d14-appt", stageNumber: 2, dayOffset: 14, taskType: "APPOINTMENT", title: "2-Week HPB Liver Follow-up", instructions: "Clinic review for LFTs trend, drain status, and histology review.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "hep-d21-exercise", stageNumber: 3, dayOffset: 21, taskType: "EXERCISE", title: "Progressive Ambulation (20 mins)", instructions: "Walk comfortably for 20 minutes daily.", requiredSource: null, scheduleTimeOfDay: "11:00" },
      { templateId: "hep-d28-appt", stageNumber: 3, dayOffset: 28, taskType: "APPOINTMENT", title: "1-Month Hepatectomy Review & Imaging", instructions: "Final post-resection surgical evaluation and follow-up planning.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "drain_bilirubin", condition: ">", threshold: 5, severity: "CRITICAL", message: "ISGLS Bile Leak Alert: Drain fluid bilirubin is >3x serum bilirubin. Evaluate for biliary anastomotic/cut-surface leak." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Fever post-hepatectomy (> 38.0 °C): evaluate for subphrenic biloma or infected collection." },
      { observationType: "drain_output", condition: ">", threshold: 250, severity: "HIGH", message: "Elevated subhepatic drain output (> 250 mL/24h): check character for ascites or bilious fluid." },
      { observationType: "blood_pressure_systolic", condition: "<", threshold: 90, severity: "CRITICAL", message: "Hypotension detected (systolic BP < 90 mmHg): urgently rule out post-hepatectomy hemorrhage." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "BILIARY_RECOVERY",
    title: "Roux-en-Y Hepaticojejunostomy & Biliary Repair (21 days)",
    description:
      "Specialized recovery protocol for biliary-enteric reconstructions, choledochal cyst excision, and iatrogenic bile duct injuries. Emphasizes subhepatic drain monitoring, jaundice clearance, and cholangitis vigilance.",
    durationDays: 21,
    stages: [
      {
        stageNumber: 1,
        title: "Anastomotic Integrity & Bile Output Tracking (POD 1–5)",
        daysFromStart: [1, 5],
        description: "Biliary drain characterization, serum bilirubin decline monitoring, and early mobilization.",
      },
      {
        stageNumber: 2,
        title: "Diet Transition & Drain Weaning (POD 6–12)",
        daysFromStart: [6, 12],
        description: "Gradual introduction of low-fat diet, bowel normalization, and subhepatic drain removal criteria.",
      },
      {
        stageNumber: 3,
        title: "Functional Outpatient Convalescence (POD 13–21)",
        daysFromStart: [13, 21],
        description: "Biliary stricture surveillance, normal diet tolerance, and surgical clinic review.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      { templateId: "bil-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals & Temperature", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "bil-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Biliary Anastomotic Drain Check", instructions: "Inspect fluid volume and color (amber/serosanguinous vs deep dark bile).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "bil-d3-drain", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record 24h drain volume in mL.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "bil-d5-wound", stageNumber: 1, dayOffset: 5, taskType: "WOUND_PHOTO", title: "Subcostal / Kocher Incision Photo", instructions: "Upload photo of surgical incision.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "bil-d7-diet", stageNumber: 2, dayOffset: 7, taskType: "DIET_LOG", title: "Low-Fat Diet Tolerance Log", instructions: "Log food intake and report any right upper quadrant ache or nausea.", requiredSource: null, scheduleTimeOfDay: "19:00" },
      { templateId: "bil-d14-appt", stageNumber: 3, dayOffset: 14, taskType: "APPOINTMENT", title: "2-Week Biliary Reconstruction Review", instructions: "Review LFTs (Bilirubin, ALP, GGT) and wound healing.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "bil-d21-vitals", stageNumber: 3, dayOffset: 21, taskType: "VITALS_LOG", title: "3-Week Final Vitals Log", instructions: "Record resting vitals and symptom check.", requiredSource: null, scheduleTimeOfDay: "09:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "drain_output", condition: ">", threshold: 150, severity: "HIGH", message: "Bile Leak Alert: Increased drain output with bilious staining. Alert HPB surgical team." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Pyrexia (> 38.0 °C): rule out acute ascending cholangitis or infected biloma." },
      { observationType: "pain_score", condition: ">=", threshold: 7, severity: "HIGH", message: "Severe RUQ/epigastric pain reported (score >= 7): urgent clinical assessment required." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "DISTAL_PANCREATECTOMY",
    title: "Distal Pancreatectomy & Splenectomy (RAMPS) Protocol (21 days)",
    description:
      "Specialized recovery for pancreatic body/tail resection with or without splenectomy (RAMPS). Features pancreatic stump fistula surveillance, post-splenectomy infection prophylaxis, and thrombocytosis tracking.",
    durationDays: 21,
    stages: [
      {
        stageNumber: 1,
        title: "Pancreatic Stump POPF & Vital Signs Surveillance (POD 1–5)",
        daysFromStart: [1, 5],
        description: "Drain fluid amylase monitoring on POD 1/3/5, early ambulation, and glycemic tracking.",
      },
      {
        stageNumber: 2,
        title: "Diet Step-Up & Post-Splenectomy Prophylaxis (POD 6–12)",
        daysFromStart: [6, 12],
        description: "Oral diet advancement, drain removal criteria evaluation, and vaccination scheduling if asplenic.",
      },
      {
        stageNumber: 3,
        title: "Outpatient Convalescence & Platelet Surveillance (POD 13–21)",
        daysFromStart: [13, 21],
        description: "Platelet count check (post-splenectomy thrombocytosis), stamina recovery, and surgical follow-up.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      { templateId: "dp-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals & Glucose", instructions: "Record blood pressure, pulse, temperature, and blood glucose.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "dp-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Splenic Bed / Pancreatic Stump Drain", instructions: "Record 24h drain volume in mL.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "dp-d3-amylase", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "ISGPS POD 3 Stump Drain Amylase", instructions: "Check drain fluid amylase. Values >3x upper normal serum indicate biochemical leak.", requiredSource: null, scheduleTimeOfDay: "09:30" },
      { templateId: "dp-d5-drain", stageNumber: 1, dayOffset: 5, taskType: "DRAIN_LOG", title: "POD 5 Drain Volume & Character", instructions: "Record drain output. Evaluate for removal if clear and output <30 mL.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "dp-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Laparoscopic / Open Incision Photo", instructions: "Upload photo of surgical wounds.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "dp-d14-appt", stageNumber: 3, dayOffset: 14, taskType: "APPOINTMENT", title: "2-Week HPB Surgical Review", instructions: "Review wound healing, histology, and post-splenectomy vaccine administration.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "drain_amylase", condition: ">", threshold: 300, severity: "CRITICAL", message: "Pancreatic Stump Fistula Alert: Drain fluid amylase is elevated (> 3x serum). Alert surgical team." },
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Post-Splenectomy Pyrexia Alert (> 38.0 °C): urgent evaluation to prevent Overwhelming Post-Splenectomy Infection (OPSI)." },
      { observationType: "drain_output", condition: ">", threshold: 150, severity: "HIGH", message: "Elevated splenic bed drain output (> 150 mL/24h): check fluid character." },
    ] as CarePlanAlertRule[],
  },

  {
    category: "GENERAL_HPB_SURG",
    title: "Complex Biliary & Gallbladder Radical Resection (14 days)",
    description:
      "Standard HPB pathway for extended radical cholecystectomy (wedge resection of segment IVb/V + lymphadenectomy), complex bile duct exploration, and liver cyst deroofing.",
    durationDays: 14,
    stages: [
      {
        stageNumber: 1,
        title: "Acute Recovery & Subhepatic Drain Check (POD 1–3)",
        daysFromStart: [1, 3],
        description: "Subhepatic drain monitoring, vital signs BID, and early ERAS ambulation.",
      },
      {
        stageNumber: 2,
        title: "Diet Progression & Mobilization (POD 4–7)",
        daysFromStart: [4, 7],
        description: "Transition to regular diet, drain removal, and wound healing inspection.",
      },
      {
        stageNumber: 3,
        title: "Outpatient Recovery & 2-Week Review (POD 8–14)",
        daysFromStart: [8, 14],
        description: "Progressive functional recovery and 2-week surgical oncology review.",
      },
    ] as CarePlanStageDefinition[],
    taskTemplates: [
      { templateId: "ghpb-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "ghpb-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Subhepatic Drain Output", instructions: "Record drain output in mL and check color.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "ghpb-d3-drain", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "POD 3 Drain Output Audit", instructions: "Record 24h output. Prepare for removal if <30 mL and non-bilious.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "ghpb-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Surgical Incision Photo", instructions: "Upload incision photo for review.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "ghpb-d14-appt", stageNumber: 3, dayOffset: 14, taskType: "APPOINTMENT", title: "2-Week HPB Surgical Review", instructions: "Clinic review for final histopathology review and recovery check.", requiredSource: null, scheduleTimeOfDay: "14:00" },
    ] as CarePlanTaskTemplate[],
    alertRules: [
      { observationType: "temperature", condition: ">", threshold: 38.0, severity: "HIGH", message: "Fever detected (> 38.0 °C): rule out biliary leak or subhepatic fluid collection." },
      { observationType: "drain_output", condition: ">", threshold: 150, severity: "HIGH", message: "Elevated drain output (> 150 mL/24h): check fluid character for bile." },
      { observationType: "blood_pressure_systolic", condition: "<", threshold: 90, severity: "HIGH", message: "Hypotension detected (systolic BP < 90 mmHg)." },
    ] as CarePlanAlertRule[],
  },

  // ==========================================
  // GENERAL & OTHER STARTER PROTOCOLS
  // ==========================================
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
      { templateId: "postop-d1-vitals-am", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d1-drain", stageNumber: 1, dayOffset: 1, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Empty drain bulb, record volume in mL, and inspect fluid clarity.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d1-wound", stageNumber: 1, dayOffset: 1, taskType: "WOUND_PHOTO", title: "Surgical Incision Inspection", instructions: "Check dressing for strike-through bleeding or redness.", requiredSource: null, scheduleTimeOfDay: "14:00" },
      { templateId: "postop-d1-vitals-pm", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "postop-d2-vitals-am", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record blood pressure, heart rate, and temperature.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d2-drain", stageNumber: 1, dayOffset: 2, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record 24h cumulative drain volume in mL.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d2-pain", stageNumber: 1, dayOffset: 2, taskType: "QUESTIONNAIRE", title: "Pain & Comfort Assessment", instructions: "Rate current resting and movement pain on a 1-10 scale.", requiredSource: null, scheduleTimeOfDay: "16:00" },
      { templateId: "postop-d2-vitals-pm", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record evening vitals.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "postop-d3-vitals-am", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning Vitals Check", instructions: "Record morning vitals.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "postop-d3-drain", stageNumber: 1, dayOffset: 3, taskType: "DRAIN_LOG", title: "Drain Output Measurement", instructions: "Record drain output in mL.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "postop-d3-vitals-pm", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Evening Vitals Check", instructions: "Record evening vitals.", requiredSource: null, scheduleTimeOfDay: "20:00" },

      { templateId: "postop-d4-vitals", stageNumber: 2, dayOffset: 4, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record daily blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d4-walk", stageNumber: 2, dayOffset: 4, taskType: "EXERCISE", title: "Early Ambulation (10 mins)", instructions: "Perform 10 minutes of gentle indoor walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },
      { templateId: "postop-d4-diet", stageNumber: 2, dayOffset: 4, taskType: "DIET_LOG", title: "Diet Tolerance Check", instructions: "Log food intake and report any nausea or vomiting.", requiredSource: null, scheduleTimeOfDay: "19:00" },

      { templateId: "postop-d5-vitals", stageNumber: 2, dayOffset: 5, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d5-walk", stageNumber: 2, dayOffset: 5, taskType: "EXERCISE", title: "Gentle Ambulation (15 mins)", instructions: "Perform 15 minutes of gentle walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      { templateId: "postop-d6-vitals", stageNumber: 2, dayOffset: 6, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d6-walk", stageNumber: 2, dayOffset: 6, taskType: "EXERCISE", title: "Gentle Ambulation (15 mins)", instructions: "Perform 15 minutes of gentle walking.", requiredSource: null, scheduleTimeOfDay: "11:00" },

      { templateId: "postop-d7-vitals", stageNumber: 2, dayOffset: 7, taskType: "VITALS_LOG", title: "Daily Vitals", instructions: "Record blood pressure and temperature.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "postop-d7-wound", stageNumber: 2, dayOffset: 7, taskType: "WOUND_PHOTO", title: "1-Week Wound Photo", instructions: "Upload a well-lit photo of the incision for clinical review.", requiredSource: null, scheduleTimeOfDay: "15:00" },

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
      { templateId: "mat-d1-bp", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d1-feed", stageNumber: 1, dayOffset: 1, taskType: "DIET_LOG", title: "Infant Feeding Log", instructions: "Log feeding frequency and infant latch.", requiredSource: null, scheduleTimeOfDay: "12:00" },
      { templateId: "mat-d2-bp", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d3-bp", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d4-bp", stageNumber: 1, dayOffset: 4, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d5-bp", stageNumber: 1, dayOffset: 5, taskType: "VITALS_LOG", title: "Maternal Blood Pressure", instructions: "Check resting blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d7-bp", stageNumber: 1, dayOffset: 7, taskType: "VITALS_LOG", title: "Week 1 Blood Pressure", instructions: "Record blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d7-wound", stageNumber: 1, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Perineal / C-Section Incision Check", instructions: "Inspect wound for swelling, redness, or discharge.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      { templateId: "mat-d10-bp", stageNumber: 2, dayOffset: 10, taskType: "VITALS_LOG", title: "Day 10 Blood Pressure", instructions: "Record blood pressure.", requiredSource: null, scheduleTimeOfDay: "09:00" },
      { templateId: "mat-d14-epds", stageNumber: 2, dayOffset: 14, taskType: "QUESTIONNAIRE", title: "Edinburgh Postnatal Depression Screen (EPDS)", instructions: "Complete the 10-question maternal wellbeing screener.", requiredSource: null, scheduleTimeOfDay: "15:00" },
      { templateId: "mat-d21-lac", stageNumber: 2, dayOffset: 21, taskType: "EDUCATION", title: "Lactation & Nutrition Guidance", instructions: "Review maternal caloric and hydration recommendations.", requiredSource: null, scheduleTimeOfDay: "11:00" },

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
      { templateId: "cabg-d1-vitals", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse before cardiac medications.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d1-weight", stageNumber: 1, dayOffset: 1, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking after voiding.", requiredSource: null, scheduleTimeOfDay: "08:15" },
      { templateId: "cabg-d1-sternum", stageNumber: 1, dayOffset: 1, taskType: "WOUND_PHOTO", title: "Sternal Incision Inspection", instructions: "Check sternal incision for instability, separation, or discharge.", requiredSource: null, scheduleTimeOfDay: "12:00" },

      { templateId: "cabg-d2-vitals", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d2-weight", stageNumber: 1, dayOffset: 2, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      { templateId: "cabg-d3-vitals", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning BP & Heart Rate", instructions: "Record resting blood pressure and pulse.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d3-weight", stageNumber: 1, dayOffset: 3, taskType: "VITALS_LOG", title: "Morning Fasting Weight", instructions: "Weigh yourself upon waking.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      { templateId: "cabg-d7-vitals", stageNumber: 1, dayOffset: 7, taskType: "VITALS_LOG", title: "Week 1 Cardiac Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d7-wound", stageNumber: 1, dayOffset: 7, taskType: "WOUND_PHOTO", title: "Sternal & Leg Vein Harvest Site Photo", instructions: "Upload photos of sternal and leg incisions.", requiredSource: null, scheduleTimeOfDay: "14:00" },

      { templateId: "cabg-d14-vitals", stageNumber: 1, dayOffset: 14, taskType: "VITALS_LOG", title: "Day 14 Cardiac Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },
      { templateId: "cabg-d14-weight", stageNumber: 1, dayOffset: 14, taskType: "VITALS_LOG", title: "Day 14 Weight", instructions: "Record morning weight.", requiredSource: null, scheduleTimeOfDay: "08:15" },

      { templateId: "cabg-d15-exercise", stageNumber: 2, dayOffset: 15, taskType: "EXERCISE", title: "Phase II Graded Walking (15 mins)", instructions: "Walk at target heart rate (HR < resting + 20 bpm).", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "cabg-d20-diet", stageNumber: 2, dayOffset: 20, taskType: "DIET_LOG", title: "Sodium & Fluid Intake Review", instructions: "Log daily sodium (< 2000 mg) and fluid volume.", requiredSource: null, scheduleTimeOfDay: "18:00" },
      { templateId: "cabg-d30-vitals", stageNumber: 2, dayOffset: 30, taskType: "VITALS_LOG", title: "1-Month Comprehensive Vitals", instructions: "Record resting BP and HR.", requiredSource: null, scheduleTimeOfDay: "08:00" },

      { templateId: "cabg-d45-exercise", stageNumber: 3, dayOffset: 45, taskType: "EXERCISE", title: "Aerobic Conditioning (25 mins)", instructions: "Continuous brisk walking or stationary cycling.", requiredSource: null, scheduleTimeOfDay: "10:00" },
      { templateId: "cabg-d60-quest", stageNumber: 3, dayOffset: 60, taskType: "QUESTIONNAIRE", title: "2-Month Angina & Dyspnea Questionnaire", instructions: "Report any exertional shortness of breath or chest discomfort.", requiredSource: null, scheduleTimeOfDay: "14:00" },

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
