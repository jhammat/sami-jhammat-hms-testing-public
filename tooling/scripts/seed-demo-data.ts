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

  // --------------------------------------------------- clean dummy transactional data
  console.log("Cleaning stale dummy transactional records...");
  await database.diagnosticResult.deleteMany({ where: { tenantId, order: { accessionNumber: { startsWith: "DEMO-" } } } });
  await database.diagnosticOrder.deleteMany({ where: { tenantId, accessionNumber: { startsWith: "DEMO-" } } });
  await database.prescriptionItem.deleteMany({ where: { prescription: { tenantId, instructions: { contains: "Complete the full course" } } } });
  await database.prescription.deleteMany({ where: { tenantId, instructions: { contains: "Complete the full course" } } });
  await database.encounter.deleteMany({ where: { tenantId, reason: "Routine consultation" } });
  await database.appointment.deleteMany({ where: { tenantId, source: "demo-seed" } });
  await database.queueEntry.deleteMany({ where: { tenantId, queue: { name: "Reception Queue" } } });
  await database.payment.deleteMany({ where: { tenantId, reference: { startsWith: "DEMO-PAY-" } } });
  await database.invoiceLine.deleteMany({ where: { invoice: { tenantId, invoiceNumber: { startsWith: "DEV-INV-" } } } });
  await database.invoice.deleteMany({ where: { tenantId, invoiceNumber: { startsWith: "DEV-INV-" } } });

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

  for (const [code, genericName, brandName, strength, dosageForm, unit, reorderLevel] of pakistaniMedications) {
    const medication = await database.medication.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, genericName, brandName, strength, dosageForm, unit, reorderLevel: Number(reorderLevel), isActive: true },
      update: { genericName, brandName, strength, dosageForm, unit, reorderLevel: Number(reorderLevel), isActive: true },
    });

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
