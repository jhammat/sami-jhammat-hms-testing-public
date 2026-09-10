/**
 * The care plan, end to end and across every portal that touches it.
 *
 * Two things are being proven here:
 *
 *   1. A running plan is editable. Rename it, add a task, edit a task, remove
 *      a task, stop the plan. None of that was reachable before — the plan
 *      endpoint was GET-only and tasks could only be marked complete.
 *   2. It reflects everywhere. The doctor who owns it, the physiotherapist and
 *      dietitian assigned to it, and the patient living it should all see the
 *      same plan, and a change made by the doctor should show up for the
 *      patient without anyone re-seeding anything.
 *
 * Run with the dev server up:
 *   npx tsx apps/web/tests/integration-http/care-plan-lifecycle.ts
 */
import { database } from "@wonflow/database";

const BASE = process.env.WONFLOW_BASE_URL ?? "http://127.0.0.1:3007";
const PW = process.env.WONFLOW_DEMO_PASSWORD ?? "WonFlowDemo2026!";
const db: any = database;

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; failures.push(`${name} :: ${detail}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

async function login(email: string, audience: "hospital" | "patient" = "hospital") {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: PW, audience }),
  });
  const raw = res.headers.get("set-cookie") ?? "";
  return raw.split(/,(?=\s*\w+=)/).map((c) => c.split(";")[0]).join("; ");
}

async function api(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text, isJson: text.trim().startsWith("{") };
}

async function main() {
  let carePlanId = "";
  let patientId = "";

  try {
    const doctor = await login("sami.tariq@hospital.com");
    const physio = await login("physiotherapist@wonflow.local");
    const dietitian = await login("nutritionist@wonflow.local");
    const patientSession = await login("patient@wonflow.local", "patient");
    for (const [label, cookie] of Object.entries({ doctor, physio, dietitian, patientSession })) {
      if (!cookie) throw new Error(`${label} could not sign in`);
    }

    // The seeded portal patient, so the patient portal can see this plan.
    const home = await api(patientSession, "GET", "/api/v1/patient/profile");
    patientId = home.json?.home?.patient?.id;
    if (!patientId) throw new Error("could not resolve the portal patient");

    const allied = await api(doctor, "GET", "/api/v1/allied/staff");
    const therapist = (allied.json?.staff ?? []).find((s: any) => s.staffType === "PHYSIOTHERAPIST");
    const nutritionist = (allied.json?.staff ?? []).find((s: any) => s.staffType === "NUTRITIONIST");

    console.log("\n— the doctor starts a plan and assigns the allied team —");
    const started = await api(doctor, "POST", "/api/v1/clinical/careplans/instantiate", {
      patientId,
      category: "WHIPPLE_RECOVERY",
      durationDays: 5,
      title: `Lifecycle QA plan ${Date.now()}`,
      startDate: new Date().toISOString(),
      assignedTherapistId: therapist?.id,
      assignedNutritionistId: nutritionist?.id,
    });
    check("the plan starts", started.status === 200 || started.status === 201, started.text.slice(0, 160));
    carePlanId = started.json?.carePlan?.id;
    if (!carePlanId) throw new Error("no care plan id returned");

    console.log("\n— it is editable —");
    const renamed = await api(doctor, "PATCH", `/api/v1/clinical/careplans/${carePlanId}`, {
      title: "Lifecycle QA plan (renamed)",
    });
    check("the plan can be renamed", renamed.status === 200, renamed.text.slice(0, 160));
    check("the new name comes back", renamed.json?.carePlan?.title === "Lifecycle QA plan (renamed)");

    const paused = await api(doctor, "PATCH", `/api/v1/clinical/careplans/${carePlanId}`, { status: "PAUSED" });
    check("the plan can be paused", paused.json?.carePlan?.status === "PAUSED", `${paused.status}`);
    await api(doctor, "PATCH", `/api/v1/clinical/careplans/${carePlanId}`, { status: "ACTIVE" });

    console.log("\n— tasks can be added, edited and removed —");
    const added = await api(doctor, "POST", `/api/v1/clinical/careplans/${carePlanId}/tasks`, {
      title: "QA added task", taskType: "VITALS_LOG", dayNumber: 2, scheduleTimeOfDay: "07:30",
      instructions: "Sit for five minutes first.",
    });
    check("a task can be added", added.status === 200 || added.status === 201, added.text.slice(0, 160));
    const taskId = added.json?.task?.id ?? added.json?.id;
    check("the added task has the chosen day", (added.json?.task ?? added.json)?.dayNumber === 2);

    const editedTask = await api(doctor, "PATCH", `/api/v1/clinical/careplans/tasks/${taskId}`, {
      title: "QA added task (edited)", dayNumber: 3,
    });
    check("a task can be edited", editedTask.status === 200, editedTask.text.slice(0, 160));
    check("the edit sticks", ((editedTask.json?.task ?? editedTask.json)?.title) === "QA added task (edited)");

    const scratchTask = await api(doctor, "POST", `/api/v1/clinical/careplans/${carePlanId}/tasks`, {
      title: "QA throwaway task", taskType: "EXERCISE", dayNumber: 1,
    });
    const scratchId = scratchTask.json?.task?.id ?? scratchTask.json?.id;
    const removed = await api(doctor, "DELETE", `/api/v1/clinical/careplans/tasks/${scratchId}`);
    check("a task can be removed", removed.status === 200, removed.text.slice(0, 160));
    check("it is really gone", (await db.carePlanTask.count({ where: { id: scratchId } })) === 0);

    console.log("\n— a completed task is history, not a draft —");
    const doneTask = await api(doctor, "POST", `/api/v1/clinical/careplans/${carePlanId}/tasks`, {
      title: "QA completed task", taskType: "VITALS_LOG", dayNumber: 1,
    });
    const doneId = doneTask.json?.task?.id ?? doneTask.json?.id;
    await api(doctor, "POST", `/api/v1/clinical/careplans/tasks/${doneId}/complete`, { resultData: { note: "done" } });
    const editDone = await api(doctor, "PATCH", `/api/v1/clinical/careplans/tasks/${doneId}`, { title: "rewriting history" });
    check("a completed task cannot be rewritten", editDone.status === 409, `got ${editDone.status}`);
    const deleteDone = await api(doctor, "DELETE", `/api/v1/clinical/careplans/tasks/${doneId}`);
    check("a completed task cannot be deleted", deleteDone.status === 409, `got ${deleteDone.status}`);

    console.log("\n— it reflects in every portal —");
    const roster = await api(doctor, "GET", "/api/v1/clinical/careplans/roster");
    check("the doctor's roster lists it",
      JSON.stringify(roster.json ?? {}).includes(carePlanId), "missing from the doctor roster");

    const doctorView = await api(doctor, "GET", `/api/v1/clinical/careplans/${carePlanId}`);
    check("the doctor can open it", doctorView.status === 200, `${doctorView.status}`);
    check("it names the patient rather than a UUID",
      Boolean(doctorView.json?.carePlan?.patientName), "patientName missing from the detail payload");

    const physioView = await api(physio, "GET", `/api/v1/clinical/careplans/${carePlanId}`);
    check("the assigned physiotherapist can open it", physioView.status === 200, `${physioView.status} ${physioView.text.slice(0, 120)}`);

    const dietitianView = await api(dietitian, "GET", `/api/v1/clinical/careplans/${carePlanId}`);
    check("the assigned dietitian can open it", dietitianView.status === 200, `${dietitianView.status} ${dietitianView.text.slice(0, 120)}`);

    const patientTasks = await api(patientSession, "GET", "/api/v1/patient/careplan");
    const patientSees = JSON.stringify(patientTasks.json ?? {});
    check("the patient's own plan endpoint answers", patientTasks.status === 200, `${patientTasks.status}`);
    check("the task the doctor added reaches the patient",
      patientSees.includes("QA added task (edited)"), "the doctor's new task is not visible to the patient");

    console.log("\n— stopping it —");
    const stopped = await api(doctor, "DELETE", `/api/v1/clinical/careplans/${carePlanId}`, { reason: "QA lifecycle run" });
    check("the plan can be stopped", stopped.status === 200, stopped.text.slice(0, 160));
    check("it is discontinued rather than erased (it has recorded activity)",
      stopped.json?.deleted === false && stopped.json?.status === "DISCONTINUED",
      JSON.stringify(stopped.json));

    const rosterAfter = await api(doctor, "GET", "/api/v1/clinical/careplans/roster");
    const stillActive = (rosterAfter.json?.carePlans ?? rosterAfter.json?.plans ?? [])
      .some((p: any) => p.id === carePlanId && p.status === "ACTIVE");
    check("it stops showing as active on the roster", !stillActive);

    console.log("\n— a plan with nothing recorded is removed outright —");
    const pristine = await api(doctor, "POST", "/api/v1/clinical/careplans/instantiate", {
      patientId, category: "SURGERY_POSTOP", durationDays: 2,
      title: `Pristine QA plan ${Date.now()}`, startDate: new Date().toISOString(),
    });
    const pristineId = pristine.json?.carePlan?.id;
    const wiped = await api(doctor, "DELETE", `/api/v1/clinical/careplans/${pristineId}`);
    check("an untouched plan is deleted outright", wiped.json?.deleted === true, JSON.stringify(wiped.json));
    check("its row is gone", (await db.carePlan.count({ where: { id: pristineId } })) === 0);
  } finally {
    // Clear anything this run left behind.
    if (carePlanId) {
      await db.carePlanTask.deleteMany({ where: { carePlanId } }).catch(() => {});
      await db.carePlanAlert.deleteMany({ where: { carePlanId } }).catch(() => {});
      await db.carePlan.delete({ where: { id: carePlanId } }).catch(() => {});
    }
  }

  console.log(`\n${"=".repeat(60)}\nPASSED ${pass}   FAILED ${fail}`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("CRASHED:", e); process.exit(1); });
