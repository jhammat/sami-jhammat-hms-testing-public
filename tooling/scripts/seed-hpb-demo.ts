import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Demo seeding is disabled in production.");
}

/**
 * A single, joined-up HPB surgical demo.
 *
 * Every portal in this seed looks at the SAME patient through a different
 * window, because that is the only way to demonstrate the product honestly:
 * the surgeon raises the referrals, the therapist and dietitian work the
 * patient they were referred, and the tasks they push land on the patient's
 * own phone screen. Seeding four disconnected islands of data would show
 * four screens that each look plausible and prove nothing.
 *
 * Two constraints shaped how this is written:
 *
 * 1. Allied access is referral-scoped and time-bound. A therapist can only
 *    open a record they hold a live, unexpired referral for, so the
 *    referrals here are ACCEPTED, assigned to the seeded therapist, and
 *    carry a validUntil in the future. Without that the portals would be
 *    correctly empty.
 *
 * 2. Nothing reaches the patient's phone without an ACTIVE care plan. Meals,
 *    enzyme doses and exercises become CarePlanTasks hanging off that plan,
 *    so the plan is created first and everything else attaches to it.
 *
 * Re-runnable: it deletes and rebuilds its own tenant, and touches no other.
 */

const DEMO_SLUG = "hpb-demo";
const PASSWORD = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";

const ACCOUNTS = [
  { key: "admin", workspace: "ADMIN", name: "Dr Imran Shah", title: "Hospital Administrator" },
  { key: "surgeon", workspace: "DOCTOR", name: "Dr Ayesha Malik", title: "Consultant HPB Surgeon" },
  { key: "physio", workspace: "PHYSIOTHERAPIST", name: "Hina Raza", title: "Senior Physiotherapist" },
  { key: "dietitian", workspace: "NUTRITIONIST", name: "Bilal Ahmed", title: "Clinical Dietitian" },
  { key: "patient", workspace: "PATIENT", name: "Muhammad Yousaf", title: "Patient" },
] as const;

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

  const { WORKSPACE_PERMISSION_CODES: workspacePermissions } = (await import(
    "../../apps/web/src/server/access/workspace-roles.js"
  )) as { WORKSPACE_PERMISSION_CODES: Record<string, readonly string[]> };

  const { PLATFORM_MODULE_CODES } = (await import(
    "../../apps/web/src/server/access/workspace-modules.js"
  )) as { PLATFORM_MODULE_CODES: readonly string[] };

  const passwordHash = await hashPassword(PASSWORD);

  /* ---------------------------------------------------------------
     Rebuild the demo tenant from scratch, leaving every other tenant
     alone. Deleting by tenantId is what keeps this re-runnable.
     --------------------------------------------------------------- */

  const existing = await database.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (existing) {
    // Deleting tenant-scoped rows table by table hits foreign keys in
    // whatever order the catalogue happens to list them --
    // ClinicalReferral.referringDoctorId still pointed at DoctorProfile when
    // that table's turn came round. Rather than hand-maintain a correct
    // order across 90-odd tables, foreign key triggers are suspended for the
    // duration of the wipe and restored immediately after. Nothing outside
    // this tenant is touched, and the tenant is rebuilt whole straight
    // afterwards, so there is no window where a dangling reference survives.
    await database.$executeRawUnsafe(
      `DO $$
       DECLARE t text; tid uuid := '${existing.id}';
       BEGIN
         SET CONSTRAINTS ALL DEFERRED;
         PERFORM set_config('session_replication_role', 'replica', true);
         FOR t IN
           SELECT c.relname FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = c.oid
           WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attname = 'tenantId'
         LOOP
           EXECUTE format('DELETE FROM public.%I WHERE "tenantId" = $1', t) USING tid;
         END LOOP;
         PERFORM set_config('session_replication_role', 'origin', true);
       END $$;`,
    );
    await database.identity.deleteMany({
      where: { normalizedEmail: { endsWith: `@${DEMO_SLUG}.wonflow.local` } },
    });
    await database.tenant.delete({ where: { id: existing.id } });
  }

  const tenant = await database.tenant.create({
    data: { slug: DEMO_SLUG, displayName: "PKLI HPB Surgical Demo", status: "ACTIVE" },
  });

  const organization = await database.organization.create({
    data: { tenantId: tenant.id, code: "MAIN", displayName: "PKLI HPB Surgical Demo" },
  });

  const branch = await database.branch.create({
    data: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: "MAIN",
      name: "PKLI Main Campus",
      isMainBranch: true,
    },
  });

  // Every module on: a demo that hides half its portals is not a demo.
  for (const moduleCode of PLATFORM_MODULE_CODES) {
    await database.tenantEntitlement.create({
      data: { tenantId: tenant.id, moduleCode, enabled: true },
    });
  }

  /* ---- Roles and permissions, from the same map the real app uses ---- */

  const allPermissions = [...new Set(Object.values(workspacePermissions).flat())];
  for (const code of allPermissions) {
    await database.permission.upsert({
      where: { code },
      create: { code, category: code.split(".")[0]!, label: code },
      update: {},
    });
  }

  const roleByWorkspace = new Map<string, string>();
  for (const [workspace, codes] of Object.entries(workspacePermissions)) {
    const role = await database.role.create({
      data: {
        tenantId: tenant.id,
        code: workspace,
        name: workspace.charAt(0) + workspace.slice(1).toLowerCase(),
        description: `${workspace} workspace role`,
      },
    });
    roleByWorkspace.set(workspace, role.id);

    for (const code of codes) {
      const permission = await database.permission.findUnique({ where: { code } });
      if (!permission) continue;
      await database.rolePermission.create({
        data: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id, effect: "ALLOW" },
      });
    }
  }

  /* ---- Accounts ---- */

  const memberships = new Map<string, { identityId: string; membershipId: string; email: string }>();

  for (const account of ACCOUNTS) {
    const email = `${account.key}@${DEMO_SLUG}.wonflow.local`;

    const identity = await database.identity.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash,
        status: "ACTIVE",
        // A demo you have to reset a password to enter is not a demo.
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    });

    const membership = await database.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        identityId: identity.id,
        organizationId: organization.id,
        primaryBranchId: branch.id,
        displayName: account.name,
        status: "ACTIVE",
        workspaceCodes: [account.workspace as never],
        primaryWorkspace: account.workspace as never,
      },
    });

    const roleId = roleByWorkspace.get(account.workspace);
    if (roleId) {
      await database.membershipRole.create({
        data: { tenantId: tenant.id, membershipId: membership.id, roleId },
      });
    }

    memberships.set(account.key, {
      identityId: identity.id,
      membershipId: membership.id,
      email,
    });
  }

  /* ---- Staff profiles ---- */

  const staffProfiles = new Map<string, string>();
  for (const account of ACCOUNTS) {
    if (account.workspace === "PATIENT") continue;
    const member = memberships.get(account.key)!;

    const staff = await database.staffProfile.create({
      data: {
        tenantId: tenant.id,
        membershipId: member.membershipId,
        branchId: branch.id,
        employeeNumber: `HPB-${account.key.toUpperCase()}-001`,
        staffType: account.workspace,
        title: account.title,
        status: "ACTIVE",
      },
    });
    staffProfiles.set(account.key, staff.id);
  }

  const department = await database.department.create({
    data: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: "HPB",
      name: "Hepato-Pancreato-Biliary Surgery",
      isActive: true,
    },
  });

  const surgeonProfile = await database.doctorProfile.create({
    data: {
      tenantId: tenant.id,
      staffProfileId: staffProfiles.get("surgeon")!,
      departmentId: department.id,
      specialty: "Hepato-Pancreato-Biliary Surgery",
      registrationNumber: "PMDC-HPB-44120",
      qualifications: "MBBS, FCPS (Surgery), Fellowship HPB & Liver Transplant",
      biography:
        "Consultant HPB surgeon. Practice is largely pancreaticoduodenectomy and hepatectomy, with structured post-operative recovery run through the WonFlow care plan engine.",
      durationMinutes: 20,
      publiclyBookable: true,
    },
  });

  /* ---- The patient ---- */

  const patientAccount = memberships.get("patient")!;

  const patient = await database.patient.create({
    data: {
      tenantId: tenant.id,
      patientNumber: "HPB-0001",
      givenName: "Muhammad",
      familyName: "Yousaf",
      dateOfBirth: new Date("1957-04-18"),
      sex: "MALE",
      phone: "+923001234567",
      email: patientAccount.email,
      normalizedEmail: patientAccount.email,
      status: "ACTIVE",
    },
  });

  await database.patientAccess.create({
    data: {
      patientId: patient.id,
      identityId: patientAccount.identityId,
      relationship: "self",
      isActive: true,
      isPrimary: true,
      accessReason: "Patient portal account",
      permissions: ["observations.write", "careplan.complete"],
    },
  });

  console.log("→ tenant, staff and patient created");

  /* ---------------------------------------------------------------
     The care plan. Created BEFORE the referrals, because everything the
     therapist and dietitian push later becomes a task on this plan.
     --------------------------------------------------------------- */

  const carePlan = await database.carePlan.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      category: "WHIPPLE_RECOVERY",
      title: "Whipple recovery — post-operative day 4 onward",
      status: "ACTIVE",
      startDate: daysAgo(4),
      currentStage: 2,
      managingDoctorId: surgeonProfile.id,
      assignedTherapistId: staffProfiles.get("physio")!,
      assignedNutritionistId: staffProfiles.get("dietitian")!,
    },
  });

  /* ---- Referrals: ACCEPTED, assigned, and in date ---- */

  const referralCommon = {
    tenantId: tenant.id,
    patientId: patient.id,
    referringDoctorId: surgeonProfile.id,
    status: "ACCEPTED" as const,
    priority: "URGENT" as const,
    acceptedAt: daysAgo(3),
    validFrom: daysAgo(4),
    // Time-bound on purpose: the access guard rejects an expired referral,
    // so a demo left running for a month still behaves correctly.
    validUntil: daysAhead(60),
  };

  await database.clinicalReferral.create({
    data: {
      ...referralCommon,
      specialty: "PHYSIOTHERAPY",
      discipline: "PHYSIOTHERAPY",
      assignedToId: staffProfiles.get("physio")!,
      reason: "Post-operative Whipple mobility and respiratory rehabilitation",
      goal: "Independent corridor ambulation 100 m and incentive spirometry above 1500 mL by POD 8",
      clinicalSummary: "68-year-old male, POD 4 following pancreaticoduodenectomy. Mobilising with assistance.",
      surgicalSummary: "Pancreaticoduodenectomy (Whipple), midline laparotomy, subhepatic JP drain in situ",
      precautions: "Maintain abdominal binder; check drain line tension before every transfer",
    },
  });

  await database.clinicalReferral.create({
    data: {
      ...referralCommon,
      specialty: "NUTRITION",
      discipline: "NUTRITION",
      assignedToId: staffProfiles.get("dietitian")!,
      reason: "Post-pancreatectomy dietary progression and PERT enzyme titration",
      goal: "Tolerate a Phase 3 soft diet on optimised pancreatic enzyme replacement",
      clinicalSummary: "Weight down 2.5 kg since surgery. Mild early satiety and bloating after meals.",
      surgicalSummary: "Pancreaticoduodenectomy POD 4, transitioning to oral nutrition",
      precautions: "Low fat, under 20 g per day. Creon 25,000 IU with every meal and snack.",
    },
  });

  // The therapists' own referral-scoped access to the record.
  for (const key of ["physio", "dietitian"] as const) {
    const member = memberships.get(key)!;
    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: member.identityId,
        relationship: "care-team-allied",
        isActive: true,
        accessReason: `Referral ${key === "physio" ? "PHYSIOTHERAPY" : "NUTRITION"} accepted`,
        permissions: ["observations.write", "careplan.complete"],
      },
    });
  }

  /* ---- The surgeon's own link to this patient ----
     The doctor portal builds "my patients" from appointments, queue entries
     and encounters for that practitioner -- not from the care plan. Without
     one of those the surgeon who ordered all of this would not see the
     patient in their own list. */

  const followUpService = await database.serviceDefinition.create({
    data: {
      tenantId: tenant.id,
      code: "HPB-FU",
      name: "HPB post-operative follow-up",
      category: "CONSULTATION",
      durationMinutes: 20,
      isActive: true,
    },
  });

  const pastAppointment = await database.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      doctorId: surgeonProfile.id,
      branchId: branch.id,
      serviceId: followUpService.id,
      status: "COMPLETED",
      source: "reception",
      reason: "Post-operative review, day 3",
      startsAt: at(-1, 10),
      endsAt: at(-1, 11),
      checkedInAt: at(-1, 10),
    },
  });

  await database.encounter.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: pastAppointment.id,
      doctorId: surgeonProfile.id,
      branchId: branch.id,
      status: "COMPLETED",
      reason: "Post-operative review, day 3",
      startedAt: at(-1, 10),
      endedAt: at(-1, 11),
      signedAt: at(-1, 11),
    },
  });

  // And an upcoming one, so the doctor's Today screen is not empty either.
  await database.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      doctorId: surgeonProfile.id,
      branchId: branch.id,
      serviceId: followUpService.id,
      status: "CONFIRMED",
      source: "reception",
      reason: "Post-operative review, day 8 — drain removal assessment",
      startsAt: at(2, 11),
      endsAt: at(2, 12),
    },
  });

  console.log("→ care plan and referrals linked");

  /* ---- Today's tasks on the patient's phone ---- */

  const tasks: { type: string; hour: number; title: string; instructions: string }[] = [
    { type: "VITALS_LOG", hour: 8, title: "Morning vitals", instructions: "Blood pressure, pulse, temperature and oxygen saturation." },
    { type: "MEDICATION", hour: 8, title: "Creon 25,000 IU with breakfast", instructions: "Take with the first bite of food, never before." },
    { type: "DRAIN_LOG", hour: 9, title: "Record JP drain output", instructions: "Empty the bulb, record volume and colour, then recharge the suction." },
    { type: "EXERCISE", hour: 10, title: "Incentive spirometry", instructions: "Ten sustained maximal inspirations every waking hour." },
    { type: "MEAL", hour: 13, title: "Lunch — soft pancreatic diet", instructions: "Poached whitefish, mashed potato, steamed courgette." },
    { type: "MEDICATION", hour: 13, title: "Creon 25,000 IU with lunch", instructions: "Take with the first bite of food." },
    { type: "EXERCISE", hour: 16, title: "Assisted corridor walk", instructions: "50 metres with a caregiver. Stop if pain rises above 6/10." },
    { type: "QUESTIONNAIRE", hour: 19, title: "How are you feeling today?", instructions: "Pain, appetite, nausea and bowel function." },
  ];

  const createdTasks: string[] = [];
  for (const [index, task] of tasks.entries()) {
    const row = await database.carePlanTask.create({
      data: {
        tenantId: tenant.id,
        carePlanId: carePlan.id,
        taskType: task.type as never,
        stageNumber: 2,
        dayNumber: 4,
        scheduledFor: at(0, task.hour),
        dueBy: at(0, task.hour + 2),
        title: task.title,
        instructions: task.instructions,
        // The first three are already done, so the patient's ring shows real
        // progress rather than a uniformly empty day.
        status: index < 3 ? "COMPLETED" : "PENDING",
        completedAt: index < 3 ? at(0, task.hour) : null,
        completedByIdentityId: index < 3 ? patientAccount.identityId : null,
      },
    });
    createdTasks.push(row.id);
  }

  /* ---- Vitals: a real series, so the trend line has a shape ---- */

  const vitals = [
    { code: "temperature", display: "Body Temperature", unit: "°C", series: [37.8, 37.5, 37.2, 37.0, 36.9] },
    { code: "blood_pressure_systolic", display: "Systolic Blood Pressure", unit: "mmHg", series: [138, 134, 131, 128, 126] },
    { code: "blood_pressure_diastolic", display: "Diastolic Blood Pressure", unit: "mmHg", series: [88, 85, 83, 81, 80] },
    { code: "heart_rate", display: "Heart Rate", unit: "bpm", series: [98, 94, 90, 86, 84] },
    { code: "oxygen_saturation", display: "Oxygen Saturation", unit: "%", series: [93, 94, 95, 96, 97] },
  ];

  for (const vital of vitals) {
    for (const [index, value] of vital.series.entries()) {
      await database.clinicalObservation.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          code: vital.code,
          display: vital.display,
          valueNumber: value,
          unit: vital.unit,
          // Patient-sourced readings stay PRELIMINARY until a clinician
          // confirms them. That is the platform rule, not a detail.
          status: "PRELIMINARY",
          source: "PATIENT",
          recordedByIdentityId: patientAccount.identityId,
          observedAt: at(index - 4, 8),
        },
      });
    }
  }

  /* ---- Drain: falling output, which is the recovery you want to see ---- */

  const drain = await database.patientDrain.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      label: "JP Drain 1",
      site: "Subhepatic",
      insertedAt: daysAgo(4),
      isActive: true,
      insertedByMembershipId: memberships.get("surgeon")!.membershipId,
      notes: "Placed at the time of pancreaticoduodenectomy.",
    },
  });

  const drainSeries = [
    { volume: 180, colour: "RED", character: "SEROSANGUINOUS", amylase: 320 },
    { volume: 140, colour: "RED", character: "SEROSANGUINOUS", amylase: 240 },
    { volume: 95, colour: "PALE_YELLOW", character: "SEROUS", amylase: 120 },
    { volume: 60, colour: "PALE_YELLOW", character: "SEROUS", amylase: 80 },
    { volume: 45, colour: "PALE_YELLOW", character: "SEROUS", amylase: 55 },
  ];

  for (const [index, entry] of drainSeries.entries()) {
    await database.drainLog.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        drainId: drain.id,
        recordedAt: at(index - 4, 9),
        volumeMl: entry.volume,
        colour: entry.colour as never,
        character: entry.character as never,
        amylaseValue: entry.amylase,
        amylaseUnit: "U/L",
        amylaseSource: "LAB_CONFIRMED",
        source: "PATIENT",
        status: "PRELIMINARY",
        notes: index === 0 ? "First recording after surgery." : null,
      },
    });
  }

  /* ---- Symptoms: pain settling, appetite improving ---- */

  const symptoms = [
    { code: "abdominal_pain", name: "Abdominal pain", series: [7, 6, 5, 4, 3] },
    { code: "nausea", name: "Nausea", series: [5, 4, 4, 2, 2] },
    { code: "appetite_loss", name: "Loss of appetite", series: [8, 7, 6, 5, 4] },
  ];

  for (const symptom of symptoms) {
    for (const [index, score] of symptom.series.entries()) {
      await database.symptomLog.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          recordedAt: at(index - 4, 19),
          symptomCode: symptom.code,
          symptomName: symptom.name,
          severityScore: score,
          severityLabel: score >= 7 ? "SEVERE" : score >= 4 ? "MODERATE" : "MILD",
          source: "PATIENT",
          recordedByIdentityId: patientAccount.identityId,
        },
      });
    }
  }

  console.log("→ patient monitoring data seeded");

  /* ---- Physiotherapy: assessments and sessions ---- */

  const physioStaffId = staffProfiles.get("physio")!;

  const assessments = [
    { day: -4, mobility: 2, pain: 7, level: "BED_BOUND", resp: "800 mL, shallow, splinting" },
    { day: -3, mobility: 3, pain: 6, level: "CHAIR_TRANSFER", resp: "1000 mL, improving" },
    { day: -2, mobility: 4, pain: 5, level: "ASSISTED_AMBULATION", resp: "1200 mL, clear bilateral" },
    { day: -1, mobility: 6, pain: 4, level: "ASSISTED_AMBULATION", resp: "1350 mL, clear bilateral" },
    { day: 0, mobility: 7, pain: 3, level: "INDEPENDENT_AMBULATION", resp: "1500 mL, clear bilateral" },
  ];

  for (const entry of assessments) {
    await database.therapyAssessment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        assessedByStaffId: physioStaffId,
        assessedAt: at(entry.day, 11),
        mobilityScore: entry.mobility,
        painScore: entry.pain,
        respiratoryFunction: entry.resp,
        independenceLevel: entry.level as never,
        surgicalRestrictions: "Maintain abdominal binder; check drain line tension before transfers",
        goals: "Independent corridor ambulation 100 m by POD 8",
      },
    });
  }

  const sessions = [
    { day: -4, status: "COMPLETED", before: 7, after: 6, spiro: 800, steps: 20 },
    { day: -3, status: "COMPLETED", before: 6, after: 4, spiro: 1000, steps: 60 },
    { day: -2, status: "PATIENT_UNWELL", before: 6, after: 6, spiro: 900, steps: 0 },
    { day: -1, status: "COMPLETED", before: 5, after: 3, spiro: 1350, steps: 120 },
    { day: 0, status: "COMPLETED", before: 4, after: 2, spiro: 1500, steps: 180 },
  ];

  for (const entry of sessions) {
    await database.therapySession.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        conductedByStaffId: physioStaffId,
        sessionDate: at(entry.day, 15),
        attendanceStatus: entry.status as never,
        painBefore: entry.before,
        painAfter: entry.after,
        spirometryAchievedMl: entry.spiro,
        stepsAchieved: entry.steps,
        progressNotes:
          entry.status === "PATIENT_UNWELL"
            ? "Nauseated after breakfast; session deferred and the surgical team informed."
            : "Tolerated the session well. Cough effective with binder support.",
      },
    });
  }

  /* ---- Nutrition: assessments and a published plan ---- */

  const dietitianStaffId = staffProfiles.get("dietitian")!;

  const nutritionAssessments = [
    { day: -4, weight: 71.0, appetite: 2, gi: "Nil by mouth" },
    { day: -3, weight: 70.2, appetite: 3, gi: "Sips of clear fluid tolerated" },
    { day: -2, weight: 69.4, appetite: 4, gi: "Mild bloating after full liquids" },
    { day: -1, weight: 68.8, appetite: 5, gi: "Early satiety, no steatorrhoea" },
    { day: 0, weight: 68.5, appetite: 6, gi: "Mild bloating after meals" },
  ];

  for (const entry of nutritionAssessments) {
    await database.nutritionAssessment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        assessedByStaffId: dietitianStaffId,
        assessedAt: at(entry.day, 12),
        weightKg: entry.weight,
        heightCm: 172,
        bmi: Number((entry.weight / 1.72 ** 2).toFixed(1)),
        weightChangeSinceSurgeryKg: Number((entry.weight - 71).toFixed(1)),
        appetiteScore: entry.appetite,
        giSymptoms: entry.gi,
        enzymeRequirement: true,
        notes: "PERT counselling reinforced with the family caregiver.",
      },
    });
  }

  const nutritionPlan = await database.nutritionPlan.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      createdByStaffId: dietitianStaffId,
      title: "Post-operative pancreatic dietary recovery plan",
      startDate: daysAgo(1),
      phase: "Phase 3: Soft / Pureed Pancreatic Diet",
      caloricTargetKcal: 1800,
      proteinTargetGrams: 85,
      fluidTargetMl: 2000,
      foodsToAvoid: "High-fat fried foods, raw cruciferous vegetables, carbonated drinks",
      isActive: true,
    },
  });

  const planItems = [
    { type: "MEAL", name: "Oatmeal with skimmed milk and sliced banana", time: "Breakfast", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", time: "Breakfast", qty: 2, unit: "capsules", withMeal: true },
    { type: "SNACK", name: "High-protein oral nutrition supplement", time: "Mid-Morning", qty: 200, unit: "mL", withMeal: false },
    { type: "MEAL", name: "Poached whitefish, mashed potato, steamed courgette", time: "Lunch", qty: 1, unit: "plate", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", time: "Lunch", qty: 2, unit: "capsules", withMeal: true },
    { type: "MEAL", name: "Chicken broth with tender rice and stewed carrot", time: "Dinner", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 25,000 IU (Pancreatin)", time: "Dinner", qty: 2, unit: "capsules", withMeal: true },
  ];

  for (const [index, item] of planItems.entries()) {
    await database.nutritionPlanItem.create({
      data: {
        tenantId: tenant.id,
        planId: nutritionPlan.id,
        itemType: item.type as never,
        name: item.name,
        instruction: item.withMeal ? `Take with the first bite of ${item.time.toLowerCase()}.` : null,
        timeOfDay: item.time,
        quantity: item.qty,
        unit: item.unit,
        withMeal: item.withMeal,
        displayOrder: index,
      },
    });
  }

  /* ---- Education ---- */

  const educationContent = [
    { title: "Caring for your JP drain at home", category: "DRAIN_CARE", duration: 240 },
    { title: "Pancreatic enzyme replacement — why timing matters", category: "NUTRITION", duration: 300 },
    { title: "Breathing exercises after abdominal surgery", category: "RECOVERY", duration: 180 },
    { title: "Warning signs to call us about", category: "SAFETY", duration: 210 },
  ];

  for (const [index, entry] of educationContent.entries()) {
    const content = await database.educationContent.create({
      data: {
        tenantId: tenant.id,
        title: entry.title,
        description: `${entry.title} — for patients recovering from a Whipple procedure.`,
        category: entry.category,
        contentType: "VIDEO",
        durationSeconds: entry.duration,
        language: "en",
        isActive: true,
        displayOrder: index,
      },
    });

    await database.educationAssignment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        contentId: content.id,
        assignedByMembershipId: memberships.get("surgeon")!.membershipId,
        assignedAt: daysAgo(3),
        dueDate: daysAhead(index < 2 ? 2 : 7),
      },
    });
  }

  console.log("→ clinical work by the therapist and dietitian seeded");

  console.log("\n  PKLI HPB Surgical Demo — every account sees the same patient\n");
  console.table(
    ACCOUNTS.map((account) => ({
      Portal: account.workspace,
      Person: account.name,
      Email: `${account.key}@${DEMO_SLUG}.wonflow.local`,
      Password: PASSWORD,
    })),
  );

  await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
