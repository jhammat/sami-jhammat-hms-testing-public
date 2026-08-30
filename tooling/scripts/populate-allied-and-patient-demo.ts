import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Demo population is disabled in production.");
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function daysAhead(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

function at(dayOffset: number, hour: number): Date {
  const date = new Date(Date.now() + dayOffset * 86_400_000);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main(): Promise<void> {
  const [{ database }, { hashPassword }] = await Promise.all([
    import("../../packages/database/src/index.js"),
    import("../../apps/web/src/lib/auth/password.js"),
  ]);

  const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";
  const passwordHash = await hashPassword(password);

  const tenant = await database.tenant.findUniqueOrThrow({ where: { slug: "wonflow-development" } });
  const organization = await database.organization.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const branch = await database.branch.findFirstOrThrow({ where: { tenantId: tenant.id, isMainBranch: true } });
  const tenantId = tenant.id;

  console.log("Populating Allied Health (Physiotherapy, Nutrition) & Patient Portal for tenant:", tenant.slug);

  // 1. Ensure Identities & Memberships for Allied Health & Patient
  const accounts = [
    { key: "physiotherapist", roleCode: "PHYSIOTHERAPIST", name: "Hina Raza", title: "Senior Physiotherapist", staffType: "PHYSIOTHERAPIST" },
    { key: "nutritionist", roleCode: "NUTRITIONIST", name: "Bilal Ahmed", title: "Clinical Dietitian", staffType: "NUTRITIONIST" },
    { key: "doctor", roleCode: "DOCTOR", name: "Dr. Ayesha Rahman", title: "Doctor", staffType: "DOCTOR" },
    { key: "patient", roleCode: "PATIENT", name: "Fatima Khan", title: "Patient", staffType: null },
  ] as const;

  const staffProfiles = new Map<string, string>();
  const memberships = new Map<string, { membershipId: string; identityId: string }>();

  for (const acc of accounts) {
    const email = `${acc.key}@wonflow.local`;
    const identity = await database.identity.upsert({
      where: { normalizedEmail: email },
      create: {
        email,
        normalizedEmail: email,
        passwordHash,
        mustChangePassword: false,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
      update: { passwordHash, mustChangePassword: false, status: "ACTIVE" },
    });

    const membership = await database.tenantMembership.upsert({
      where: { tenantId_identityId: { tenantId, identityId: identity.id } },
      create: {
        tenantId,
        identityId: identity.id,
        organizationId: organization.id,
        primaryBranchId: branch.id,
        displayName: acc.name,
        status: "ACTIVE",
        workspaceCodes: [acc.roleCode],
        primaryWorkspace: acc.roleCode,
      },
      update: { displayName: acc.name, status: "ACTIVE", workspaceCodes: [acc.roleCode], primaryWorkspace: acc.roleCode },
    });

    memberships.set(acc.key, { membershipId: membership.id, identityId: identity.id });

    if (acc.staffType) {
      const staff = await database.staffProfile.upsert({
        where: { membershipId: membership.id },
        create: {
          tenantId,
          membershipId: membership.id,
          branchId: branch.id,
          employeeNumber: `DEV-${acc.key.toUpperCase()}-001`,
          staffType: acc.staffType as never,
          status: "ACTIVE",
          title: acc.title,
        },
        update: { branchId: branch.id, staffType: acc.staffType as never, status: "ACTIVE", title: acc.title },
      });
      staffProfiles.set(acc.key, staff.id);
    }
  }

  // 2. Fetch or Create Primary Demo Patient Fatima Khan (DEV-0001)
  const patient = await database.patient.upsert({
    where: { tenantId_patientNumber: { tenantId, patientNumber: "DEV-0001" } },
    create: {
      tenantId,
      patientNumber: "DEV-0001",
      givenName: "Fatima",
      familyName: "Khan",
      dateOfBirth: new Date("1990-04-12T00:00:00.000Z"),
      sex: "female",
      phone: "+923008472910",
      normalizedPhone: "+923008472910",
      email: "patient@wonflow.local",
      normalizedEmail: "patient@wonflow.local",
      address: { line1: "House 42, Block B-3, Gulberg III", city: "Lahore", state: "Punjab", country: "Pakistan" },
      status: "ACTIVE",
    },
    update: { status: "ACTIVE", email: "patient@wonflow.local", normalizedEmail: "patient@wonflow.local" },
  });

  const patientIdentity = memberships.get("patient")!;
  await database.patientAccess.upsert({
    where: { patientId_identityId: { patientId: patient.id, identityId: patientIdentity.identityId } },
    create: { patientId: patient.id, identityId: patientIdentity.identityId, relationship: "self", isPrimary: true, isActive: true },
    update: { isActive: true, isPrimary: true },
  });

  const doctorProfile = await database.doctorProfile.findFirst({
    where: { tenantId, staffProfile: { membership: { identity: { normalizedEmail: "doctor@wonflow.local" } } } },
  });

  /*
   * Every referral and care plan below needs a referring doctor, and both
   * foreign keys are NOT NULL — `ClinicalReferral.referringDoctorId` and
   * `CarePlan.managingDoctorId`. The three call sites used to fall back to a
   * null id, which does not type-check and could not have worked at run time
   * either: Prisma would have rejected the insert on a constraint violation
   * several hundred lines further down, with nothing to say that the seeded
   * doctor was simply missing. Failing here says it once, in the place that
   * can be acted on.
   */
  if (!doctorProfile) {
    throw new Error(
      "No doctor profile found for doctor@wonflow.local. Run `pnpm db:seed:dev` first — " +
        "the referrals and care plan seeded below are all attributed to that doctor.",
    );
  }

  // Ensure Allied Health clinicians have patient access
  for (const key of ["physiotherapist", "nutritionist"] as const) {
    const member = memberships.get(key)!;
    const existingAccess = await database.patientAccess.findFirst({
      where: { patientId: patient.id, identityId: member.identityId },
    });
    if (!existingAccess) {
      await database.patientAccess.create({
        data: {
          patientId: patient.id,
          identityId: member.identityId,
          relationship: "care-team-allied",
          isActive: true,
          accessReason: `Referral ${key === "physiotherapist" ? "PHYSIOTHERAPY" : "NUTRITION"} accepted`,
          permissions: ["observations.write", "careplan.complete"],
        },
      });
    }
  }

  // 3. Populate Clinical Referrals for Fatima Khan
  console.log("→ Seeding Clinical Referrals...");
  const physioStaffId = staffProfiles.get("physiotherapist")!;
  const dietitianStaffId = staffProfiles.get("nutritionist")!;

  let physioReferral = await database.clinicalReferral.findFirst({
    where: { tenantId, patientId: patient.id, specialty: "PHYSIOTHERAPY" },
  });

  if (!physioReferral) {
    physioReferral = await database.clinicalReferral.create({
      data: {
        tenantId,
        patientId: patient.id,
        referringDoctorId: doctorProfile.id,
        assignedToId: physioStaffId,
        specialty: "PHYSIOTHERAPY",
        discipline: "PHYSIOTHERAPY",
        status: "ACCEPTED",
        priority: "URGENT",
        reason: "Post-operative Whipple mobility & respiratory rehabilitation",
        goal: "Independent corridor ambulation (100m) and incentive spirometry > 1500mL by POD 5",
        surgicalSummary: "Pancreaticoduodenectomy (Whipple), midline laparotomy, subhepatic JP drain in situ",
        precautions: "Maintain abdominal binder; check drain line tension before transfers",
        validFrom: daysAgo(5),
        validUntil: daysAhead(30),
      },
    });
  } else {
    physioReferral = await database.clinicalReferral.update({
      where: { id: physioReferral.id },
      data: {
        assignedToId: physioStaffId,
        status: "ACCEPTED",
        validFrom: daysAgo(5),
        validUntil: daysAhead(30),
        reason: "Post-operative Whipple mobility & respiratory rehabilitation",
      },
    });
  }

  let nutritionReferral = await database.clinicalReferral.findFirst({
    where: { tenantId, patientId: patient.id, specialty: "NUTRITION" },
  });

  if (!nutritionReferral) {
    nutritionReferral = await database.clinicalReferral.create({
      data: {
        tenantId,
        patientId: patient.id,
        referringDoctorId: doctorProfile.id,
        assignedToId: dietitianStaffId,
        specialty: "NUTRITION",
        discipline: "NUTRITION",
        status: "ACCEPTED",
        priority: "URGENT",
        reason: "Post-pancreatectomy dietary progression and PERT (Creon) enzyme titration",
        goal: "Tolerate Phase 3 soft diet with optimized pancreatic enzyme replacement (PERT)",
        surgicalSummary: "Pancreaticoduodenectomy POD 2, transitioning to oral nutrition",
        precautions: "Low-fat restriction (< 20g/day); Creon 25,000 IU with all meals and snacks",
        validFrom: daysAgo(5),
        validUntil: daysAhead(30),
      },
    });
  } else {
    nutritionReferral = await database.clinicalReferral.update({
      where: { id: nutritionReferral.id },
      data: {
        assignedToId: dietitianStaffId,
        status: "ACCEPTED",
        validFrom: daysAgo(5),
        validUntil: daysAhead(30),
        reason: "Post-pancreatectomy dietary progression and PERT (Creon) enzyme titration",
      },
    });
  }

  // 4. Populate Physiotherapy Historical Assessments and Rehabilitation Sessions
  console.log("→ Seeding Physiotherapy Assessments & Sessions...");
  await database.therapyAssessment.deleteMany({ where: { tenantId, patientId: patient.id } });
  await database.therapySession.deleteMany({ where: { tenantId, patientId: patient.id } });

  const physioAssessments = [
    { day: -4, mobility: 2, pain: 7, level: "BED_BOUND", resp: "800 mL, shallow, splinting", notes: "First post-op assessment in HDU. Encouraged deep breathing with abdominal support." },
    { day: -3, mobility: 3, pain: 6, level: "CHAIR_TRANSFER", resp: "1000 mL, improving", notes: "Assisted bed-to-chair transfer performed successfully. Sat upright for 45 minutes." },
    { day: -2, mobility: 5, pain: 5, level: "ASSISTED_AMBULATION", resp: "1250 mL, clear bilateral", notes: "Corridor ambulation with light walking frame (30 metres). Good posture." },
    { day: -1, mobility: 6, pain: 3, level: "ASSISTED_AMBULATION", resp: "1400 mL, clear bilateral", notes: "Completed 75m walk with one physical therapist assist. No dizziness." },
    { day: 0, mobility: 8, pain: 2, level: "INDEPENDENT_AMBULATION", resp: "1550 mL, clear bilateral", notes: "Achieved 120 metres independent walking in corridor. Target exceeded." },
  ];

  for (const entry of physioAssessments) {
    await database.therapyAssessment.create({
      data: {
        tenantId,
        patientId: patient.id,
        assessedByStaffId: physioStaffId,
        referralId: physioReferral.id,
        assessedAt: at(entry.day, 11),
        mobilityScore: entry.mobility,
        painScore: entry.pain,
        respiratoryFunction: entry.resp,
        independenceLevel: entry.level as never,
        surgicalRestrictions: "Maintain abdominal binder; check drain line tension before transfers",
        baselineNotes: entry.notes,
        goals: "Independent corridor ambulation 100 m by POD 5",
      },
    });
  }

  const physioSessions = [
    { day: -4, status: "COMPLETED", before: 7, after: 6, spiro: 850, steps: 30, notes: "Deep diaphragmatic breathing & ankle pumps in bed." },
    { day: -3, status: "COMPLETED", before: 6, after: 4, spiro: 1050, steps: 80, notes: "Bed-to-chair transfer and seated posture alignment." },
    { day: -2, status: "PATIENT_UNWELL", before: 6, after: 6, spiro: 950, steps: 0, notes: "Mild post-op nausea; session adapted for gentle bed mobility only." },
    { day: -1, status: "COMPLETED", before: 4, after: 3, spiro: 1400, steps: 160, notes: "Corridor walking and incentive spirometry sets completed." },
    { day: 0, status: "COMPLETED", before: 3, after: 2, spiro: 1550, steps: 240, notes: "Full independent mobility circuit completed without fatigue." },
  ];

  for (const entry of physioSessions) {
    await database.therapySession.create({
      data: {
        tenantId,
        patientId: patient.id,
        conductedByStaffId: physioStaffId,
        sessionDate: at(entry.day, 15),
        attendanceStatus: entry.status as never,
        painBefore: entry.before,
        painAfter: entry.after,
        spirometryAchievedMl: entry.spiro,
        stepsAchieved: entry.steps,
        progressNotes: entry.notes,
      },
    });
  }

  // 5. Populate Clinical Nutrition Assessments & Structured Meal Plans
  console.log("→ Seeding Nutrition Assessments & Dietary Meal Plans...");
  const existingPlans = await database.nutritionPlan.findMany({ where: { tenantId, patientId: patient.id }, select: { id: true } });
  if (existingPlans.length > 0) {
    await database.nutritionPlanItem.deleteMany({ where: { tenantId, planId: { in: existingPlans.map((p) => p.id) } } });
    await database.nutritionPlan.deleteMany({ where: { tenantId, patientId: patient.id } });
  }
  await database.nutritionAssessment.deleteMany({ where: { tenantId, patientId: patient.id } });

  const nutritionAssessments = [
    { day: -4, weight: 61.5, appetite: 2, gi: "Nil by mouth (POD 1)", notes: "Awaiting resolution of post-op ileus. Sips of water allowed." },
    { day: -3, weight: 60.8, appetite: 3, gi: "Clear liquid diet tolerated", notes: "Tolerated apple juice and clear electrolyte broth." },
    { day: -2, weight: 60.2, appetite: 4, gi: "Full liquid diet, mild early fullness", notes: "Skimmed milk, strained soups. Creon 10k IU introduced with liquids." },
    { day: -1, weight: 59.8, appetite: 5, gi: "No steatorrhoea, good GI tolerance", notes: "Progressed to low-fat pureed soft diet with Creon 25k IU per meal." },
    { day: 0, weight: 59.5, appetite: 7, gi: "Excellent tolerance, no bloating", notes: "Phase 3 Pancreatic Soft Diet established with Creon 25k IU titration." },
  ];

  for (const entry of nutritionAssessments) {
    await database.nutritionAssessment.create({
      data: {
        tenantId,
        patientId: patient.id,
        assessedByStaffId: dietitianStaffId,
        referralId: nutritionReferral.id,
        assessedAt: at(entry.day, 12),
        weightKg: entry.weight,
        heightCm: 165,
        bmi: Number((entry.weight / 1.65 ** 2).toFixed(1)),
        weightChangeSinceSurgeryKg: Number((entry.weight - 61.5).toFixed(1)),
        appetiteScore: entry.appetite,
        giSymptoms: entry.gi,
        enzymeRequirement: true,
        notes: entry.notes,
      },
    });
  }

  const nutritionPlan = await database.nutritionPlan.create({
    data: {
      tenantId,
      patientId: patient.id,
      createdByStaffId: dietitianStaffId,
      title: "Post-Operative Whipple Pancreatic Dietary Recovery Plan",
      startDate: daysAgo(2),
      phase: "Phase 3: Soft / Low-Fat Pancreatic Diet",
      caloricTargetKcal: 1900,
      proteinTargetGrams: 85,
      fluidTargetMl: 2200,
      foodsToAvoid: "Fried oily foods, parathas, ghee, whole cream dairy, raw carbonated drinks, excess caffeine",
      isActive: true,
    },
  });

  const planItems = [
    { type: "MEAL", name: "Oatmeal porridge with skimmed milk and sliced banana", time: "Breakfast", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin Capsules)", time: "Breakfast", qty: 1, unit: "capsule", withMeal: true },
    { type: "SNACK", name: "High-Protein Skimmed Greek Yoghurt & Boiled Egg White", time: "Mid-Morning", qty: 150, unit: "grams", withMeal: false },
    { type: "MEAL", name: "Steamed Chicken Breast, Boiled White Rice & Stewed Zucchini", time: "Lunch", qty: 1, unit: "plate", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin Capsules)", time: "Lunch", qty: 1, unit: "capsule", withMeal: true },
    { type: "SNACK", name: "Fresh Papaya slices with digestive biscuits", time: "Evening", qty: 1, unit: "serving", withMeal: false },
    { type: "MEAL", name: "Lentil Khichdi (Moong Dal & Soft Rice) with Clear Chicken Broth", time: "Dinner", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin Capsules)", time: "Dinner", qty: 1, unit: "capsule", withMeal: true },
  ];

  for (const [index, item] of planItems.entries()) {
    await database.nutritionPlanItem.create({
      data: {
        tenantId,
        planId: nutritionPlan.id,
        itemType: item.type as never,
        name: item.name,
        instruction: item.withMeal ? `Take with the first bite of ${item.time.toLowerCase()}.` : "Chew thoroughly and drink water 30 mins after.",
        timeOfDay: item.time,
        quantity: item.qty,
        unit: item.unit,
        withMeal: item.withMeal,
        displayOrder: index,
      },
    });
  }

  // 6. Populate Patient Portal Care Plans, Vitals, Symptoms, Education & Tasks
  console.log("→ Seeding Patient Portal Care Plan, Vitals & Daily Tasks...");
  const existingCarePlans = await database.carePlan.findMany({ where: { tenantId, patientId: patient.id }, select: { id: true } });
  if (existingCarePlans.length > 0) {
    await database.carePlanTask.deleteMany({ where: { tenantId, carePlanId: { in: existingCarePlans.map((cp) => cp.id) } } });
    await database.carePlan.deleteMany({ where: { tenantId, patientId: patient.id } });
  }
  await database.clinicalObservation.deleteMany({ where: { tenantId, patientId: patient.id } });
  await database.symptomLog.deleteMany({ where: { tenantId, patientId: patient.id } });

  const carePlan = await database.carePlan.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      category: "WHIPPLE_RECOVERY",
      title: "Whipple Recovery — Post-Operative Day 5 Onward",
      status: "ACTIVE",
      startDate: daysAgo(5),
      currentStage: 2,
      managingDoctorId: doctorProfile.id,
      assignedTherapistId: physioStaffId,
      assignedNutritionistId: dietitianStaffId,
    },
  });

  const dailyTasks = [
    { type: "MEDICATION", hour: 8, title: "Morning Creon (25,000 IU) & Breakfast", instructions: "Take 1 Creon capsule with the very first bite of breakfast." },
    { type: "EXERCISE", hour: 10, title: "Morning Incentive Spirometry (10 Breaths)", instructions: "Perform 10 sustained maximal inspirations. Aim for >1400 mL." },
    { type: "VITALS_LOG", hour: 11, title: "Record Vitals & Blood Pressure", instructions: "Measure temperature, pulse and blood pressure." },
    { type: "MEAL", hour: 13, title: "Lunch — Soft Pancreatic Low-Fat Diet", instructions: "Steamed chicken breast with white rice & boiled zucchini." },
    { type: "MEDICATION", hour: 13, title: "Lunch Creon (25,000 IU)", instructions: "Take 1 Creon capsule with the very first bite of lunch." },
    { type: "EXERCISE", hour: 16, title: "Corridor Ambulation Walking Session", instructions: "Walk 100 metres in the corridor wearing your abdominal binder." },
    { type: "QUESTIONNAIRE", hour: 19, title: "Evening Recovery & Symptom Check-in", instructions: "Rate pain, appetite, digestion, and drain output." },
  ];

  for (const [index, task] of dailyTasks.entries()) {
    await database.carePlanTask.create({
      data: {
        tenantId: tenant.id,
        carePlanId: carePlan.id,
        taskType: task.type as never,
        stageNumber: 2,
        dayNumber: 5,
        scheduledFor: at(0, task.hour),
        dueBy: at(0, task.hour + 2),
        title: task.title,
        instructions: task.instructions,
        status: index < 3 ? "COMPLETED" : "PENDING",
        completedAt: index < 3 ? at(0, task.hour) : null,
        completedByIdentityId: index < 3 ? patientIdentity.identityId : null,
      },
    });
  }

  // Clinical Vitals Observations
  const vitalsSeries = [
    { code: "temperature", display: "Body Temperature", unit: "°C", series: [37.8, 37.5, 37.2, 37.0, 36.8] },
    { code: "blood_pressure_systolic", display: "Systolic Blood Pressure", unit: "mmHg", series: [136, 132, 128, 124, 120] },
    { code: "blood_pressure_diastolic", display: "Diastolic Blood Pressure", unit: "mmHg", series: [86, 84, 82, 80, 78] },
    { code: "heart_rate", display: "Heart Rate", unit: "bpm", series: [96, 90, 86, 82, 76] },
    { code: "oxygen_saturation", display: "Oxygen Saturation", unit: "%", series: [94, 95, 96, 97, 98] },
  ];

  for (const vital of vitalsSeries) {
    for (const [idx, value] of vital.series.entries()) {
      await database.clinicalObservation.create({
        data: {
          tenantId,
          patientId: patient.id,
          code: vital.code,
          display: vital.display,
          valueNumber: value,
          unit: vital.unit,
          status: "PRELIMINARY",
          source: "PATIENT",
          recordedByIdentityId: patientIdentity.identityId,
          observedAt: at(idx - 4, 8),
        },
      });
    }
  }

  // Symptom Logs (Pain, Nausea, Appetite)
  const symptoms = [
    { code: "abdominal_pain", name: "Incision Pain", series: [7, 6, 4, 3, 2] },
    { code: "nausea", name: "Post-Op Nausea", series: [6, 4, 3, 1, 0] },
    { code: "appetite_loss", name: "Loss of Appetite", series: [8, 6, 4, 3, 2] },
  ];

  for (const s of symptoms) {
    for (const [idx, score] of s.series.entries()) {
      await database.symptomLog.create({
        data: {
          tenantId,
          patientId: patient.id,
          recordedAt: at(idx - 4, 19),
          symptomCode: s.code,
          symptomName: s.name,
          severityScore: score,
          severityLabel: score >= 7 ? "SEVERE" : score >= 4 ? "MODERATE" : "MILD",
          source: "PATIENT",
          recordedByIdentityId: patientIdentity.identityId,
        },
      });
    }
  }

  console.log("\n========================================================");
  console.log("✅ POPULATION COMPLETED SUCCESSFULLY!");
  console.log("========================================================");
  console.log("Physiotherapist portal, Nutritionist portal, and Patient portal are now fully loaded with real interactive data!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Population error:", err);
    process.exit(1);
  });
