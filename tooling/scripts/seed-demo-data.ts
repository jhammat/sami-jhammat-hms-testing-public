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

  // ------------------------------------------------------------------- patients
  const patientSeeds = [
    ["Fatima", "Khan", "1988-04-12", "female", "+923001234501"],
    ["Ali", "Raza", "1975-11-02", "male", "+923001234502"],
    ["Hina", "Shaikh", "1993-07-21", "female", "+923001234503"],
    ["Usman", "Tariq", "2016-01-30", "male", "+923001234504"],
    ["Maryam", "Iqbal", "1962-09-15", "female", "+923001234505"],
    ["Ahmed", "Nawaz", "1980-03-08", "male", "+923001234506"],
    ["Zainab", "Farooq", "2001-12-25", "female", "+923001234507"],
    ["Kamran", "Baig", "1970-06-18", "male", "+923001234508"],
    ["Nadia", "Aslam", "1996-02-14", "female", "+923001234509"],
    ["Hassan", "Javed", "2010-08-05", "male", "+923001234510"],
    ["Rabia", "Chaudhry", "1985-05-27", "female", "+923001234511"],
    ["Salman", "Mirza", "1958-10-11", "male", "+923001234512"],
  ] as const;

  const patientIds: string[] = [];
  for (const [index, [givenName, familyName, dob, sex, phone]] of patientSeeds.entries()) {
    const patientNumber = `DEV-${String(index + 100).padStart(4, "0")}`;
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
        status: "ACTIVE",
      },
      update: { givenName, familyName, phone, normalizedPhone: phone, status: "ACTIVE", archivedAt: null },
    });
    patientIds.push(row.id);
  }

  // Keep the pre-existing development patient in the working set.
  const devPatient = await database.patient.findFirst({ where: { tenantId, patientNumber: "DEV-0001" } });
  if (devPatient) patientIds.unshift(devPatient.id);

  // --------------------------------------------------- appointments & encounters
  const today = businessDate(0);
  const services = await database.serviceDefinition.findMany({
    where: { tenantId, isActive: true, doctorId: { not: null } },
  });

  const appointmentPlan = [
    { offset: -7, minute: 9 * 60, status: "COMPLETED" as const },
    { offset: -6, minute: 10 * 60, status: "COMPLETED" as const },
    { offset: -3, minute: 11 * 60, status: "COMPLETED" as const },
    { offset: -2, minute: 14 * 60, status: "NO_SHOW" as const },
    { offset: -1, minute: 15 * 60, status: "COMPLETED" as const },
    { offset: 0, minute: 9 * 60 + 30, status: "CHECKED_IN" as const },
    { offset: 0, minute: 10 * 60 + 30, status: "IN_QUEUE" as const },
    { offset: 0, minute: 11 * 60 + 30, status: "CONFIRMED" as const },
    { offset: 0, minute: 14 * 60 + 30, status: "CONFIRMED" as const },
    { offset: 1, minute: 9 * 60, status: "CONFIRMED" as const },
    { offset: 2, minute: 10 * 60, status: "PENDING" as const },
    { offset: 3, minute: 12 * 60, status: "CONFIRMED" as const },
  ];

  const completedEncounters: { id: string; patientId: string; doctorId: string }[] = [];

  for (const [index, plan] of appointmentPlan.entries()) {
    const service = services[index % services.length]!;
    const patientId = patientIds[index % patientIds.length]!;
    const date = businessDate(plan.offset);
    const startsAt = atMinute(date, plan.minute);
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const idempotencyKey = `demo-appointment-${index}`;

    const appointment = await database.appointment.upsert({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      create: {
        tenantId,
        patientId,
        doctorId: service.doctorId,
        branchId: branch.id,
        serviceId: service.id,
        status: plan.status,
        consultationMode: service.consultationModes[0] ?? "IN_PERSON",
        source: "demo-seed",
        reason: "Routine consultation",
        startsAt,
        endsAt,
        checkedInAt: ["CHECKED_IN", "IN_QUEUE", "COMPLETED"].includes(plan.status) ? startsAt : null,
        idempotencyKey,
      },
      update: { status: plan.status, startsAt, endsAt, patientId, doctorId: service.doctorId, serviceId: service.id },
    });

    if (plan.status === "COMPLETED") {
      const encounter = await database.encounter.upsert({
        where: { appointmentId: appointment.id },
        create: {
          tenantId,
          patientId,
          appointmentId: appointment.id,
          doctorId: service.doctorId,
          branchId: branch.id,
          status: "COMPLETED",
          reason: "Routine consultation",
          startedAt: startsAt,
          endedAt: endsAt,
          signedAt: endsAt,
        },
        update: { status: "COMPLETED", signedAt: endsAt },
      });
      completedEncounters.push({ id: encounter.id, patientId, doctorId: service.doctorId! });
    }
  }

  // ----------------------------------------------------------------- live queue
  const queue = await database.queue.upsert({
    where: { tenantId_branchId_queueDate: { tenantId, branchId: branch.id, queueDate: today } },
    create: { tenantId, branchId: branch.id, queueDate: today, name: "Reception Queue", status: "OPEN", nextTokenNumber: 1 },
    update: { status: "OPEN" },
  });

  const queuePlan = ["COMPLETED", "IN_SERVICE", "WAITING", "WAITING", "WAITING", "CALLED"] as const;
  for (const [index, status] of queuePlan.entries()) {
    const tokenNumber = index + 1;
    await database.queueEntry.upsert({
      where: { queueId_tokenNumber: { queueId: queue.id, tokenNumber } },
      create: {
        tenantId,
        queueId: queue.id,
        patientId: patientIds[index % patientIds.length]!,
        tokenNumber,
        priority: index === 5 ? 1 : 0,
        status,
        calledAt: status === "WAITING" ? null : new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      update: { status },
    });
  }
  await database.queue.update({ where: { id: queue.id }, data: { nextTokenNumber: queuePlan.length + 1 } });

  // ------------------------------------------------------- pharmacy: stock lines
  const medicationSeeds = [
    ["MED-PARA-500", "Paracetamol", "Panadol", "500 mg", "Tablet", "tablet"],
    ["MED-AMOX-500", "Amoxicillin", "Amoxil", "500 mg", "Capsule", "capsule"],
    ["MED-METF-850", "Metformin", "Glucophage", "850 mg", "Tablet", "tablet"],
    ["MED-ATOR-20", "Atorvastatin", "Lipitor", "20 mg", "Tablet", "tablet"],
    ["MED-OMEP-20", "Omeprazole", "Risek", "20 mg", "Capsule", "capsule"],
    ["MED-CETI-10", "Cetirizine", "Zyrtec", "10 mg", "Tablet", "tablet"],
    ["MED-IBUP-400", "Ibuprofen", "Brufen", "400 mg", "Tablet", "tablet"],
    ["MED-AZIT-250", "Azithromycin", "Zithromax", "250 mg", "Tablet", "tablet"],
    ["MED-SALB-INH", "Salbutamol", "Ventolin", "100 mcg", "Inhaler", "inhaler"],
    ["MED-INSU-100", "Insulin Glargine", "Lantus", "100 IU/mL", "Injection", "vial"],
  ] as const;

  const medicationIds: string[] = [];
  for (const [code, genericName, brandName, strength, dosageForm, unit] of medicationSeeds) {
    const medication = await database.medication.upsert({
      where: { tenantId_code: { tenantId, code } },
      create: { tenantId, code, genericName, brandName, strength, dosageForm, unit, isActive: true },
      update: { genericName, brandName, strength, dosageForm, unit, isActive: true },
    });
    medicationIds.push(medication.id);

    // One healthy batch, plus a near-expiry batch to exercise expiry warnings.
    for (const [suffix, days, quantity] of [["A", 400, 500], ["B", 25, 40]] as const) {
      const batchNumber = `BATCH-${code}-${suffix}`;
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

  // ------------------------------------------------------------- prescriptions
  for (const [index, encounter] of completedEncounters.entries()) {
    const existing = await database.prescription.findFirst({
      where: { tenantId, encounterId: encounter.id },
    });
    const prescription =
      existing ??
      (await database.prescription.create({
        data: {
          tenantId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          doctorId: encounter.doctorId,
          status: index === 0 ? "DISPENSED" : "ACTIVE",
          instructions: "Complete the full course. Return if symptoms persist.",
          prescribedAt: new Date(),
          signedAt: new Date(),
        },
      }));

    const itemCount = await database.prescriptionItem.count({ where: { prescriptionId: prescription.id } });
    if (itemCount === 0) {
      for (const offset of [0, 1]) {
        await database.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationId: medicationIds[(index + offset) % medicationIds.length]!,
            dose: "1 tablet",
            route: "Oral",
            frequency: offset === 0 ? "Twice daily" : "Once daily",
            duration: "5 days",
            quantity: offset === 0 ? 10 : 5,
            instructions: "After food",
          },
        });
      }
    }
  }

  // ------------------------------------------------- diagnostics with results
  // The development seed's own orders are deliberately left untouched: the e2e
  // specs claim them as open worklist items. These are separate, already
  // reported orders so the results screens have released history to show.
  const labMembership = await database.tenantMembership.findFirst({
    where: { tenantId, workspaceCodes: { has: "LABORATORY" } },
  });
  const orderingMembership = await database.tenantMembership.findFirst({
    where: { tenantId, workspaceCodes: { has: "DOCTOR" } },
  });

  if (orderingMembership) {
    const panels = [
      { type: "LABORATORY" as const, code: "CBC", name: "Complete Blood Count", site: "Blood" },
      { type: "RADIOLOGY" as const, code: "CXR", name: "Chest X-Ray", site: "Chest" },
    ];

    for (const [index, encounter] of completedEncounters.entries()) {
      for (const panel of panels) {
        const accessionNumber = `DEMO-${panel.type.slice(0, 3)}-${String(index + 1).padStart(4, "0")}`;
        const existing = await database.diagnosticOrder.findFirst({ where: { tenantId, accessionNumber } });
        const order =
          existing ??
          (await database.diagnosticOrder.create({
            data: {
              tenantId,
              branchId: branch.id,
              accessionNumber,
              patientId: encounter.patientId,
              encounterId: encounter.id,
              orderedByMembershipId: orderingMembership.id,
              type: panel.type,
              status: "COMPLETED",
              priority: "routine",
              code: panel.code,
              name: panel.name,
              specimenOrBodySite: panel.site,
              clinicalReason: "Routine screening",
              orderedAt: new Date(),
              completedAt: new Date(),
            },
          }));

        const hasResult = await database.diagnosticResult.findFirst({ where: { orderId: order.id } });
        if (hasResult) continue;

        await database.diagnosticResult.create({
          data: {
            orderId: order.id,
            tenantId,
            status: "FINAL",
            reportText:
              panel.type === "LABORATORY"
                ? "Haemoglobin 13.4 g/dL, WBC 7.2 x10^9/L, Platelets 250 x10^9/L. Within normal limits."
                : "No acute cardiopulmonary abnormality. Heart size normal. Lung fields clear.",
            resultData: { summary: "Reported by demo seed", panel: panel.name },
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
  }

  // ------------------------------------------------------- billing: invoices
  const billingMembership = await database.tenantMembership.findFirst({
    where: { tenantId, workspaceCodes: { has: "BILLING" } },
  });

  const invoicePlan = [
    { status: "PAID" as const, paidRatio: 1 },
    { status: "PAID" as const, paidRatio: 1 },
    { status: "PARTIALLY_PAID" as const, paidRatio: 0.4 },
    { status: "ISSUED" as const, paidRatio: 0 },
    { status: "ISSUED" as const, paidRatio: 0 },
    { status: "DRAFT" as const, paidRatio: 0 },
  ];

  for (const [index, plan] of invoicePlan.entries()) {
    const invoiceNumber = `DEV-INV-${String(index + 1).padStart(5, "0")}`;
    const service = services[index % services.length]!;
    const unitPrice = service.priceMinorUnits ?? 150000;
    const subtotal = unitPrice;
    const discount = index === 2 ? 5000 : 0;
    const total = subtotal - discount;
    const paid = Math.round(total * plan.paidRatio);

    const invoice = await database.invoice.upsert({
      where: { tenantId_invoiceNumber: { tenantId, invoiceNumber } },
      create: {
        tenantId,
        patientId: patientIds[index % patientIds.length]!,
        branchId: branch.id,
        invoiceNumber,
        status: plan.status,
        currencyCode: "PKR",
        subtotalMinor: subtotal,
        discountMinor: discount,
        totalMinor: total,
        paidMinor: paid,
        issuedAt: plan.status === "DRAFT" ? null : new Date(),
        dueAt: businessDate(14),
      },
      update: { status: plan.status, subtotalMinor: subtotal, discountMinor: discount, totalMinor: total, paidMinor: paid },
    });

    const lineCount = await database.invoiceLine.count({ where: { invoiceId: invoice.id } });
    if (lineCount === 0) {
      await database.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          serviceId: service.id,
          description: service.name,
          quantity: 1,
          unitPriceMinor: unitPrice,
          totalMinor: unitPrice,
        },
      });
    }

    if (paid > 0 && billingMembership) {
      const paymentCount = await database.payment.count({ where: { tenantId, invoiceId: invoice.id } });
      if (paymentCount === 0) {
        await database.payment.create({
          data: {
            tenantId,
            invoiceId: invoice.id,
            receivedByMembershipId: billingMembership.id,
            status: "COMPLETED",
            method: index % 2 === 0 ? "cash" : "card",
            amountMinor: paid,
            currencyCode: "PKR",
            reference: `DEMO-PAY-${index + 1}`,
            completedAt: new Date(),
          },
        });
      }
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
  console.log(`\nExtra doctor logins (password: ${password}):`);
  console.table(doctorSeeds.map((seed) => ({ email: `${seed.key}@wonflow.local`, name: seed.name, specialty: seed.specialty })));
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
