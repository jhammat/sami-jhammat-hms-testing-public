/**
 * Who sees which care plans on the roster.
 *
 * The roster query filtered on tenant and status alone, so it returned every
 * active plan in the hospital to anyone who asked: each doctor saw the other
 * doctors' patients, and a physiotherapist or dietitian saw the whole
 * caseload rather than the patients referred to them.
 *
 * Run with the dev server up:
 *   npx tsx apps/web/tests/integration-http/care-plan-roster-scope.ts
 */
import { database } from "@wonflow/database";

const BASE = process.env.WONFLOW_BASE_URL ?? "http://127.0.0.1:3007";
const PW = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";
const db: any = database;

// These logins all belong to the development hospital; plans must be created there.
const TENANT = "31ae60b2-3de5-4ecf-99ed-117d04152340";

let pass = 0, fail = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(`${name} :: ${detail}`); console.log(`  FAIL  ${name}  ${detail}`); }
};

async function login(email: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PW, audience: "hospital" }),
  });
  return (res.headers.get("set-cookie") ?? "").split(/,(?=\s*\w+=)/).map((c) => c.split(";")[0]).join("; ");
}

async function roster(cookie: string): Promise<string[]> {
  const res = await fetch(`${BASE}/api/v1/clinical/careplans/roster`, { headers: { cookie } });
  const body = await res.json().catch(() => ({}));
  const rows = body?.roster ?? body?.carePlans ?? [];
  return rows.map((r: any) => r.id ?? r.carePlanId).filter(Boolean);
}

async function main() {
  const created: string[] = [];
  try {
    const doctor = await login("sami.tariq@hospital.com");
    const physio = await login("physiotherapist@wonflow.local");
    const dietitian = await login("nutritionist@wonflow.local");
    const admin = await login("admin@wonflow.local");

    const allied = await (await fetch(`${BASE}/api/v1/allied/staff`, { headers: { cookie: doctor } })).json();
    const therapist = (allied?.staff ?? []).find((s: any) => s.staffType === "PHYSIOTHERAPIST");
    const nutritionist = (allied?.staff ?? []).find((s: any) => s.staffType === "NUTRITIONIST");

    const patient = await db.patient.findFirst({ where: { status: "ACTIVE", tenantId: TENANT }, select: { id: true, tenantId: true } });
    const owning = await db.doctorProfile.findFirst({
      where: { staffProfile: { membership: { identity: { email: "sami.tariq@hospital.com" } } } },
      select: { id: true },
    });
    // A doctor who is not the caller and not their supervisee.
    const otherDoctor = await db.doctorProfile.findFirst({
      where: { tenantId: patient.tenantId, id: { not: owning.id }, supervisorDoctorId: null },
      select: { id: true },
    });

    async function makePlan(title: string, data: Record<string, unknown>) {
      const plan = await db.carePlan.create({
        data: {
          tenantId: patient.tenantId, patientId: patient.id, category: "SURGERY_POSTOP",
          title, status: "ACTIVE", startDate: new Date(), currentStage: 1, ...data,
        },
      });
      created.push(plan.id);
      return plan.id;
    }

    console.log("\n— three plans, owned by different people —");
    const minePlan = await makePlan("Scope: managed by the calling doctor", { managingDoctorId: owning.id });
    const physioPlan = await makePlan("Scope: assigned to the physiotherapist", {
      managingDoctorId: otherDoctor?.id ?? owning.id, assignedTherapistId: therapist?.id,
    });
    const dietPlan = await makePlan("Scope: assigned to the dietitian", {
      managingDoctorId: otherDoctor?.id ?? owning.id, assignedNutritionistId: nutritionist?.id,
    });
    const foreignPlan = otherDoctor
      ? await makePlan("Scope: another doctor's plan entirely", { managingDoctorId: otherDoctor.id })
      : null;

    const doctorRoster = await roster(doctor);
    check("the doctor sees the plan they manage", doctorRoster.includes(minePlan));
    if (foreignPlan) {
      check("the doctor does NOT see another doctor's plan", !doctorRoster.includes(foreignPlan),
        "LEAK: another clinician's plan is on this doctor's roster");
    }

    const physioRoster = await roster(physio);
    check("the physiotherapist sees the plan assigned to them", physioRoster.includes(physioPlan));
    check("the physiotherapist does NOT see the doctor's unrelated plan", !physioRoster.includes(minePlan),
      "LEAK: unassigned plan visible to the physiotherapist");
    check("the physiotherapist does NOT see the dietitian's plan", !physioRoster.includes(dietPlan));

    const dietRoster = await roster(dietitian);
    check("the dietitian sees the plan assigned to them", dietRoster.includes(dietPlan));
    check("the dietitian does NOT see the physiotherapist's plan", !dietRoster.includes(physioPlan),
      "LEAK: unassigned plan visible to the dietitian");

    const adminRoster = await roster(admin);
    check("an administrator still oversees everything",
      adminRoster.includes(minePlan) && adminRoster.includes(physioPlan) && adminRoster.includes(dietPlan),
      "the admin view lost plans it should keep");
  } finally {
    for (const id of created) {
      await db.carePlanTask.deleteMany({ where: { carePlanId: id } }).catch(() => {});
      await db.carePlanAlert.deleteMany({ where: { carePlanId: id } }).catch(() => {});
      await db.carePlan.delete({ where: { id } }).catch(() => {});
    }
  }

  console.log(`\n${"=".repeat(60)}\nPASSED ${pass}   FAILED ${fail}`);
  if (failures.length) { console.log("\nFailures:"); for (const f of failures) console.log(`  - ${f}`); }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
