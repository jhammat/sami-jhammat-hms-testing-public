/**
 * Cross-portal integration test, driven entirely over HTTP against a running
 * server — the same requests the browser makes.
 *
 * It answers two questions the unit tests cannot:
 *
 *   1. Isolation — one doctor's patients, appointments and queue entries must
 *      not be visible or actionable by another doctor in the same hospital.
 *   2. Propagation — an action taken in one portal must show up in every other
 *      portal that depends on it. A lab order placed by a doctor has to reach
 *      the laboratory worklist; a released result has to reach both the
 *      ordering doctor and the patient; a prescription has to reach pharmacy;
 *      an invoice has to reach the patient's billing view.
 *
 * Run with the dev server up:  npx tsx apps/web/tests/integration-http/cross-portal.ts
 */
import { database } from "@wonflow/database";

const BASE = process.env.WONFLOW_BASE_URL ?? "http://127.0.0.1:3007";
const PW = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";
const db: any = database;

const TENANT = "31ae60b2-3de5-4ecf-99ed-117d04152340"; // wonflow-development

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; failures.push(`${name} :: ${detail}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

async function login(email: string, password = PW, audience: "hospital" | "patient" = "hospital") {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, audience }),
  });
  const raw = res.headers.get("set-cookie") ?? "";
  const cookie = raw.split(/,(?=\s*\w+=)/).map((c) => c.split(";")[0]).join("; ");
  return { status: res.status, cookie, body: await res.text() };
}

async function api(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* html or empty */ }
  return { status: res.status, json, text, isJson: text.trim().startsWith("{") || text.trim().startsWith("[") };
}

const businessDay = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(at);

/** Creates a doctor through the real admin invite flow and returns usable credentials. */
async function createDoctor(adminCookie: string, label: string, departmentId: string, primaryBranchId: string) {
  const email = `qa.xportal.${label}.${Date.now()}@wonflow.local`;
  const invite = await api(adminCookie, "POST", "/api/v1/admin/users/invitations", {
    email, displayName: `QA ${label}`, workspaceCodes: ["DOCTOR"], departmentId, primaryBranchId,
  });
  const password = invite.json?.credentials?.temporaryPassword;
  if (!password) throw new Error(`could not invite ${label}: ${invite.text.slice(0, 200)}`);
  // Clear the forced password change so API calls are answered, not redirected.
  await db.identity.updateMany({ where: { normalizedEmail: email.toLowerCase() }, data: { mustChangePassword: false } });
  const session = await login(email, password);
  if (!session.cookie) throw new Error(`could not sign in ${label}`);
  const profile = await db.doctorProfile.findFirst({
    where: { staffProfile: { membership: { identity: { normalizedEmail: email.toLowerCase() } } } },
    select: { id: true, staffProfile: { select: { branchId: true } } },
  });
  return { email, cookie: session.cookie, doctorId: profile.id, branchId: profile.staffProfile.branchId ?? primaryBranchId };
}

async function cleanup(emails: string[]) {
  for (const email of emails) {
    const identity = await db.identity.findFirst({ where: { normalizedEmail: email.toLowerCase() }, select: { id: true } });
    if (!identity) continue;
    const memberships = await db.tenantMembership.findMany({ where: { identityId: identity.id }, select: { id: true } });
    for (const m of memberships) {
      await db.doctorProfile.deleteMany({ where: { staffProfile: { membershipId: m.id } } }).catch(() => {});
      await db.staffProfile.deleteMany({ where: { membershipId: m.id } }).catch(() => {});
      await db.membershipRole.deleteMany({ where: { membershipId: m.id } }).catch(() => {});
      await db.authSession.deleteMany({ where: { membershipId: m.id } }).catch(() => {});
    }
    await db.tenantMembership.deleteMany({ where: { identityId: identity.id } }).catch(() => {});
    await db.tenantInvitation.deleteMany({ where: { normalizedEmail: email.toLowerCase() } }).catch(() => {});
    await db.authSession.deleteMany({ where: { identityId: identity.id } }).catch(() => {});
    await db.identity.delete({ where: { id: identity.id } }).catch(() => {});
  }
}

async function main() {
  const created: string[] = [];
  try {
    const admin = await login("admin@wonflow.local");
    const reception = await login("reception@wonflow.local");
    const lab = await login("laboratory@wonflow.local");
    const pharmacy = await login("pharmacy@wonflow.local");
    const billing = await login("billing@wonflow.local");
    for (const [label, s] of Object.entries({ admin, reception, lab, pharmacy, billing })) {
      if (!s.cookie) throw new Error(`${label} could not sign in`);
    }

    const department = await db.department.findFirst({ where: { tenantId: TENANT }, select: { id: true } });
    const branch = await db.branch.findFirst({ where: { tenantId: TENANT, status: "ACTIVE" }, orderBy: { isMainBranch: "desc" }, select: { id: true } });

    console.log("\n— setting up two doctors in the same hospital —");
    const docA = await createDoctor(admin.cookie, "docA", department.id, branch.id);
    const docB = await createDoctor(admin.cookie, "docB", department.id, branch.id);
    created.push(docA.email, docB.email);
    console.log(`  doctor A ${docA.doctorId}\n  doctor B ${docB.doctorId}`);

    // Both doctors need an open sitting to be bookable / to consult.
    const when = new Date(); when.setMinutes(when.getMinutes() + 30 + Math.floor(Math.random() * 180), 0, 0);
    const day = businessDay(when);
    for (const doc of [docA, docB]) {
      await api(doc.cookie, "PUT", "/api/v1/doctor/sittings", {
        branchId: doc.branchId, businessDate: day, startsMinute: 0, endsMinute: 1439,
        averageConsultationMinutes: 15, status: "AVAILABLE",
      });
    }

    console.log("\n— reception registers a patient and books them with doctor A —");
    const stamp = Date.now();
    const reg = await api(reception.cookie, "POST", "/api/v1/patients", {
      givenName: "Ayesha", familyName: `Iqbal${stamp}`, sex: "female",
      phone: `0301${String(stamp).slice(-7)}`, fatherName: "Muhammad Iqbal",
      referralSource: "walk-in", registeredVia: "reception",
    });
    check("reception can register a patient", reg.status === 201, `${reg.status}`);
    const patientId = reg.json?.patient?.id;

    const book = await api(reception.cookie, "POST", "/api/v1/appointments", {
      patientId, doctorId: docA.doctorId, branchId: docA.branchId,
      startsAt: when.toISOString(), endsAt: new Date(when.getTime() + 15 * 60000).toISOString(),
      reason: "Cross-portal integration test", source: "reception-desk", idempotencyKey: `xportal-${stamp}`,
    });
    check("reception can book with doctor A", book.status === 201, book.text.slice(0, 160));
    const appointmentId = book.json?.appointment?.id;

    const checkin = await api(reception.cookie, "POST", `/api/v1/appointments/${appointmentId}/check-in`, { queueDate: day });
    check("reception can check the patient in", checkin.status === 200, `${checkin.status}`);

    console.log("\n— ISOLATION: doctor B must not see or act on doctor A's patient —");
    const aAppointments = await api(docA.cookie, "GET", "/api/v1/doctor/appointments");
    const bAppointments = await api(docB.cookie, "GET", "/api/v1/doctor/appointments");
    const aHas = (aAppointments.json?.appointments ?? []).some((x: any) => x.id === appointmentId);
    const bHas = (bAppointments.json?.appointments ?? []).some((x: any) => x.id === appointmentId);
    check("doctor A sees the appointment", aHas);
    check("doctor B does NOT see the appointment", !bHas, bHas ? "LEAK: appointment visible to another doctor" : "");

    const aPatients = await api(docA.cookie, "GET", "/api/v1/doctor/patients");
    const bPatients = await api(docB.cookie, "GET", "/api/v1/doctor/patients");
    const aSees = (aPatients.json?.patients ?? []).some((p: any) => p.id === patientId);
    const bSees = (bPatients.json?.patients ?? []).some((p: any) => p.id === patientId);
    check("doctor A sees the patient in My Patients", aSees);
    check("doctor B does NOT see the patient in My Patients", !bSees, bSees ? "LEAK: patient visible to another doctor" : "");

    const bAction = await api(docB.cookie, "PATCH", `/api/v1/doctor/queue/${appointmentId}`, { action: "call" });
    check("doctor B cannot act on the queue entry", bAction.status === 404 || bAction.status === 403, `got ${bAction.status}`);
    const aAction = await api(docA.cookie, "PATCH", `/api/v1/doctor/queue/${appointmentId}`, { action: "call" });
    check("doctor A CAN act on their own queue entry", aAction.status === 200, `got ${aAction.status} ${aAction.text.slice(0, 120)}`);

    console.log("\n— PROPAGATION: doctor A's work must reach the other portals —");
    const enc = await api(docA.cookie, "POST", "/api/v1/doctor/encounters", { appointmentId });
    check("doctor A can start the encounter", enc.status === 201, enc.text.slice(0, 160));
    const encounterId = enc.json?.encounter?.id;

    const order = await api(docA.cookie, "POST", `/api/v1/doctor/encounters/${encounterId}/orders`, {
      type: "LABORATORY", code: "CBC", name: "Complete Blood Count", priority: "routine",
    });
    check("doctor A can place a lab order", order.status === 201, order.text.slice(0, 160));
    const orderId = order.json?.order?.id ?? order.json?.id;

    // The lab sits at its own branch; the order was raised at the doctor's.
    // It must never simply vanish: either it is in the default view, or the
    // default view reports it waiting elsewhere, and the all-branches view
    // must contain it.
    const worklist = await api(lab.cookie, "GET", `/api/v1/diagnostics/worklist?type=LABORATORY&date=${day}`);
    const inDefaultView = JSON.stringify(worklist.json?.orders ?? {}).includes(orderId);
    const flaggedElsewhere = (worklist.json?.otherBranches ?? []).some((b: any) => b.count > 0);
    check("the lab is told about work waiting at another branch",
      inDefaultView || flaggedElsewhere,
      "order neither shown nor reported as waiting elsewhere");

    const allBranches = await api(lab.cookie, "GET", `/api/v1/diagnostics/worklist?type=LABORATORY&date=${day}&branchId=all`);
    check("the order is reachable from the all-branches worklist",
      JSON.stringify(allBranches.json?.orders ?? {}).includes(orderId),
      "order not found even across all branches");

    await api(lab.cookie, "POST", `/api/v1/diagnostics/orders/${orderId}/start`, {});
    const result = await api(lab.cookie, "PUT", `/api/v1/diagnostics/orders/${orderId}/result`, {
      results: [{ code: "WBC", display: "White Blood Cells", valueNumber: 11.4, unit: "10^3/uL" }],
      reportText: "WBC mildly elevated.",
    });
    check("lab can enter a result", result.status === 200 || result.status === 201, `${result.status}`);
    const resultId = result.json?.result?.id;

    const release = await api(lab.cookie, "POST", `/api/v1/diagnostics/orders/${orderId}/result/${resultId}/release`, {});
    check("lab can release the result", release.status === 200, `${release.status}`);

    const doctorResults = await api(docA.cookie, "GET", "/api/v1/diagnostics/clinician-results?type=LABORATORY");
    check("the released result reaches the ordering doctor",
      JSON.stringify(doctorResults.json ?? {}).includes(orderId), "not visible to ordering doctor");

    // The patient portal leg: a released result must reach the patient, and an
    // unreleased one must not.
    const portalPatient = await db.patient.findFirst({
      where: { tenantId: TENANT, normalizedEmail: "patient@wonflow.local" }, select: { id: true },
    });
    if (portalPatient) {
      const patientSession = await login("patient@wonflow.local", PW, "patient");
      const staffOrder = await db.diagnosticOrder.create({
        data: {
          tenantId: TENANT, branchId: docA.branchId, patientId: portalPatient.id,
          orderedByMembershipId: (await db.tenantMembership.findFirst({ where: { tenantId: TENANT, status: "ACTIVE" }, select: { id: true } })).id,
          type: "LABORATORY", status: "IN_PROGRESS", priority: "routine",
          code: "XPORTAL", name: "Cross-portal release gate probe", orderedAt: new Date(),
        },
      });
      const draft = await db.diagnosticResult.create({
        data: { tenantId: TENANT, orderId: staffOrder.id, status: "PRELIMINARY", critical: false,
                resultData: { code: "XP", displayName: "Probe", category: "CHEMISTRY", value: 1, unit: "u" } },
      });

      const beforeRelease = await api(patientSession.cookie, "GET", "/api/v1/patient/labs/results");
      check("a patient does NOT see an unreleased result",
        !JSON.stringify(beforeRelease.json ?? {}).includes(draft.id),
        "LEAK: preliminary result visible to the patient");

      await db.diagnosticResult.update({
        where: { id: draft.id },
        data: { status: "FINAL", releasedAt: new Date(), verifiedAt: new Date() },
      });
      const afterRelease = await api(patientSession.cookie, "GET", "/api/v1/patient/labs/results");
      check("a patient DOES see it once released",
        JSON.stringify(afterRelease.json ?? {}).includes(draft.id),
        "released result never reached the patient portal");

      await db.diagnosticResult.deleteMany({ where: { orderId: staffOrder.id } });
      await db.diagnosticOrder.delete({ where: { id: staffOrder.id } });
    }

    const rx = await api(docA.cookie, "POST", `/api/v1/doctor/encounters/${encounterId}/prescriptions`, {
      instructions: "After food",
      items: [{ medicationId: "Paracetamol", dose: "500mg", frequency: "TDS", duration: "3 days", quantity: 9 }],
    });
    check("doctor A can issue a prescription", rx.status === 201, rx.text.slice(0, 160));

    const pharmacyQueue = await api(pharmacy.cookie, "GET", "/api/v1/pharmacy/prescriptions");
    check("the prescription reaches the PHARMACY queue",
      JSON.stringify(pharmacyQueue.json ?? {}).includes(patientId), "prescription did not propagate to pharmacy");

    const invoice = await api(billing.cookie, "POST", "/api/v1/billing/invoices", {
      patientId, branchId: docA.branchId,
      lines: [{ description: "OPD Consultation", quantity: 1, unitPriceMinor: 150000 }],
    });
    check("billing can raise an invoice for the patient", invoice.status === 201, invoice.text.slice(0, 160));
    const invoiceId = invoice.json?.invoice?.id;

    const ledger = await api(billing.cookie, "GET", `/api/v1/billing/ledger/${patientId}`);
    check("the invoice appears on the patient's billing ledger",
      JSON.stringify(ledger.json ?? {}).includes(invoiceId), "invoice did not propagate to the ledger");

    console.log("\n— ISOLATION: clinical records are closed to non-clinical staff —");
    const billingPeek = await api(billing.cookie, "GET", `/api/v1/patients/${patientId}/drains`);
    check("billing cannot read a patient's clinical record", billingPeek.status === 403, `got ${billingPeek.status}`);
    const doctorPeek = await api(docA.cookie, "GET", `/api/v1/patients/${patientId}/drains`);
    check("a clinician still can", doctorPeek.status === 200, `got ${doctorPeek.status}`);
  } finally {
    await cleanup(created);
  }

  console.log(`\n${"=".repeat(60)}\nPASSED ${passed}   FAILED ${failed}`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
