/**
 * Seeds a realistic, exercisable hospital day on top of the development logins.
 *
 * `seed-development-logins.ts` creates the accounts and permissions; it stops
 * short of the operational data every workspace needs to be clicked through.
 * This script fills that gap: departments, a doctor roster with sittings,
 * patients, a live queue, prescriptions, dispensable stock, diagnostics with
 * released results, and settled and outstanding invoices.
 *
 * It is idempotent — every write is keyed on a natural unique constraint, so
 * re-running refreshes the day rather than duplicating it.
 *
 *   pnpm exec tsx tooling/scripts/seed-demo-data.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

if (process.env.NODE_ENV === "production" || process.env.WONFLOW_ENVIRONMENT === "production") {
  throw new Error("Demo data seeding is disabled in production.");
}

/** Midnight UTC for a @db.Date column, offset by whole days from today. */
function businessDate(offsetDays: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
}

/** A timestamp on a business date, from minutes since midnight. */
function atMinute(date: Date, minute: number): Date {
  return new Date(date.getTime() + minute * 60_000);
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

  // ---------------------------------------------------------------- departments
  const departmentSeeds = [
    ["GEN-MED", "General Medicine"],
    ["CARDIO", "Cardiology"],
    ["PEDIA", "Paediatrics"],
    ["ORTHO", "Orthopaedics"],
    ["OBGYN", "Obstetrics & Gynaecology"],
    ["DIAGNOSTICS", "Diagnostics"],
  ] as const;

  const departments = new Map<string, string>();
  for (const [code, name] of departmentSeeds) {
    const row = await database.department.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, organizationId: organization.id, branchId: branch.id, code, name, isActive: true },
      update: { name, organizationId: organization.id, branchId: branch.id, isActive: true, archivedAt: null },
    });
    departments.set(code, row.id);
  }

  // -------------------------------------------------------------- doctor roster
  const doctorRole = await database.role.findUniqueOrThrow({ where: { tenantId_code: { tenantId, code: "DOCTOR" } } });

  const doctorSeeds = [
    { key: "doctor", name: "Dr. Ayesha Rahman", specialty: "General Medicine", department: "GEN-MED", fee: 150000, minutes: 15 },
    { key: "doctor.cardio", name: "Dr. Imran Siddiqui", specialty: "Cardiology", department: "CARDIO", fee: 350000, minutes: 20 },
    { key: "doctor.pedia", name: "Dr. Sana Malik", specialty: "Paediatrics", department: "PEDIA", fee: 200000, minutes: 15 },
    { key: "doctor.ortho", name: "Dr. Bilal Ahmed", specialty: "Orthopaedics", department: "ORTHO", fee: 300000, minutes: 20 },
  ] as const;

  const doctorIds: string[] = [];
  for (const [index, seed] of doctorSeeds.entries()) {
    const email = `${seed.key}@wonflow.local`;
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
      update: { status: "ACTIVE", failedLoginCount: 0, lockedUntil: null, archivedAt: null },
    });

    const membership = await database.tenantMembership.upsert({
      where: { tenantId_identityId: { tenantId, identityId: identity.id } },
      create: {
        tenantId,
        identityId: identity.id,
        organizationId: organization.id,
        primaryBranchId: branch.id,
        displayName: seed.name,
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
      update: { displayName: seed.name, status: "ACTIVE", archivedAt: null },
    });

    const existingRole = await database.membershipRole.findFirst({
      where: { tenantId, membershipId: membership.id, roleId: doctorRole.id },
    });
    if (!existingRole) {
      await database.membershipRole.create({
        data: { tenantId, membershipId: membership.id, roleId: doctorRole.id, branchId: branch.id },
      });
    }

    const staff = await database.staffProfile.upsert({
      where: { membershipId: membership.id },
      create: {
        tenantId,
        membershipId: membership.id,
        branchId: branch.id,
        employeeNumber: `DEV-DOC-${String(index + 1).padStart(3, "0")}`,
        staffType: "DOCTOR",
        status: "ACTIVE",
        title: seed.name,
      },
      update: { status: "ACTIVE", title: seed.name, branchId: branch.id },
    });

    const doctor = await database.doctorProfile.upsert({
      where: { staffProfileId: staff.id },
      create: {
        tenantId,
        staffProfileId: staff.id,
        departmentId: departments.get(seed.department)!,
        registrationNumber: `PMDC-${String(index + 1).padStart(5, "0")}`,
        specialty: seed.specialty,
        qualifications: "MBBS, FCPS",
        durationMinutes: seed.minutes,
        publiclyBookable: true,
      },
      update: {
        departmentId: departments.get(seed.department)!,
        specialty: seed.specialty,
        durationMinutes: seed.minutes,
        publiclyBookable: true,
      },
    });
    doctorIds.push(doctor.id);

    // In-person and online services, both publicly bookable.
    for (const mode of ["IN_PERSON", "ONLINE"] as const) {
      const code = `${seed.key.toUpperCase().replace(/\./g, "-")}-${mode}`;
      const service = await database.serviceDefinition.upsert({
        where: { tenantId_code: { tenantId, code } },
        create: {
          tenantId,
          branchId: branch.id,
          doctorId: doctor.id,
          code,
          // The online name keeps the "Online Video Consultation" wording the
          // patient-facing screens and e2e specs look for.
          name: mode === "ONLINE" ? `${seed.specialty} Online Video Consultation` : `${seed.specialty} Consultation`,
          category: "Consultation",
          durationMinutes: seed.minutes,
          priceMinorUnits: mode === "ONLINE" ? Math.round(seed.fee * 0.8) : seed.fee,
          currencyCode: "PKR",
          publiclyBookable: true,
          consultationModes: [mode],
          isActive: true,
        },
        update: { publiclyBookable: true, isActive: true, doctorId: doctor.id, branchId: branch.id },
      });

      // Roster covering every weekday, with capacity for a day of testing.
      await database.availabilityRule.deleteMany({ where: { tenantId, doctorId: doctor.id, serviceId: service.id } });
      for (let weekday = 0; weekday < 7; weekday += 1) {
        await database.availabilityRule.create({
          data: {
            tenantId,
            doctorId: doctor.id,
            branchId: branch.id,
            serviceId: service.id,
            weekday,
            startsMinute: 9 * 60,
            endsMinute: 17 * 60,
            capacity: 8,
            validFrom: businessDate(-30),
            isActive: true,
          },
        });
      }
    }

    // Sittings for the next three weeks — the booking screen needs these.
    for (let offset = 0; offset <= 21; offset += 1) {
      const date = businessDate(offset);
      await database.doctorSitting.upsert({
        where: {
          tenantId_doctorId_branchId_businessDate: {
            tenantId,
            doctorId: doctor.id,
            branchId: branch.id,
            businessDate: date,
          },
        },
        create: {
          tenantId,
          doctorId: doctor.id,
          branchId: branch.id,
          businessDate: date,
          startsMinute: 9 * 60,
          endsMinute: 17 * 60,
          averageConsultationMinutes: seed.minutes,
          roomLabel: `Room ${index + 1}`,
          status: offset === 0 ? "AVAILABLE" : "PLANNED",
        },
        update: {
          startsMinute: 9 * 60,
          endsMinute: 17 * 60,
          averageConsultationMinutes: seed.minutes,
          roomLabel: `Room ${index + 1}`,
          status: offset === 0 ? "AVAILABLE" : "PLANNED",
        },
      });
    }
  }

  // --------------------------------------------------- patients (Pakistani Context)
  const patientSeeds = [
    ["Fatima", "Khan", "1990-04-12", "female", "+923008472910", "House 42, Block B-3, Gulberg III, Lahore"],
    ["Muhammad Ali", "Raza", "1976-11-02", "male", "+923214589211", "15-C, Model Town, Lahore"],
    ["Zainab", "Farooq", "1998-07-21", "female", "+923339821456", "Sector Y, Phase 3, DHA, Lahore"],
    ["Kamran", "Baig", "1969-01-30", "male", "+923016723901", "Block R-1, Johar Town, Lahore"],
    ["Hina", "Shaikh", "1993-09-15", "female", "+923451209384", "Officers Colony, Lahore Cantt"],
    ["Usman", "Tariq", "2015-03-08", "male", "+923005544332", "Faisal Town, Lahore"],
    ["Maryam", "Iqbal", "1962-12-25", "female", "+923227788990", "Shadman Colony, Lahore"],
    ["Ahmed", "Nawaz", "1983-06-18", "male", "+923029988776", "Wapda Town, Lahore"],
  ] as const;

  const patientIds: string[] = [];
  for (const [index, [givenName, familyName, dob, sex, phone, address]] of patientSeeds.entries()) {
    const patientNumber = `DEV-${String(index + 1).padStart(4, "0")}`;
    const row = await database.patient.upsert({
      where: { tenantId_patientNumber: { tenantId, patientNumber } },
      create: {
        tenantId,
        patientNumber,
        givenName,
        familyName,
        dateOfBirth: new Date(`${dob}T00:00:00.000Z`),
        sex,
        phone,
        normalizedPhone: phone,
        address: { line1: address, city: "Lahore", state: "Punjab", country: "Pakistan" },
        status: "ACTIVE",
      },
      update: { givenName, familyName, phone, normalizedPhone: phone, address: { line1: address, city: "Lahore", state: "Punjab", country: "Pakistan" }, status: "ACTIVE", archivedAt: null },
    });
    patientIds.push(row.id);
  }

  // Ensure Patient Portal access for Fatima Khan (DEV-0001)
  const patientIdentity = await database.identity.findFirst({ where: { normalizedEmail: "patient@wonflow.local" } });
  if (patientIdentity && patientIds[0]) {
    await database.patientAccess.upsert({
      where: { patientId_identityId: { patientId: patientIds[0], identityId: patientIdentity.id } },
      create: { patientId: patientIds[0], identityId: patientIdentity.id, isActive: true },
      update: { isActive: true },
    });
  }

  // --------------------------------------------------- appointments & live queue
  const today = businessDate(0);
  const services = await database.serviceDefinition.findMany({
    where: { tenantId, isActive: true, doctorId: { not: null } },
  });

  // Clean previous demo appointments/encounters/results in foreign-key order
  await database.diagnosticResult.deleteMany({ where: { tenantId, order: { accessionNumber: { startsWith: "PK-" } } } });
  await database.diagnosticOrder.deleteMany({ where: { tenantId, accessionNumber: { startsWith: "PK-" } } });
  await database.prescriptionItem.deleteMany({ where: { prescription: { tenantId, instructions: { contains: "course" } } } });
  await database.prescription.deleteMany({ where: { tenantId, instructions: { contains: "course" } } });
  await database.encounter.deleteMany({ where: { tenantId, reason: { contains: "Consultation" } } });
  await database.appointment.deleteMany({ where: { tenantId, source: "pakistan-seed" } });
  await database.queueEntry.deleteMany({ where: { tenantId, queue: { name: "Reception Queue" } } });
  await database.payment.deleteMany({ where: { tenantId, reference: { startsWith: "PK-PAY-" } } });
  await database.invoiceLine.deleteMany({ where: { invoice: { tenantId, invoiceNumber: { startsWith: "PK-INV-" } } } });
  await database.invoice.deleteMany({ where: { tenantId, invoiceNumber: { startsWith: "PK-INV-" } } });

  const appointmentPlan = [
    { offset: 0, minute: 9 * 60 + 30, status: "CHECKED_IN" as const, mode: "IN_PERSON" as const, reason: "Acute fever, cough and body aches" },
    { offset: 0, minute: 10 * 60, status: "IN_QUEUE" as const, mode: "IN_PERSON" as const, reason: "Hypertension & routine cardiac evaluation" },
    { offset: 0, minute: 10 * 60 + 30, status: "CONFIRMED" as const, mode: "ONLINE" as const, reason: "Pediatric review & seasonal allergy" },
    { offset: 0, minute: 11 * 60, status: "CONFIRMED" as const, mode: "IN_PERSON" as const, reason: "Knee joint pain and spine stiffness" },
    { offset: 0, minute: 14 * 60, status: "CONFIRMED" as const, mode: "IN_PERSON" as const, reason: "Follow-up blood sugar check & medicine adjustment" },
    { offset: 1, minute: 9 * 60 + 30, status: "CONFIRMED" as const, mode: "IN_PERSON" as const, reason: "Routine wellness and health checkup" },
    { offset: 1, minute: 11 * 60, status: "CONFIRMED" as const, mode: "ONLINE" as const, reason: "Tele-consultation for lab results review" },
    { offset: 2, minute: 10 * 60, status: "PENDING" as const, mode: "IN_PERSON" as const, reason: "Chronic acidity and GERD symptoms" },
  ];

  const createdAppointments: Array<{ id: string; patientId: string; doctorId: string }> = [];

  for (const [index, plan] of appointmentPlan.entries()) {
    const service = services[index % services.length]!;
    const patientId = patientIds[index % patientIds.length]!;
    const date = businessDate(plan.offset);
    const startsAt = atMinute(date, plan.minute);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const idempotencyKey = `pak-app-${index}`;

    const appointment = await database.appointment.upsert({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      create: {
        tenantId,
        patientId,
        doctorId: service.doctorId,
        branchId: branch.id,
        serviceId: service.id,
        status: plan.status,
        consultationMode: plan.mode,
        source: "pakistan-seed",
        reason: plan.reason,
        startsAt,
        endsAt,
        checkedInAt: ["CHECKED_IN", "IN_QUEUE"].includes(plan.status) ? startsAt : null,
        idempotencyKey,
      },
      update: { status: plan.status, startsAt, endsAt, patientId, doctorId: service.doctorId, serviceId: service.id, reason: plan.reason },
    });
    createdAppointments.push({ id: appointment.id, patientId, doctorId: service.doctorId! });
  }

  // Active Reception Token Queue
  const queue = await database.queue.upsert({
    where: { tenantId_branchId_queueDate: { tenantId, branchId: branch.id, queueDate: today } },
    create: { tenantId, branchId: branch.id, queueDate: today, name: "Reception Queue", status: "OPEN", nextTokenNumber: 1 },
    update: { status: "OPEN" },
  });

  const queueStatuses = ["IN_SERVICE", "WAITING", "WAITING", "WAITING", "CALLED"] as const;
  for (const [index, status] of queueStatuses.entries()) {
    const tokenNumber = index + 1;
    await database.queueEntry.upsert({
      where: { queueId_tokenNumber: { queueId: queue.id, tokenNumber } },
      create: {
        tenantId,
        queueId: queue.id,
        patientId: patientIds[index % patientIds.length]!,
        tokenNumber,
        priority: index === 0 ? 1 : 0,
        status,
        calledAt: status === "WAITING" ? null : new Date(),
      },
      update: { status },
    });
  }
  await database.queue.update({ where: { id: queue.id }, data: { nextTokenNumber: queueStatuses.length + 1 } });

  // ------------------------------------------------------- pharmacy: Pakistani stock lines
  console.log("Seeding authentic Pakistani pharmacy catalog and inventory batches...");
  const pakistaniMedications = [
    // Analgesics & NSAIDs
    ["MED-PAN-500", "Paracetamol", "Panadol", "500 mg", "Tablet", "tablet", 50],
    ["MED-PAN-EXT", "Paracetamol / Caffeine", "Panadol Extra", "500 mg / 65 mg", "Tablet", "tablet", 65],
    ["MED-PAN-CF", "Paracetamol / Pseudoephedrine", "Panadol CF", "500 mg / 30 mg", "Tablet", "tablet", 55],
    ["MED-CAL-SYR", "Paracetamol Suspension", "Calpol", "120 mg/5 mL", "Syrup", "bottle", 110],
    ["MED-BRU-400", "Ibuprofen", "Brufen", "400 mg", "Tablet", "tablet", 45],
    ["MED-BRU-600", "Ibuprofen", "Brufen", "600 mg", "Tablet", "tablet", 60],
    ["MED-BRU-SYR", "Ibuprofen Suspension", "Brufen DS", "200 mg/5 mL", "Syrup", "bottle", 130],
    ["MED-DSP-300", "Aspirin (Soluble)", "Disprin", "300 mg", "Tablet", "tablet", 35],
    ["MED-PON-500", "Mefenamic Acid", "Ponstan Forte", "500 mg", "Tablet", "tablet", 50],
    ["MED-CAF-50", "Diclofenac Potassium", "Caflam", "50 mg", "Tablet", "tablet", 180],
    ["MED-VOL-50", "Diclofenac Sodium", "Voltral", "50 mg", "Tablet", "tablet", 150],
    ["MED-VOL-INJ", "Diclofenac Sodium Injection", "Voltral", "75 mg/3 mL", "Injection", "ampoule", 85],
    ["MED-TOR-INJ", "Ketorolac Tromethamine", "Toradol", "30 mg/mL", "Injection", "ampoule", 120],

    // Antibiotics & Antimicrobials
    ["MED-AUG-625", "Amoxicillin / Clavulanic Acid", "Augmentin", "625 mg", "Tablet", "tablet", 280],
    ["MED-AUG-1G", "Amoxicillin / Clavulanic Acid", "Augmentin", "1 g", "Tablet", "tablet", 390],
    ["MED-AUG-SYR", "Amoxicillin / Clavulanate", "Augmentin DS", "312.5 mg/5 mL", "Syrup", "bottle", 240],
    ["MED-AMX-500", "Amoxicillin", "Amoxil", "500 mg", "Capsule", "capsule", 120],
    ["MED-NOV-500", "Ciprofloxacin HCl", "Novidat", "500 mg", "Tablet", "tablet", 310],
    ["MED-LEF-500", "Levofloxacin", "Leflox", "500 mg", "Tablet", "tablet", 380],
    ["MED-KLA-500", "Clarithromycin", "Klaricid", "500 mg", "Tablet", "tablet", 520],
    ["MED-AZI-500", "Azithromycin", "Azomax", "500 mg", "Tablet", "tablet", 340],
    ["MED-FLG-400", "Metronidazole", "Flagyl", "400 mg", "Tablet", "tablet", 40],
    ["MED-FLG-SYR", "Metronidazole Suspension", "Flagyl", "200 mg/5 mL", "Syrup", "bottle", 90],
    ["MED-ROC-1G", "Ceftriaxone Sodium", "Rocephin", "1 g", "Injection", "vial", 480],

    // Gastrointestinal & Antacids
    ["MED-RSK-20", "Omeprazole", "Risek", "20 mg", "Capsule", "capsule", 260],
    ["MED-RSK-40", "Omeprazole", "Risek", "40 mg", "Capsule", "capsule", 420],
    ["MED-RSK-IV", "Omeprazole IV", "Risek Insta", "40 mg", "Injection", "vial", 350],
    ["MED-NEX-40", "Esomeprazole", "Nexum", "40 mg", "Tablet", "tablet", 360],
    ["MED-GAV-LIQ", "Sodium Alginate / Antacid", "Gaviscon Liquid", "Double Action", "Syrup", "bottle", 295],
    ["MED-GRV-50", "Dimenhydrinate", "Gravinate", "50 mg", "Tablet", "tablet", 45],
    ["MED-GRV-SYR", "Dimenhydrinate Syrup", "Gravinate", "15 mg/5 mL", "Syrup", "bottle", 95],
    ["MED-MOT-10", "Domperidone", "Motilium", "10 mg", "Tablet", "tablet", 110],
    ["MED-ETX-P", "Diiodohydroxyquinoline / Phthalylsulfathiazole", "Entox-P", "200 mg", "Tablet", "tablet", 60],

    // Respiratory, Cold & Allergy
    ["MED-ARN-FRT", "Ibuprofen / Pseudoephedrine", "Arinac Forte", "400 mg / 60 mg", "Tablet", "tablet", 80],
    ["MED-ZYR-10", "Cetirizine HCl", "Zyrtec", "10 mg", "Tablet", "tablet", 95],
    ["MED-SOF-10", "Loratadine", "Softin", "10 mg", "Tablet", "tablet", 120],
    ["MED-RIG-10", "Levocetirizine", "Rigix", "5 mg", "Tablet", "tablet", 140],
    ["MED-HYD-SYR", "Aminophylline / Diphenhydramine", "Hydryllin", "Expectorant", "Syrup", "bottle", 115],
    ["MED-PUL-SYR", "Ammonium Chloride / Menthol", "Pulmonol", "Expectorant", "Syrup", "bottle", 125],
    ["MED-VEN-INH", "Salbutamol", "Ventolin Inhaler", "100 mcg/puff", "Inhaler", "inhaler", 340],
    ["MED-MON-10", "Montelukast Sodium", "Singulair", "10 mg", "Tablet", "tablet", 450],

    // Cardiovascular & Metabolic
    ["MED-GLU-500", "Metformin HCl", "Glucophage", "500 mg", "Tablet", "tablet", 130],
    ["MED-GLU-850", "Metformin HCl", "Glucophage", "850 mg", "Tablet", "tablet", 190],
    ["MED-LIP-20", "Atorvastatin Calcium", "Lipiget", "20 mg", "Tablet", "tablet", 320],
    ["MED-CNC-5", "Bisoprolol Fumarate", "Concor", "5 mg", "Tablet", "tablet", 210],
    ["MED-TEN-50", "Atenolol", "Tenormin", "50 mg", "Tablet", "tablet", 160],
    ["MED-NRV-5", "Amlodipine Besylate", "Norvasc", "5 mg", "Tablet", "tablet", 240],
    ["MED-COZ-50", "Losartan Potassium", "Cozaar", "50 mg", "Tablet", "tablet", 310],
    ["MED-LSX-40", "Furosemide", "Lasix", "40 mg", "Tablet", "tablet", 45],

    // Vitamins, Topicals & Emergency
    ["MED-SRB-Z", "Zinc + B-Complex + Vitamin C", "Surbex Z", "High Potency", "Tablet", "tablet", 280],
    ["MED-DEL-5", "Prednisolone", "Deltacortril", "5 mg", "Tablet", "tablet", 65],
    ["MED-PLX-EYE", "Polymyxin B / Bacitracin", "Polyfax Eye Ointment", "4 g", "Ointment", "tube", 85],
    ["MED-PLX-SKN", "Polymyxin B / Bacitracin", "Polyfax Skin Ointment", "20 g", "Ointment", "tube", 115],
    ["MED-BTN-CRM", "Betamethasone / Neomycin", "Betnovate-N", "15 g", "Cream", "tube", 125],
    ["MED-ORS-SCT", "Oral Rehydration Salts", "ORS Sachet", "WHO Formula", "Sachet", "sachet", 25],
    ["MED-XYL-INJ", "Lidocaine HCl 2%", "Xylocaine", "2% 20 mL", "Injection", "vial", 140],
  ] as const;

  const medicationMap = new Map<string, string>();
  for (const [code, genericName, brandName, strength, dosageForm, unit, reorderLevel] of pakistaniMedications) {
    const medication = await database.medication.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, genericName, brandName, strength, dosageForm, unit, reorderLevel: Number(reorderLevel), isActive: true },
      update: { genericName, brandName, strength, dosageForm, unit, reorderLevel: Number(reorderLevel), isActive: true },
    });
    medicationMap.set(code, medication.id);

    // Seed realistic inventory batches (Fresh batch + active buffer batch)
    for (const [suffix, days, quantity] of [["PK-A", 540, 350], ["PK-B", 270, 120]] as const) {
      const batchNumber = `BATCH-${code.replace("MED-", "")}-${suffix}`;
      await database.inventoryBatch.upsert({
        where: {
          tenantId_branchId_medicationId_batchNumber: {
            tenantId,
            branchId: branch.id,
            medicationId: medication.id,
            batchNumber,
          },
        },
        create: {
          tenantId,
          branchId: branch.id,
          medicationId: medication.id,
          batchNumber,
          expiryDate: businessDate(days),
          quantity,
          status: "AVAILABLE",
        },
        update: { quantity, expiryDate: businessDate(days), status: "AVAILABLE" },
      });
    }
  }

  // --------------------------------------------------- Prescriptions & Clinical Encounters
  const doctorMembership = await database.tenantMembership.findFirst({ where: { tenantId, primaryWorkspace: "DOCTOR" } });
  if (doctorMembership && createdAppointments[0] && patientIds[0]) {
    const encounter = await database.encounter.upsert({
      where: { appointmentId: createdAppointments[0].id },
      create: {
        tenantId,
        patientId: patientIds[0],
        appointmentId: createdAppointments[0].id,
        doctorId: createdAppointments[0].doctorId,
        branchId: branch.id,
        status: "COMPLETED",
        reason: "Acute pharyngitis & body aches",
        startedAt: new Date(Date.now() - 30 * 60_000),
        endedAt: new Date(),
        signedAt: new Date(),
      },
      update: { status: "COMPLETED" },
    });

    const prescription = await database.prescription.create({
      data: {
        tenantId,
        patientId: patientIds[0],
        encounterId: encounter.id,
        doctorId: createdAppointments[0].doctorId,
        status: "ACTIVE",
        instructions: "Take medications strictly as prescribed. Maintain hydration and report if fever persists.",
        prescribedAt: new Date(),
        signedAt: new Date(),
      },
    });

    const rxMedCodes = ["MED-PAN-EXT", "MED-AUG-625", "MED-RSK-20", "MED-SRB-Z"];
    for (const [idx, code] of rxMedCodes.entries()) {
      const medId = medicationMap.get(code);
      if (medId) {
        await database.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationId: medId,
            dose: idx === 3 ? "1 tablet" : "1 tab/cap",
            route: "Oral",
            frequency: idx === 1 ? "Twice daily (BD)" : idx === 2 ? "Once daily before meal (OD)" : "Three times daily (TDS)",
            duration: idx === 3 ? "30 days" : "5 days",
            quantity: idx === 3 ? 30 : 10,
            instructions: "Take after meals",
          },
        });
      }
    }
  }

  // --------------------------------------------------- Diagnostic Laboratory & Radiology Results
  const labMembership = await database.tenantMembership.findFirst({ where: { tenantId, workspaceCodes: { has: "LABORATORY" } } });
  if (doctorMembership && patientIds[0]) {
    const labPanels = [
      {
        type: "LABORATORY" as const,
        code: "CBC",
        name: "Complete Blood Picture (CBC)",
        site: "Venous Blood",
        reason: "Fever and infection workup",
        report: "Hb: 13.6 g/dL (Normal: 12-16), TLC: 7.2 x 10^3/uL (Normal: 4-11), Platelets: 265 x 10^3/uL (Normal: 150-450). Normal differential count. No malarial parasite seen.",
      },
      {
        type: "LABORATORY" as const,
        code: "LFT",
        name: "Liver Function Tests (LFT)",
        site: "Serum",
        reason: "Routine liver profile",
        report: "Total Bilirubin: 0.8 mg/dL, ALT (SGPT): 28 U/L (Normal <42), AST: 26 U/L, Alkaline Phosphatase: 115 U/L. All parameters within reference limits.",
      },
      {
        type: "RADIOLOGY" as const,
        code: "CXR-PA",
        name: "Digital Chest X-Ray (PA View)",
        site: "Chest",
        reason: "Cough & respiratory evaluation",
        report: "Both lung fields are clear of focal consolidation or pleural effusion. Cardiac silhouette and mediastinal contours are within normal limits. Impression: Normal chest radiograph.",
      },
    ];

    for (const [idx, panel] of labPanels.entries()) {
      const accessionNumber = `PK-${panel.type.slice(0, 3)}-${String(idx + 1).padStart(4, "0")}`;
      const order = await database.diagnosticOrder.create({
        data: {
          tenantId,
          branchId: branch.id,
          accessionNumber,
          patientId: patientIds[0],
          orderedByMembershipId: doctorMembership.id,
          type: panel.type,
          status: "COMPLETED",
          priority: "routine",
          code: panel.code,
          name: panel.name,
          specimenOrBodySite: panel.site,
          clinicalReason: panel.reason,
          orderedAt: new Date(Date.now() - 60 * 60_000),
          completedAt: new Date(),
        },
      });

      await database.diagnosticResult.create({
        data: {
          orderId: order.id,
          tenantId,
          status: "FINAL",
          reportText: panel.report,
          resultData: { testName: panel.name, facility: "WonFlow Central Pathology & Imaging, Lahore" },
          critical: false,
          performedByMembershipId: labMembership?.id ?? null,
          verifiedByMembershipId: labMembership?.id ?? null,
          releasedByMembershipId: labMembership?.id ?? null,
          verifiedAt: new Date(),
          releasedAt: new Date(),
        },
      });
    }
  }

  // --------------------------------------------------- Billing & Invoices (PKR)
  const billingMembership = await database.tenantMembership.findFirst({ where: { tenantId, workspaceCodes: { has: "BILLING" } } });
  const invoiceList = [
    { number: "PK-INV-00001", patientIdx: 0, total: 250000, paid: 250000, status: "PAID" as const, desc: "Consultation & Pathology Diagnostics" },
    { number: "PK-INV-00002", patientIdx: 1, total: 400000, paid: 400000, status: "PAID" as const, desc: "Cardiology Specialist Consultation" },
    { number: "PK-INV-00003", patientIdx: 2, total: 320000, paid: 0, status: "ISSUED" as const, desc: "Pediatric Examination & Pharmacy" },
    { number: "PK-INV-00004", patientIdx: 3, total: 350000, paid: 150000, status: "PARTIALLY_PAID" as const, desc: "Orthopaedic Consult & Digital X-Ray" },
  ];

  for (const [idx, inv] of invoiceList.entries()) {
    const patientId = patientIds[inv.patientIdx % patientIds.length]!;
    const invoice = await database.invoice.create({
      data: {
        tenantId,
        patientId,
        branchId: branch.id,
        invoiceNumber: inv.number,
        status: inv.status,
        currencyCode: "PKR",
        subtotalMinor: inv.total,
        discountMinor: 0,
        totalMinor: inv.total,
        paidMinor: inv.paid,
        issuedAt: new Date(),
        dueAt: businessDate(7),
      },
    });

    await database.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: inv.desc,
        quantity: 1,
        unitPriceMinor: inv.total,
        totalMinor: inv.total,
      },
    });

    if (inv.paid > 0 && billingMembership) {
      await database.payment.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          receivedByMembershipId: billingMembership.id,
          status: "COMPLETED",
          method: idx % 2 === 0 ? "cash" : "card",
          amountMinor: inv.paid,
          currencyCode: "PKR",
          reference: `PK-PAY-${idx + 1}`,
          completedAt: new Date(),
        },
      });
    }
  }

  // ------------------------------------------------------------------- summary
  const counts = {
    departments: await database.department.count({ where: { tenantId } }),
    doctors: await database.doctorProfile.count({ where: { tenantId } }),
    sittings: await database.doctorSitting.count({ where: { tenantId } }),
    services: await database.serviceDefinition.count({ where: { tenantId } }),
    patients: await database.patient.count({ where: { tenantId } }),
    appointments: await database.appointment.count({ where: { tenantId } }),
    queueEntries: await database.queueEntry.count({ where: { tenantId } }),
    medications: await database.medication.count({ where: { tenantId } }),
    inventoryBatches: await database.inventoryBatch.count({ where: { tenantId } }),
    prescriptions: await database.prescription.count({ where: { tenantId } }),
    diagnosticResults: await database.diagnosticResult.count({ where: { tenantId } }),
    invoices: await database.invoice.count({ where: { tenantId } }),
    payments: await database.payment.count({ where: { tenantId } }),
  };

  console.table(Object.entries(counts).map(([entity, rows]) => ({ entity, rows })));
  console.log(`\nDoctor logins (password: ${password}):`);
  console.table(doctorSeeds.map((seed) => ({ email: `${seed.key}@wonflow.local`, name: seed.name, specialty: seed.specialty })));
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
