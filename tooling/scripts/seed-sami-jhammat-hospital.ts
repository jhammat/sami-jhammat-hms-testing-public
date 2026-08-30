import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Demo seeding is disabled in production.");
}

/**
 * Sami Jhammat Hospital — a whole working hospital, not a screenshot set.
 *
 * The HPB-SP team's product question is never "does this screen render" but
 * "does a real week in this hospital hold together across every portal at
 * once". So this seed builds one hospital where reception, the surgeon, the
 * laboratory, radiology, pharmacy, billing, physiotherapy, dietetics,
 * management and the patients are all looking at the SAME six people from
 * their own window.
 *
 * Three rules shaped it:
 *
 * 1. Every portal must have work waiting in every state it can show. A
 *    laboratory screen with nothing in "processing" proves nothing about the
 *    processing screen. So each queue carries live rows at each stage.
 *
 * 2. Allied access is referral-scoped and time-bound, and nothing reaches a
 *    patient's phone without an ACTIVE care plan. Care plans come first;
 *    referrals are ACCEPTED, assigned, and dated into the future.
 *
 * 3. Re-runnable. It deletes and rebuilds its own tenant and touches no
 *    other, so it can be run repeatedly while iterating on the product.
 */

const SLUG = "sami-jhammat";
const HOSPITAL = "Sami Jhammat Hospital";
const EMAIL_DOMAIN = "samijhammat.local";
const PASSWORD = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";

/** Matches the Branch.timezone default this seed relies on. */
const HOSPITAL_TIMEZONE = "Asia/Karachi";

/**
 * `workspace` is the person's primary portal; `alsoHolds` is everything else
 * the same credentials open.
 *
 * One person genuinely wearing several hats is the normal case in a hospital
 * this size, not an edge case — the consultant who runs the HPB list also
 * administers the department and covers the billing counter on a Saturday.
 * The surgeon below holds three portals on one login so that path is exercised
 * every time this data is used, rather than being a scenario nobody ever sees.
 */
const ACCOUNTS = [
  { key: "admin", workspace: "ADMIN", name: "Sami Jhammat", title: "Hospital Administrator" },
  {
    key: "surgeon",
    workspace: "DOCTOR",
    alsoHolds: ["ADMIN", "BILLING"],
    name: "Dr Ayesha Malik",
    title: "Consultant HPB Surgeon",
  },
  { key: "reception", workspace: "RECEPTION", name: "Nimra Farooq", title: "Reception Officer" },
  { key: "physio", workspace: "PHYSIOTHERAPIST", name: "Hina Raza", title: "Senior Physiotherapist" },
  { key: "dietitian", workspace: "NUTRITIONIST", name: "Bilal Ahmed", title: "Clinical Dietitian" },
  { key: "laboratory", workspace: "LABORATORY", name: "Usman Tariq", title: "Laboratory Officer" },
  { key: "radiology", workspace: "RADIOLOGY", name: "Sana Iqbal", title: "Radiology Officer" },
  { key: "pharmacy", workspace: "PHARMACY", name: "Adeel Hussain", title: "Chief Pharmacist" },
  { key: "billing", workspace: "BILLING", name: "Fatima Noor", title: "Billing Officer" },
  { key: "management", workspace: "MANAGEMENT", name: "Kashif Mahmood", title: "Hospital Manager" },
  { key: "patient", workspace: "PATIENT", name: "Muhammad Yousaf", title: "Patient" },
] as const;

type AccountKey = (typeof ACCOUNTS)[number]["key"];

/** The six people this hospital is currently looking after. */
const PATIENTS = [
  {
    key: "yousaf",
    number: "SJH-0001",
    given: "Muhammad",
    family: "Yousaf",
    dob: "1957-04-18",
    sex: "MALE",
    phone: "+92 300 1234567",
    procedure: "Pancreaticoduodenectomy (Whipple)",
    podDays: 4,
    hasPortalAccount: true,
  },
  {
    key: "nasreen",
    number: "SJH-0002",
    given: "Nasreen",
    family: "Bibi",
    dob: "1964-11-02",
    sex: "FEMALE",
    phone: "+92 301 2345678",
    procedure: "Right hepatectomy for colorectal liver metastases",
    podDays: 2,
    hasPortalAccount: false,
  },
  {
    key: "arshad",
    number: "SJH-0003",
    given: "Arshad",
    family: "Mehmood",
    dob: "1971-06-25",
    sex: "MALE",
    phone: "+92 302 3456789",
    procedure: "Living-donor hepatectomy (donor)",
    podDays: 1,
    hasPortalAccount: false,
  },
  {
    key: "rukhsana",
    number: "SJH-0004",
    given: "Rukhsana",
    family: "Kausar",
    dob: "1949-01-30",
    sex: "FEMALE",
    phone: "+92 303 4567890",
    procedure: "Orthotopic liver transplant (recipient)",
    podDays: 9,
    hasPortalAccount: false,
  },
  {
    key: "imran",
    number: "SJH-0005",
    given: "Imran",
    family: "Shah",
    dob: "1982-09-14",
    sex: "MALE",
    phone: "+92 304 5678901",
    procedure: "Laparoscopic cholecystectomy",
    podDays: 1,
    hasPortalAccount: false,
  },
  {
    key: "zainab",
    number: "SJH-0006",
    given: "Zainab",
    family: "Riaz",
    dob: "1990-03-08",
    sex: "FEMALE",
    phone: "+92 305 6789012",
    procedure: "Pre-operative assessment — distal pancreatectomy",
    podDays: null,
    hasPortalAccount: false,
  },
] as const;

type PatientKey = (typeof PATIENTS)[number]["key"];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function daysAhead(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

/** A wall-clock time on a day relative to today, so screens look like a real day. */
function at(dayOffset: number, hour: number, minute = 0): Date {
  const date = new Date(Date.now() + dayOffset * 86_400_000);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Today's clinic, placed around the current time rather than at a fixed hour.
 *
 * Pinning the list to 09:00–12:00 meant that whenever the demo was opened in
 * the evening the doctor's dashboard reported a consultation that had been
 * running for thirteen hours and patients who had waited since breakfast. The
 * data was correct and the screen looked broken. Anchoring to now keeps the
 * waiting times plausible whenever anyone looks.
 */
function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

/**
 * Today's calendar date, encoded for a `@db.Date` column.
 *
 * `Queue.queueDate` is date-only, so Postgres keeps the date part of whatever
 * instant it is given, read in UTC. Local midnight is the wrong thing to hand
 * it: at UTC+5 that is 19:00 the previous day, so a queue created "today"
 * was filed under yesterday and the reception overview — which correctly
 * looks up UTC midnight — found nothing.
 */
function queueDateForToday(): Date {
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOSPITAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${local}T00:00:00.000Z`);
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

  /* ================================================================
     Rebuild this tenant only.

     Deleting tenant-scoped rows table by table hits foreign keys in
     whatever order the catalogue lists them. Rather than hand-maintain a
     correct order across ninety-odd tables, triggers are suspended for the
     wipe and restored straight after. Nothing outside this tenant is
     touched and the tenant is rebuilt whole immediately.
     ================================================================ */

  const existing = await database.tenant.findUnique({ where: { slug: SLUG } });
  if (existing) {
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
      where: { normalizedEmail: { endsWith: `@${EMAIL_DOMAIN}` } },
    });
    await database.tenant.delete({ where: { id: existing.id } });
  }

  const tenant = await database.tenant.create({
    data: { slug: SLUG, displayName: HOSPITAL, status: "ACTIVE" },
  });

  const organization = await database.organization.create({
    data: { tenantId: tenant.id, code: "MAIN", displayName: HOSPITAL },
  });

  const branch = await database.branch.create({
    data: {
      tenantId: tenant.id,
      organizationId: organization.id,
      code: "MAIN",
      name: `${HOSPITAL} — Main Campus`,
      isMainBranch: true,
    },
  });

  for (const moduleCode of PLATFORM_MODULE_CODES) {
    await database.tenantEntitlement.create({
      data: { tenantId: tenant.id, moduleCode, enabled: true },
    });
  }

  /* ---- Roles and permissions from the same map the app enforces ---- */

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
        isSystem: true,
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

  /* ---- Accounts and staff profiles ---- */

  const members = new Map<AccountKey, { identityId: string; membershipId: string; email: string }>();

  for (const account of ACCOUNTS) {
    const email = `${account.key}@${EMAIL_DOMAIN}`;

    const identity = await database.identity.create({
      data: {
        email,
        normalizedEmail: email,
        passwordHash,
        status: "ACTIVE",
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
        workspaceCodes: [
          account.workspace,
          ...(("alsoHolds" in account ? account.alsoHolds : []) as readonly string[]),
        ] as never,
        primaryWorkspace: account.workspace as never,
      },
    });

    // A role grant per workspace, or the extra portals would appear on the
    // sign-in menu and then refuse every permission behind them.
    const held = [
      account.workspace,
      ...(("alsoHolds" in account ? account.alsoHolds : []) as readonly string[]),
    ];

    for (const workspace of held) {
      const roleId = roleByWorkspace.get(workspace);
      if (!roleId) continue;
      await database.membershipRole.create({
        data: { tenantId: tenant.id, membershipId: membership.id, roleId, branchId: branch.id },
      });
    }

    members.set(account.key, { identityId: identity.id, membershipId: membership.id, email });
  }

  const staff = new Map<AccountKey, string>();
  for (const account of ACCOUNTS) {
    if (account.workspace === "PATIENT") continue;
    const member = members.get(account.key)!;

    const profile = await database.staffProfile.create({
      data: {
        tenantId: tenant.id,
        membershipId: member.membershipId,
        branchId: branch.id,
        employeeNumber: `SJH-${account.key.toUpperCase()}-001`,
        staffType: account.workspace === "ADMIN" ? "ADMIN" : (account.workspace as never),
        title: account.title,
        status: "ACTIVE",
      },
    });
    staff.set(account.key, profile.id);
  }

  /* ---- Departments ---- */

  const departments = new Map<string, string>();
  for (const [code, name] of [
    ["HPB", "Hepato-Pancreato-Biliary Surgery"],
    ["TRANSPLANT", "Liver Transplantation"],
    ["GASTRO", "Gastroenterology"],
    ["ANAES", "Anaesthesia & Critical Care"],
  ] as const) {
    const department = await database.department.create({
      data: { tenantId: tenant.id, organizationId: organization.id, code, name, isActive: true },
    });
    departments.set(code, department.id);
  }

  const surgeon = await database.doctorProfile.create({
    data: {
      tenantId: tenant.id,
      staffProfileId: staff.get("surgeon")!,
      departmentId: departments.get("HPB")!,
      specialty: "Hepato-Pancreato-Biliary Surgery",
      registrationNumber: "PMDC-HPB-44120",
      qualifications: "MBBS, FCPS (Surgery), Fellowship in HPB & Liver Transplant",
      biography:
        "Consultant hepato-pancreato-biliary surgeon. Practice is largely pancreaticoduodenectomy, hepatectomy and living-donor liver transplantation, with structured post-operative recovery run through the care plan engine.",
      durationMinutes: 20,
      publiclyBookable: true,
    },
  });

  console.log("→ hospital, staff and departments created");

  /* ================================================================
     Services and a published clinic, so booking screens work
     ================================================================ */

  const services = new Map<string, string>();
  for (const service of [
    { code: "SJH-HPB-NEW", name: "HPB surgical consultation (new patient)", category: "Consultation", minutes: 30, price: 500_000, bookable: true },
    { code: "SJH-HPB-FU", name: "HPB post-operative follow-up", category: "Consultation", minutes: 20, price: 300_000, bookable: true },
    { code: "SJH-ONLINE", name: "Online video consultation", category: "Consultation", minutes: 20, price: 250_000, bookable: true, online: true },
    { code: "SJH-LFT", name: "Liver function tests", category: "Laboratory", minutes: 0, price: 180_000, bookable: false },
    { code: "SJH-CTAP", name: "CT abdomen and pelvis with contrast", category: "Radiology", minutes: 0, price: 1_200_000, bookable: false },
    { code: "SJH-PHYSIO", name: "Physiotherapy session", category: "Therapy", minutes: 30, price: 150_000, bookable: false },
  ]) {
    const row = await database.serviceDefinition.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        doctorId: service.category === "Consultation" ? surgeon.id : null,
        code: service.code,
        name: service.name,
        category: service.category,
        durationMinutes: service.minutes,
        priceMinorUnits: service.price,
        currencyCode: "PKR",
        publiclyBookable: service.bookable,
        consultationModes: service.online ? ["ONLINE"] : undefined,
        isActive: true,
      },
    });
    services.set(service.code, row.id);
  }

  // A clinic that actually runs: Monday to Saturday mornings and afternoons.
  for (const weekday of [1, 2, 3, 4, 5, 6]) {
    await database.availabilityRule.create({
      data: {
        tenantId: tenant.id,
        doctorId: surgeon.id,
        branchId: branch.id,
        serviceId: services.get("SJH-HPB-NEW")!,
        weekday,
        startsMinute: 9 * 60,
        endsMinute: 13 * 60,
        capacity: 1,
        validFrom: daysAgo(30),
        isActive: true,
      },
    });
    await database.availabilityRule.create({
      data: {
        tenantId: tenant.id,
        doctorId: surgeon.id,
        branchId: branch.id,
        serviceId: services.get("SJH-HPB-FU")!,
        weekday,
        startsMinute: 14 * 60,
        endsMinute: 17 * 60,
        capacity: 2,
        validFrom: daysAgo(30),
        isActive: true,
      },
    });
  }

  /* ================================================================
     Patients
     ================================================================ */

  const patientIds = new Map<PatientKey, string>();
  const patientAccount = members.get("patient")!;

  for (const person of PATIENTS) {
    const isPortalPatient = person.hasPortalAccount;

    const row = await database.patient.create({
      data: {
        tenantId: tenant.id,
        patientNumber: person.number,
        givenName: person.given,
        familyName: person.family,
        dateOfBirth: new Date(person.dob),
        sex: person.sex,
        phone: person.phone,
        email: isPortalPatient ? patientAccount.email : null,
        normalizedEmail: isPortalPatient ? patientAccount.email : null,
        status: "ACTIVE",
        address: {
          line1: `House ${12 + PATIENTS.indexOf(person) * 7}, Street 4`,
          city: "Lahore",
          province: "Punjab",
          country: "Pakistan",
        },
      },
    });

    patientIds.set(person.key, row.id);

    if (isPortalPatient) {
      await database.patientAccess.create({
        data: {
          patientId: row.id,
          identityId: patientAccount.identityId,
          relationship: "self",
          isActive: true,
          isPrimary: true,
          accessReason: "Patient portal account",
          permissions: ["observations.write", "careplan.complete"],
        },
      });
    }
  }

  console.log("→ six patients registered");

  /* ================================================================
     Reception: today's queue and the appointment book
     ================================================================ */

  const queue = await database.queue.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      queueDate: queueDateForToday(),
      name: "HPB Clinic — Main Campus",
      status: "OPEN",
      nextTokenNumber: 5,
    },
  });

  const appointmentPlan = [
    { patient: "yousaf" as PatientKey, offsetMinutes: -150, status: "COMPLETED" as const, queue: "COMPLETED" as const, reason: "Post-operative review, day 4 — drain assessment", service: "SJH-HPB-FU" },
    { patient: "imran" as PatientKey, offsetMinutes: -25, status: "IN_PROGRESS" as const, queue: "IN_SERVICE" as const, reason: "Day 1 post laparoscopic cholecystectomy review", service: "SJH-HPB-FU" },
    { patient: "zainab" as PatientKey, offsetMinutes: 20, status: "CHECKED_IN" as const, queue: "WAITING" as const, reason: "Pre-operative assessment for distal pancreatectomy", service: "SJH-HPB-NEW" },
    { patient: "nasreen" as PatientKey, offsetMinutes: 65, status: "CONFIRMED" as const, queue: "WAITING" as const, reason: "Hepatectomy recovery review", service: "SJH-HPB-FU" },
  ];

  const appointmentIds = new Map<PatientKey, string>();
  let token = 1;

  for (const plan of appointmentPlan) {
    const appointment = await database.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(plan.patient)!,
        doctorId: surgeon.id,
        branchId: branch.id,
        serviceId: services.get(plan.service)!,
        status: plan.status,
        source: "reception",
        reason: plan.reason,
        startsAt: minutesFromNow(plan.offsetMinutes),
        endsAt: minutesFromNow(plan.offsetMinutes + 30),
        checkedInAt:
          plan.status === "CONFIRMED" ? null : minutesFromNow(plan.offsetMinutes - 12),
      },
    });

    appointmentIds.set(plan.patient, appointment.id);

    await database.queueEntry.create({
      data: {
        tenantId: tenant.id,
        queueId: queue.id,
        patientId: patientIds.get(plan.patient)!,
        appointmentId: appointment.id,
        tokenNumber: token,
        priority: plan.patient === "imran" ? 1 : 0,
        status: plan.queue,
        joinedAt: minutesFromNow(plan.offsetMinutes - 18),
        calledAt: plan.queue === "WAITING" ? null : minutesFromNow(plan.offsetMinutes),
        startedAt:
          plan.queue === "IN_SERVICE" || plan.queue === "COMPLETED"
            ? minutesFromNow(plan.offsetMinutes)
            : null,
        completedAt: plan.queue === "COMPLETED" ? minutesFromNow(plan.offsetMinutes + 30) : null,
      },
    });

    token += 1;
  }

  // Upcoming clinic, so the schedule and the patient's own portal are not empty.
  for (const [offset, patientKey, reason] of [
    [2, "yousaf", "Post-operative review, day 6 — drain removal assessment"],
    [3, "rukhsana", "Transplant clinic — immunosuppression review"],
    [5, "arshad", "Donor follow-up — return to activity"],
  ] as const) {
    await database.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(patientKey)!,
        doctorId: surgeon.id,
        branchId: branch.id,
        serviceId: services.get("SJH-HPB-FU")!,
        status: "CONFIRMED",
        source: "reception",
        reason,
        startsAt: at(offset, 14),
        endsAt: at(offset, 15),
      },
    });
  }

  console.log("→ clinic queue and appointment book seeded");

  /* ================================================================
     The surgeon's encounters, notes, diagnoses and prescriptions
     ================================================================ */

  const surgeonMembership = members.get("surgeon")!.membershipId;

  const yousafEncounter = await database.encounter.create({
    data: {
      tenantId: tenant.id,
      patientId: patientIds.get("yousaf")!,
      appointmentId: appointmentIds.get("yousaf")!,
      doctorId: surgeon.id,
      branchId: branch.id,
      status: "COMPLETED",
      reason: "Post-operative review, day 4 — drain assessment",
      startedAt: minutesFromNow(-150),
      endedAt: minutesFromNow(-115),
      signedAt: minutesFromNow(-115),
    },
  });

  await database.encounterNote.create({
    data: {
      tenantId: tenant.id,
      encounterId: yousafEncounter.id,
      authorMembershipId: surgeonMembership,
      noteType: "PROGRESS",
      status: "SIGNED",
      signedAt: minutesFromNow(-115),
      content: {
        subjective:
          "Day 4 after pancreaticoduodenectomy. Pain controlled on oral analgesia. Tolerating a soft diet with enzyme replacement. Passing flatus.",
        objective:
          "Afebrile. Abdomen soft, wound clean and dry. Subhepatic drain 45 mL serous over 24 hours, amylase 55 U/L. Walking 180 m with the physiotherapist.",
        assessment:
          "Satisfactory recovery. No evidence of a pancreatic fistula. Drain output and amylase both falling.",
        plan: "Continue enzyme replacement and mobilisation. Reassess for drain removal on day 6. Repeat LFTs and CBC tomorrow.",
      },
    },
  });

  await database.encounterDiagnosis.create({
    data: {
      tenantId: tenant.id,
      patientId: patientIds.get("yousaf")!,
      encounterId: yousafEncounter.id,
      recordedByMembershipId: surgeonMembership,
      codeSystem: "ICD-10",
      code: "C25.0",
      display: "Malignant neoplasm of head of pancreas",
      status: "ACTIVE",
      certainty: "CONFIRMED",
      isPrimary: true,
      notes: "Resected. Histology pending.",
    },
  });

  const imranEncounter = await database.encounter.create({
    data: {
      tenantId: tenant.id,
      patientId: patientIds.get("imran")!,
      appointmentId: appointmentIds.get("imran")!,
      doctorId: surgeon.id,
      branchId: branch.id,
      status: "IN_PROGRESS",
      reason: "Day 1 post laparoscopic cholecystectomy review",
      startedAt: minutesFromNow(-25),
    },
  });

  void imranEncounter;

  /* ---- Medicines and pharmacy stock ---- */

  const medications = new Map<string, string>();
  const medicineCatalogue = [
    { code: "MED-CREON", generic: "Pancreatin", brand: "Creon", strength: "25,000 IU", form: "Capsule", unit: "capsule", reorder: 200 },
    { code: "MED-TACRO", generic: "Tacrolimus", brand: "Prograf", strength: "1 mg", form: "Capsule", unit: "capsule", reorder: 150 },
    { code: "MED-OMEP", generic: "Omeprazole", brand: "Risek", strength: "40 mg", form: "Capsule", unit: "capsule", reorder: 300 },
    { code: "MED-PARA", generic: "Paracetamol", brand: "Panadol", strength: "1 g", form: "Tablet", unit: "tablet", reorder: 500 },
    { code: "MED-ENOX", generic: "Enoxaparin", brand: "Clexane", strength: "40 mg/0.4 mL", form: "Injection", unit: "syringe", reorder: 100 },
    { code: "MED-URSO", generic: "Ursodeoxycholic acid", brand: "Ursocol", strength: "300 mg", form: "Tablet", unit: "tablet", reorder: 200 },
    { code: "MED-MYCO", generic: "Mycophenolate mofetil", brand: "CellCept", strength: "500 mg", form: "Tablet", unit: "tablet", reorder: 120 },
    { code: "MED-ONDA", generic: "Ondansetron", brand: "Zofran", strength: "4 mg", form: "Tablet", unit: "tablet", reorder: 200 },
  ];

  for (const medicine of medicineCatalogue) {
    const row = await database.medication.create({
      data: {
        tenantId: tenant.id,
        code: medicine.code,
        genericName: medicine.generic,
        brandName: medicine.brand,
        strength: medicine.strength,
        dosageForm: medicine.form,
        unit: medicine.unit,
        reorderLevel: medicine.reorder,
        isActive: true,
      },
    });
    medications.set(medicine.code, row.id);
  }

  const supplier = await database.supplier.create({
    data: {
      tenantId: tenant.id,
      code: "SUP-LMS",
      name: "Lahore Medical Supplies (Pvt) Ltd",
      contactPerson: "Rana Shahid",
      phone: "+92 42 35700110",
      email: "orders@lahoremedical.example",
      address: "12-A Jail Road, Lahore, Punjab",
      status: "ACTIVE",
    },
  });
  void supplier;

  // Stock levels chosen so the inventory screen shows healthy stock, a
  // low-stock warning and a near-expiry batch at the same time. A shelf that
  // is uniformly full tells a pharmacist nothing about their own screen.
  const batches = [
    { code: "MED-CREON", batch: "CRN-2411", quantity: 640, expiresInDays: 420 },
    { code: "MED-TACRO", batch: "TAC-2408", quantity: 90, expiresInDays: 260 },
    { code: "MED-OMEP", batch: "OMP-2501", quantity: 1200, expiresInDays: 500 },
    { code: "MED-PARA", batch: "PAR-2503", quantity: 2400, expiresInDays: 700 },
    { code: "MED-ENOX", batch: "ENX-2412", quantity: 40, expiresInDays: 45 },
    { code: "MED-URSO", batch: "URS-2502", quantity: 480, expiresInDays: 380 },
    { code: "MED-MYCO", batch: "MYC-2410", quantity: 60, expiresInDays: 150 },
    { code: "MED-ONDA", batch: "OND-2505", quantity: 700, expiresInDays: 600 },
  ];

  const batchIds = new Map<string, string>();
  for (const batch of batches) {
    const row = await database.inventoryBatch.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        medicationId: medications.get(batch.code)!,
        batchNumber: batch.batch,
        expiryDate: daysAhead(batch.expiresInDays),
        quantity: batch.quantity,
        status: "AVAILABLE",
      },
    });
    batchIds.set(batch.code, row.id);
  }

  /* ---- A prescription the pharmacy can actually dispense ---- */

  const prescription = await database.prescription.create({
    data: {
      tenantId: tenant.id,
      patientId: patientIds.get("yousaf")!,
      encounterId: yousafEncounter.id,
      doctorId: surgeon.id,
      status: "ACTIVE",
      prescribedAt: minutesFromNow(-120),
      signedAt: minutesFromNow(-115),
      instructions: "Enzyme replacement with every meal and snack. Review at the day 6 clinic.",
    },
  });

  for (const item of [
    { code: "MED-CREON", dose: "50,000 IU", route: "Oral", frequency: "With every meal", duration: "3 months", quantity: 180, instructions: "Take with the first bite of food, never before." },
    { code: "MED-OMEP", dose: "40 mg", route: "Oral", frequency: "Once daily before breakfast", duration: "3 months", quantity: 90, instructions: "Supports enzyme activity by reducing gastric acid." },
    { code: "MED-PARA", dose: "1 g", route: "Oral", frequency: "Four times daily as needed", duration: "10 days", quantity: 40, instructions: "Maximum 4 g in 24 hours." },
    { code: "MED-ENOX", dose: "40 mg", route: "Subcutaneous", frequency: "Once daily", duration: "28 days", quantity: 28, instructions: "Continue thromboprophylaxis for 28 days after surgery." },
  ]) {
    await database.prescriptionItem.create({
      data: {
        prescriptionId: prescription.id,
        medicationId: medications.get(item.code)!,
        dose: item.dose,
        route: item.route,
        frequency: item.frequency,
        duration: item.duration,
        quantity: item.quantity,
        instructions: item.instructions,
      },
    });
  }

  console.log("→ encounters, prescriptions and pharmacy stock seeded");

  /* ================================================================
     Laboratory and radiology, with work at every stage
     ================================================================ */

  const labOrders = [
    { patient: "yousaf" as PatientKey, code: "LFT", name: "Liver function tests", status: "ORDERED" as const, specimen: "Serum", reason: "Day 5 post-Whipple monitoring" },
    { patient: "nasreen" as PatientKey, code: "CBC", name: "Full blood count", status: "ACCEPTED" as const, specimen: "EDTA whole blood", reason: "Post-hepatectomy day 2" },
    { patient: "rukhsana" as PatientKey, code: "TACLEVEL", name: "Tacrolimus trough level", status: "IN_PROGRESS" as const, specimen: "EDTA whole blood", reason: "Transplant immunosuppression monitoring" },
    { patient: "arshad" as PatientKey, code: "COAG", name: "Coagulation screen", status: "COMPLETED" as const, specimen: "Citrate plasma", reason: "Donor day 1 assessment" },
    { patient: "imran" as PatientKey, code: "AMYLASE", name: "Serum amylase", status: "COMPLETED" as const, specimen: "Serum", reason: "Post-cholecystectomy abdominal pain", critical: true },
  ];

  for (const [index, order] of labOrders.entries()) {
    const row = await database.diagnosticOrder.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(order.patient)!,
        branchId: branch.id,
        orderedByMembershipId: surgeonMembership,
        type: "LABORATORY",
        status: order.status,
        priority: order.critical ? "urgent" : "routine",
        code: order.code,
        name: order.name,
        specimenOrBodySite: order.specimen,
        clinicalReason: order.reason,
        accessionNumber: `SJH-LAB-${String(index + 1).padStart(4, "0")}`,
        orderedAt: minutesFromNow(-200 + index * 10),
        completedAt: order.status === "COMPLETED" ? minutesFromNow(-45) : null,
      },
    });

    if (order.status === "COMPLETED") {
      await database.diagnosticResult.create({
        data: {
          tenantId: tenant.id,
          orderId: row.id,
          status: "FINAL",
          critical: Boolean(order.critical),
          criticalNotes: order.critical
            ? "Serum amylase 640 U/L — well above the reference range. Surgical team informed by telephone."
            : null,
          reportText: order.critical
            ? "Serum amylase 640 U/L (reference 28–100 U/L). Result telephoned to the on-call HPB registrar."
            : "Prothrombin time 13.1 s, INR 1.1, APTT 31 s. All within the reference range.",
          resultData: order.critical
            ? { amylase: { value: 640, unit: "U/L", low: 28, high: 100, flag: "HIGH" } }
            : {
                prothrombinTime: { value: 13.1, unit: "s", low: 11, high: 14 },
                inr: { value: 1.1, unit: "", low: 0.8, high: 1.2 },
                apttValue: { value: 31, unit: "s", low: 25, high: 35 },
              },
          performedByMembershipId: members.get("laboratory")!.membershipId,
          verifiedByMembershipId: members.get("laboratory")!.membershipId,
          releasedByMembershipId: members.get("laboratory")!.membershipId,
          verifiedAt: minutesFromNow(-70),
          releasedAt: minutesFromNow(-45),
        },
      });
    }
  }

  const radiologyOrders = [
    { patient: "yousaf" as PatientKey, code: "CTAP", name: "CT abdomen and pelvis with contrast", status: "ORDERED" as const, site: "Abdomen and pelvis", reason: "Day 6 collection assessment before drain removal" },
    { patient: "nasreen" as PatientKey, code: "USSABDO", name: "Ultrasound abdomen", status: "IN_PROGRESS" as const, site: "Abdomen", reason: "Post-hepatectomy fluid collection query" },
    { patient: "rukhsana" as PatientKey, code: "DOPPLER", name: "Hepatic artery Doppler", status: "COMPLETED" as const, site: "Liver graft", reason: "Post-transplant vascular surveillance" },
  ];

  for (const [index, order] of radiologyOrders.entries()) {
    const row = await database.diagnosticOrder.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(order.patient)!,
        branchId: branch.id,
        orderedByMembershipId: surgeonMembership,
        type: "RADIOLOGY",
        status: order.status,
        priority: "routine",
        code: order.code,
        name: order.name,
        specimenOrBodySite: order.site,
        clinicalReason: order.reason,
        accessionNumber: `SJH-RAD-${String(index + 1).padStart(4, "0")}`,
        orderedAt: minutesFromNow(-180 + index * 10),
        completedAt: order.status === "COMPLETED" ? minutesFromNow(-30) : null,
      },
    });

    if (order.status === "COMPLETED") {
      await database.diagnosticResult.create({
        data: {
          tenantId: tenant.id,
          orderId: row.id,
          status: "FINAL",
          critical: false,
          reportText:
            "Hepatic artery patent with a normal waveform. Resistive index 0.62. Portal vein and hepatic veins patent. No peri-graft collection.",
          performedByMembershipId: members.get("radiology")!.membershipId,
          verifiedByMembershipId: members.get("radiology")!.membershipId,
          releasedByMembershipId: members.get("radiology")!.membershipId,
          verifiedAt: minutesFromNow(-55),
          releasedAt: minutesFromNow(-30),
        },
      });
    }
  }

  console.log("→ laboratory and radiology worklists seeded");

  /* ================================================================
     Billing: an invoice at each state the counter can show
     ================================================================ */

  const invoicePlan = [
    { patient: "yousaf" as PatientKey, number: "SJH-INV-0001", status: "PAID" as const, lines: [["SJH-HPB-FU", "HPB post-operative follow-up", 300_000], ["SJH-LFT", "Liver function tests", 180_000]] },
    { patient: "nasreen" as PatientKey, number: "SJH-INV-0002", status: "PARTIALLY_PAID" as const, lines: [["SJH-CTAP", "CT abdomen and pelvis with contrast", 1_200_000]] },
    { patient: "zainab" as PatientKey, number: "SJH-INV-0003", status: "ISSUED" as const, lines: [["SJH-HPB-NEW", "HPB surgical consultation (new patient)", 500_000]] },
    { patient: "imran" as PatientKey, number: "SJH-INV-0004", status: "DRAFT" as const, lines: [["SJH-HPB-FU", "HPB post-operative follow-up", 300_000]] },
  ];

  for (const plan of invoicePlan) {
    const subtotal = plan.lines.reduce((sum, line) => sum + (line[2] as number), 0);
    const paid =
      plan.status === "PAID" ? subtotal : plan.status === "PARTIALLY_PAID" ? Math.round(subtotal / 2) : 0;

    const invoice = await database.invoice.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(plan.patient)!,
        branchId: branch.id,
        invoiceNumber: plan.number,
        status: plan.status,
        currencyCode: "PKR",
        subtotalMinor: subtotal,
        discountMinor: 0,
        totalMinor: subtotal,
        paidMinor: paid,
        issuedAt: plan.status === "DRAFT" ? null : minutesFromNow(-140),
        dueAt: plan.status === "DRAFT" ? null : daysAhead(14),
      },
    });

    for (const [serviceCode, description, price] of plan.lines) {
      await database.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          serviceId: services.get(serviceCode as string) ?? null,
          description: description as string,
          quantity: 1,
          unitPriceMinor: price as number,
          totalMinor: price as number,
        },
      });
    }

    if (paid > 0) {
      await database.payment.create({
        data: {
          tenantId: tenant.id,
          invoiceId: invoice.id,
          receivedByMembershipId: members.get("billing")!.membershipId,
          status: "COMPLETED",
          method: plan.status === "PAID" ? "CASH" : "CARD",
          amountMinor: paid,
          currencyCode: "PKR",
          reference: `${plan.number}-P1`,
          completedAt: minutesFromNow(-100),
        },
      });
    }
  }

  console.log("→ billing ledger seeded");

  /* ================================================================
     Care plans, referrals and the allied clinical record
     ================================================================ */

  const carePlans = new Map<PatientKey, string>();

  const carePlanPlan = [
    { patient: "yousaf" as PatientKey, category: "WHIPPLE_RECOVERY", title: "Whipple recovery — post-operative day 4 onward", startedDaysAgo: 4, stage: 2 },
    { patient: "rukhsana" as PatientKey, category: "TRANSPLANT_RECOVERY", title: "Liver transplant recovery — ward phase", startedDaysAgo: 9, stage: 3 },
  ];

  for (const plan of carePlanPlan) {
    const row = await database.carePlan.create({
      data: {
        tenantId: tenant.id,
        patientId: patientIds.get(plan.patient)!,
        category: plan.category,
        title: plan.title,
        status: "ACTIVE",
        startDate: daysAgo(plan.startedDaysAgo),
        currentStage: plan.stage,
        managingDoctorId: surgeon.id,
        assignedTherapistId: staff.get("physio")!,
        assignedNutritionistId: staff.get("dietitian")!,
      },
    });
    carePlans.set(plan.patient, row.id);
  }

  /* ---- Referrals. Every HPB in-patient is referred to both services. ---- */

  const referralTargets: { patient: PatientKey; physioReason: string; physioGoal: string; nutritionReason: string; nutritionGoal: string; precautions: string }[] = [
    {
      patient: "yousaf",
      physioReason: "Post-operative Whipple mobility and respiratory rehabilitation",
      physioGoal: "Independent corridor ambulation 150 m and spirometry above 1500 mL by day 8",
      nutritionReason: "Post-pancreatectomy dietary progression and enzyme titration",
      nutritionGoal: "Tolerate a soft pancreatic diet on optimised enzyme replacement",
      precautions: "Rooftop incision — log-roll transfers, splint for coughing, no lifting over 5 kg for six weeks",
    },
    {
      patient: "nasreen",
      physioReason: "Right basal expansion and early mobilisation after hepatectomy",
      physioGoal: "Corridor ambulation 100 m and effective splinted cough by day 4",
      nutritionReason: "Protein optimisation after major liver resection",
      nutritionGoal: "Meet a 1.5 g/kg daily protein target within one week",
      precautions: "Right subcostal incision, abdominal drain in situ — check output before every session",
    },
    {
      patient: "arshad",
      physioReason: "Living-donor early mobilisation ladder",
      physioGoal: "Independent walking and stairs before discharge on day 4",
      nutritionReason: "Return to a normal diet after donor hepatectomy",
      nutritionGoal: "Full oral intake without supplements by day 3",
      precautions: "Fit donor — hold to the six-week lifting limit rather than to symptoms",
    },
    {
      patient: "rukhsana",
      physioReason: "Post-transplant conditioning with immunosuppression precautions",
      physioGoal: "Fifteen minutes of continuous walking before discharge",
      nutritionReason: "Sarcopenia reversal and immunosuppression-safe diet education",
      nutritionGoal: "Weight stable and protein target met on a food-safety-compliant diet",
      precautions: "Immunosuppressed — clean equipment between patients, defer for fever, re-screen tremor daily",
    },
  ];

  const referralCommon = {
    tenantId: tenant.id,
    referringDoctorId: surgeon.id,
    status: "ACCEPTED" as const,
    priority: "URGENT" as const,
    acceptedAt: daysAgo(1),
    validFrom: daysAgo(4),
    // Time-bound on purpose: the access guard rejects an expired referral, so
    // a demo left running for a month still behaves correctly.
    validUntil: daysAhead(90),
  };

  for (const target of referralTargets) {
    const patientId = patientIds.get(target.patient)!;
    const person = PATIENTS.find((entry) => entry.key === target.patient)!;

    await database.clinicalReferral.create({
      data: {
        ...referralCommon,
        patientId,
        specialty: "PHYSIOTHERAPY",
        discipline: "PHYSIOTHERAPY",
        assignedToId: staff.get("physio")!,
        reason: target.physioReason,
        goal: target.physioGoal,
        clinicalSummary: `${person.given} ${person.family}, day ${person.podDays ?? 0} after ${person.procedure.toLowerCase()}.`,
        surgicalSummary: person.procedure,
        precautions: target.precautions,
      },
    });

    await database.clinicalReferral.create({
      data: {
        ...referralCommon,
        patientId,
        specialty: "NUTRITION",
        discipline: "NUTRITION",
        assignedToId: staff.get("dietitian")!,
        reason: target.nutritionReason,
        goal: target.nutritionGoal,
        clinicalSummary: `${person.given} ${person.family}, day ${person.podDays ?? 0} after ${person.procedure.toLowerCase()}.`,
        surgicalSummary: person.procedure,
        precautions: target.precautions,
      },
    });

    for (const key of ["physio", "dietitian"] as const) {
      await database.patientAccess.create({
        data: {
          patientId,
          identityId: members.get(key)!.identityId,
          relationship: "care-team-allied",
          isActive: true,
          accessReason: `${key === "physio" ? "PHYSIOTHERAPY" : "NUTRITION"} referral accepted`,
          permissions: ["observations.write", "careplan.complete"],
        },
      });
    }
  }

  // One referral still waiting to be accepted, so the caseload screens show
  // the "pending" state they are built to handle.
  await database.clinicalReferral.create({
    data: {
      ...referralCommon,
      patientId: patientIds.get("zainab")!,
      status: "PENDING",
      priority: "ROUTINE",
      acceptedAt: null,
      specialty: "PHYSIOTHERAPY",
      discipline: "PHYSIOTHERAPY",
      assignedToId: null,
      reason: "Pre-habilitation before distal pancreatectomy",
      goal: "Establish a baseline and start inspiratory muscle training two weeks pre-operatively",
      clinicalSummary: "Zainab Riaz, listed for distal pancreatectomy in three weeks.",
      surgicalSummary: "Planned distal pancreatectomy and splenectomy",
      precautions: "None yet — pre-operative.",
    },
  });

  await database.clinicalReferral.create({
    data: {
      ...referralCommon,
      patientId: patientIds.get("zainab")!,
      status: "PENDING",
      priority: "ROUTINE",
      acceptedAt: null,
      specialty: "NUTRITION",
      discipline: "NUTRITION",
      assignedToId: null,
      reason: "Pre-operative nutritional optimisation",
      goal: "Correct the pre-operative protein deficit before surgery",
      clinicalSummary: "Zainab Riaz, listed for distal pancreatectomy in three weeks.",
      surgicalSummary: "Planned distal pancreatectomy and splenectomy",
      precautions: "None yet — pre-operative.",
    },
  });

  console.log("→ care plans and referrals linked");

  /* ---- Today's tasks on the patient's phone ---- */

  const yousafPlan = carePlans.get("yousaf")!;

  const tasks = [
    { type: "VITALS_LOG", hour: 8, title: "Morning vitals", instructions: "Blood pressure, pulse, temperature and oxygen saturation." },
    { type: "MEDICATION", hour: 8, title: "Creon 50,000 IU with breakfast", instructions: "Take with the first bite of food, never before." },
    { type: "DRAIN_LOG", hour: 9, title: "Record drain output", instructions: "Empty the bulb, record volume and colour, then recharge the suction." },
    { type: "EXERCISE", hour: 10, title: "Incentive spirometry", instructions: "Ten sustained maximal inspirations every waking hour." },
    { type: "MEAL", hour: 13, title: "Lunch — soft pancreatic diet", instructions: "Poached whitefish, mashed potato, steamed courgette." },
    { type: "MEDICATION", hour: 13, title: "Creon 50,000 IU with lunch", instructions: "Take with the first bite of food." },
    { type: "EXERCISE", hour: 16, title: "Assisted corridor walk", instructions: "150 metres with a caregiver. Stop if pain rises above 6 out of 10." },
    { type: "QUESTIONNAIRE", hour: 19, title: "How are you feeling today?", instructions: "Pain, appetite, nausea and bowel function." },
  ];

  for (const [index, task] of tasks.entries()) {
    await database.carePlanTask.create({
      data: {
        tenantId: tenant.id,
        carePlanId: yousafPlan,
        taskType: task.type as never,
        stageNumber: 2,
        dayNumber: 4,
        scheduledFor: at(0, task.hour),
        dueBy: at(0, task.hour + 2),
        title: task.title,
        instructions: task.instructions,
        status: index < 4 ? "COMPLETED" : "PENDING",
        completedAt: index < 4 ? at(0, task.hour) : null,
        completedByIdentityId: index < 4 ? patientAccount.identityId : null,
      },
    });
  }

  /* ---- An open alert, so the alert console and the deck show one ---- */

  await database.carePlanAlert.create({
    data: {
      tenantId: tenant.id,
      carePlanId: carePlans.get("rukhsana")!,
      patientId: patientIds.get("rukhsana")!,
      severity: "HIGH",
      status: "OPEN",
      title: "Tacrolimus trough outside the target range",
      message:
        "The most recent tacrolimus trough is 14.2 ng/mL against a target of 8–10 ng/mL. Transplant team review requested before the next dose.",
      createdAt: minutesFromNow(-95),
    },
  });

  /* ---- Vitals, drains and symptoms for the portal patient ---- */

  const yousafId = patientIds.get("yousaf")!;

  for (const vital of [
    { code: "temperature", display: "Body Temperature", unit: "°C", series: [37.8, 37.5, 37.2, 37.0, 36.9] },
    { code: "blood_pressure_systolic", display: "Systolic Blood Pressure", unit: "mmHg", series: [138, 134, 131, 128, 126] },
    { code: "blood_pressure_diastolic", display: "Diastolic Blood Pressure", unit: "mmHg", series: [88, 85, 83, 81, 80] },
    { code: "heart_rate", display: "Heart Rate", unit: "bpm", series: [98, 94, 90, 86, 84] },
    { code: "oxygen_saturation", display: "Oxygen Saturation", unit: "%", series: [93, 94, 95, 96, 97] },
  ]) {
    for (const [index, value] of vital.series.entries()) {
      await database.clinicalObservation.create({
        data: {
          tenantId: tenant.id,
          patientId: yousafId,
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

  const drain = await database.patientDrain.create({
    data: {
      tenantId: tenant.id,
      patientId: yousafId,
      label: "Subhepatic drain",
      site: "Subhepatic",
      insertedAt: daysAgo(4),
      isActive: true,
      insertedByMembershipId: surgeonMembership,
      notes: "Placed at the time of pancreaticoduodenectomy.",
    },
  });

  for (const [index, entry] of [
    { volume: 180, colour: "RED", character: "SEROSANGUINOUS", amylase: 320 },
    { volume: 140, colour: "RED", character: "SEROSANGUINOUS", amylase: 240 },
    { volume: 95, colour: "PALE_YELLOW", character: "SEROUS", amylase: 120 },
    { volume: 60, colour: "PALE_YELLOW", character: "SEROUS", amylase: 80 },
    { volume: 45, colour: "PALE_YELLOW", character: "SEROUS", amylase: 55 },
  ].entries()) {
    await database.drainLog.create({
      data: {
        tenantId: tenant.id,
        patientId: yousafId,
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

  for (const symptom of [
    { code: "abdominal_pain", name: "Abdominal pain", series: [7, 6, 5, 4, 3] },
    { code: "nausea", name: "Nausea", series: [5, 4, 4, 2, 2] },
    { code: "appetite_loss", name: "Loss of appetite", series: [8, 7, 6, 5, 4] },
  ]) {
    for (const [index, score] of symptom.series.entries()) {
      await database.symptomLog.create({
        data: {
          tenantId: tenant.id,
          patientId: yousafId,
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

  /* ================================================================
     Physiotherapy and dietetics: the allied clinical record
     ================================================================ */

  const physioStaff = staff.get("physio")!;
  const dietitianStaff = staff.get("dietitian")!;

  for (const entry of [
    { day: -4, mobility: 2, pain: 7, level: "BED_BOUND", resp: "800 mL, shallow, splinting" },
    { day: -3, mobility: 3, pain: 6, level: "CHAIR_TRANSFER", resp: "1000 mL, improving" },
    { day: -2, mobility: 4, pain: 5, level: "ASSISTED_AMBULATION", resp: "1200 mL, clear bilateral" },
    { day: -1, mobility: 6, pain: 4, level: "ASSISTED_AMBULATION", resp: "1350 mL, clear bilateral" },
    { day: 0, mobility: 8, pain: 2, level: "INDEPENDENT_AMBULATION", resp: "1550 mL, clear bilateral" },
  ]) {
    await database.therapyAssessment.create({
      data: {
        tenantId: tenant.id,
        patientId: yousafId,
        assessedByStaffId: physioStaff,
        assessedAt: at(entry.day, 11),
        mobilityScore: entry.mobility,
        painScore: entry.pain,
        respiratoryFunction: entry.resp,
        independenceLevel: entry.level as never,
        surgicalRestrictions: "Rooftop incision — log-roll transfers, no lifting over 5 kg for six weeks",
        goals: "Independent corridor ambulation 150 m by day 8",
      },
    });
  }

  for (const entry of [
    { day: -4, status: "COMPLETED", before: 7, after: 6, spiro: 800, steps: 20, note: "First mobilisation. Sat at the bed edge and tolerated it well." },
    { day: -3, status: "COMPLETED", before: 6, after: 4, spiro: 1000, steps: 60, note: "Chair for two hours. Splinted cough taught to the family caregiver." },
    { day: -2, status: "PATIENT_UNWELL", before: 6, after: 6, spiro: 900, steps: 0, note: "Nauseated after breakfast; session deferred and the surgical team informed." },
    { day: -1, status: "COMPLETED", before: 5, after: 3, spiro: 1350, steps: 160, note: "Corridor walking with drains secured. No desaturation." },
    { day: 0, status: "COMPLETED", before: 4, after: 2, spiro: 1550, steps: 240, note: "Full independent mobility circuit completed without fatigue." },
  ]) {
    await database.therapySession.create({
      data: {
        tenantId: tenant.id,
        patientId: yousafId,
        conductedByStaffId: physioStaff,
        sessionDate: at(entry.day, 15),
        attendanceStatus: entry.status as never,
        painBefore: entry.before,
        painAfter: entry.after,
        spirometryAchievedMl: entry.spiro,
        stepsAchieved: entry.steps,
        progressNotes: entry.note,
      },
    });
  }

  /* ---- Exercises the physiotherapist has authored for this hospital ---- */

  for (const exercise of [
    { name: "Splinted cough over subcostal incision", category: "RESPIRATORY", instruction: "Hug a folded pillow firmly over the incision. Relaxed breath in, two huffs, then a supported cough.", reps: 5, sets: 4, hold: 0, precautions: "Time analgesia before the session. Stop for fresh bleeding." },
    { name: "Drain-aware corridor ambulation", category: "MOBILITY", instruction: "Secure drains below the insertion site on a mobile stand. Walk to the daily distance target with drains carried, never dragged.", reps: 1, sets: 3, hold: 0, precautions: "Check output and character before mobilising." },
    { name: "Low-load limb strengthening for hepatic sarcopenia", category: "STRENGTHENING", instruction: "Seated knee extension, hip abduction and heel raises against body weight or a light band at Borg 11–13.", reps: 12, sets: 3, hold: 3, precautions: "No breath-holding where varices or low platelets are documented." },
  ]) {
    await database.exerciseDefinition.create({
      data: {
        tenantId: tenant.id,
        name: exercise.name,
        category: exercise.category as never,
        instruction: exercise.instruction,
        defaultRepetitions: exercise.reps,
        defaultSets: exercise.sets,
        defaultDurationSeconds: exercise.hold,
        precautions: exercise.precautions,
        isActive: true,
      },
    });
  }

  /* ---- Dietetics ---- */

  for (const entry of [
    { day: -4, weight: 71.0, appetite: 2, gi: "Nil by mouth" },
    { day: -3, weight: 70.2, appetite: 3, gi: "Sips of clear fluid tolerated" },
    { day: -2, weight: 69.4, appetite: 4, gi: "Mild bloating after full liquids" },
    { day: -1, weight: 68.8, appetite: 5, gi: "Early satiety, no steatorrhoea" },
    { day: 0, weight: 68.5, appetite: 6, gi: "Mild bloating after meals, stool formed" },
  ]) {
    await database.nutritionAssessment.create({
      data: {
        tenantId: tenant.id,
        patientId: yousafId,
        assessedByStaffId: dietitianStaff,
        assessedAt: at(entry.day, 12),
        weightKg: entry.weight,
        heightCm: 172,
        bmi: Number((entry.weight / 1.72 ** 2).toFixed(1)),
        weightChangeSinceSurgeryKg: Number((entry.weight - 71).toFixed(1)),
        appetiteScore: entry.appetite,
        giSymptoms: entry.gi,
        enzymeRequirement: true,
        notes: "Enzyme timing reinforced with the family caregiver.",
      },
    });
  }

  const nutritionPlan = await database.nutritionPlan.create({
    data: {
      tenantId: tenant.id,
      patientId: yousafId,
      createdByStaffId: dietitianStaff,
      title: "Post-pancreatectomy dietary recovery plan",
      startDate: daysAgo(1),
      phase: "Phase 3: Soft / Pureed Pancreatic Diet",
      caloricTargetKcal: 1800,
      proteinTargetGrams: 85,
      fluidTargetMl: 2000,
      foodsToAvoid: "High-fat fried foods, raw cruciferous vegetables, carbonated drinks",
      isActive: true,
    },
  });

  for (const [index, item] of [
    { type: "MEAL", name: "Oatmeal with skimmed milk and sliced banana", time: "Breakfast", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 50,000 IU (Pancreatin)", time: "Breakfast", qty: 2, unit: "capsules", withMeal: true },
    { type: "SNACK", name: "High-protein oral nutrition supplement", time: "Mid-morning", qty: 200, unit: "mL", withMeal: false },
    { type: "MEAL", name: "Poached whitefish, mashed potato, steamed courgette", time: "Lunch", qty: 1, unit: "plate", withMeal: false },
    { type: "ENZYME", name: "Creon 50,000 IU (Pancreatin)", time: "Lunch", qty: 2, unit: "capsules", withMeal: true },
    { type: "SNACK", name: "Low-fat yoghurt with stewed apple", time: "Mid-afternoon", qty: 1, unit: "pot", withMeal: false },
    { type: "MEAL", name: "Chicken broth with tender rice and stewed carrot", time: "Dinner", qty: 1, unit: "bowl", withMeal: false },
    { type: "ENZYME", name: "Creon 50,000 IU (Pancreatin)", time: "Dinner", qty: 2, unit: "capsules", withMeal: true },
  ].entries()) {
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

  for (const [index, entry] of [
    { title: "Caring for your abdominal drain at home", category: "DRAIN_CARE", duration: 240 },
    { title: "Pancreatic enzyme replacement — why timing matters", category: "NUTRITION", duration: 300 },
    { title: "Breathing exercises after abdominal surgery", category: "RECOVERY", duration: 180 },
    { title: "Warning signs to call us about", category: "SAFETY", duration: 210 },
    { title: "Living with immunosuppression after a transplant", category: "SAFETY", duration: 360 },
  ].entries()) {
    const content = await database.educationContent.create({
      data: {
        tenantId: tenant.id,
        title: entry.title,
        description: `${entry.title} — written for patients recovering from HPB surgery at ${HOSPITAL}.`,
        category: entry.category,
        contentType: "VIDEO",
        durationSeconds: entry.duration,
        language: "en",
        isActive: true,
        displayOrder: index,
      },
    });

    if (index < 4) {
      await database.educationAssignment.create({
        data: {
          tenantId: tenant.id,
          patientId: yousafId,
          contentId: content.id,
          assignedByMembershipId: surgeonMembership,
          assignedAt: daysAgo(3),
          dueDate: daysAhead(index < 2 ? 2 : 7),
        },
      });
    }
  }

  console.log("→ allied clinical record and education seeded");

  console.log(`\n  ${HOSPITAL} — every portal is looking at the same six patients\n`);
  console.table(
    ACCOUNTS.map((account) => ({
      Portal: [
        account.workspace,
        ...(("alsoHolds" in account ? account.alsoHolds : []) as readonly string[]),
      ].join(" + "),
      Person: account.name,
      Email: `${account.key}@${EMAIL_DOMAIN}`,
      Password: PASSWORD,
    })),
  );

  await database.$disconnect();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
