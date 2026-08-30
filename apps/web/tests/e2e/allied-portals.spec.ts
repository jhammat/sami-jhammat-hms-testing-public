import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end cover for the allied health portals: the physiotherapy and
 * nutrition workspaces, their new profile pages, the chart layer, and dark
 * mode.
 *
 * The dark-mode tests here are not decorative. Dark mode on these screens
 * was broken in a way that no type check, lint or unit test could see: the
 * hero kept a pale background while the global overrides flipped its
 * heading to near-white, so the title rendered white-on-white and vanished.
 * The only way to catch that class of bug is to render the page and compare
 * the two colours, which is what `expectReadableAgainst` below does.
 */

const password = process.env.WONFLOW_DEVELOPMENT_PASSWORD ?? "WonFlowDemo2026!";

/**
 * Both allied portals are built on the frosted aurora hero, which paints its
 * own gradient and carries its own heading colours (`.wfg-aurora-title` /
 * `.wfg-aurora-body`, declared in plain hex so the contrast check below can
 * actually measure them). The selectors stay per-portal so a future portal
 * with a different hero can be added without weakening the assertion.
 */
const ALLIED = [
  {
    name: "physiotherapist",
    email: "physiotherapist@wonflow.local",
    home: "/operations/physiotherapy",
    profile: "/operations/physiotherapy/profile",
    heroTitle: "Physiotherapy workspace",
    heroTitleSelector: ".wfg-aurora-title",
    heroBodySelector: ".wfg-aurora-body",
    landingText: "Physiotherapy caseload",
    hasCaseloadDonut: false,
    specialty: "PHYSIOTHERAPY",
  },
  {
    name: "nutritionist",
    email: "nutritionist@wonflow.local",
    home: "/operations/nutrition",
    profile: "/operations/nutrition/profile",
    heroTitle: "Dietetics workspace",
    heroTitleSelector: ".wfg-aurora-title",
    heroBodySelector: ".wfg-aurora-body",
    landingText: "Dietetics caseload",
    hasCaseloadDonut: false,
    specialty: "NUTRITION",
  },
] as const;

async function signIn(page: Page, email: string): Promise<void> {
  const response = await page.request.post("/api/auth/login", {
    data: { email, password },
  });

  expect(response.status(), `${email} could not authenticate`).toBe(200);
}

/** Parses any CSS rgb()/rgba() colour into channels plus alpha. */
function parseColor(cssColor: string): { r: number; g: number; b: number; a: number } | null {
  const match = cssColor.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1]!.split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    r: parts[0]!,
    g: parts[1]!,
    b: parts[2]!,
    a: parts.length > 3 ? (parts[3] ?? 1) : 1,
  };
}

/** Relative luminance, so "is this light or dark" is measured, not guessed. */
function luminance(color: { r: number; g: number; b: number }): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** Paints `top` over `base`, which is what the eye actually receives. */
function composite(
  top: { r: number; g: number; b: number; a: number },
  base: { r: number; g: number; b: number },
): { r: number; g: number; b: number } {
  return {
    r: top.r * top.a + base.r * (1 - top.a),
    g: top.g * top.a + base.g * (1 - top.a),
    b: top.b * top.a + base.b * (1 - top.a),
  };
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Asserts that text and the surface actually painted behind it are not both
 * light or both dark.
 *
 * Two subtleties, both learned the hard way while building this:
 *
 * 1. The hero paints itself with a gradient, so its `background-color` stays
 *    transparent and only `background-image` carries the colour. A first
 *    version walked up to the nearest `background-color` — the page body —
 *    and so compared light hero text against the dark page plane and passed
 *    while the hero itself was still white. Gradients resolve to literal
 *    `rgb(...)` stops in the computed style, so those are read directly.
 *
 * 2. Those stops are frequently translucent (a 0.28-alpha accent wash over a
 *    dark base). Measuring one as if it were opaque flagged a hero that
 *    renders perfectly well. So every stop is composited over the nearest
 *    opaque background beneath it before being measured.
 */
async function expectReadableAgainst(page: Page, textSelector: string): Promise<void> {
  const sample = await page.locator(textSelector).first().evaluate((node) => {
    const textColor = getComputedStyle(node).color;
    const layers: string[] = [];
    let base = "rgb(255, 255, 255)";

    let element: HTMLElement | null = node as HTMLElement;

    while (element) {
      const style = getComputedStyle(element);

      const stops = style.backgroundImage?.match(/rgba?\([^)]+\)/g) ?? [];
      layers.push(...stops);

      const solid = style.backgroundColor;
      if (solid && solid !== "rgba(0, 0, 0, 0)" && solid !== "transparent") {
        const parsed = solid.match(/rgba?\(([^)]+)\)/);
        const alpha = parsed ? Number(parsed[1]!.split(",")[3] ?? 1) : 1;

        if (alpha > 0.95) {
          base = solid;
          layers.push(solid);
          break;
        }

        layers.push(solid);
      }

      element = element.parentElement;
    }

    return { textColor, layers, base };
  });

  const text = parseColor(sample.textColor);
  const base = parseColor(sample.base);

  expect(text, `could not read the colour of "${textSelector}"`).not.toBeNull();
  expect(base, `could not read a base background behind "${textSelector}"`).not.toBeNull();

  const textLuminance = luminance(text!);

  const measured = sample.layers
    .map((layer) => parseColor(layer))
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null)
    // A fully transparent stop paints nothing at all.
    .filter((layer) => layer.a > 0.01)
    .map((layer) => {
      const painted = composite(layer, base!);

      return {
        layer,
        painted,
        contrast: contrastRatio(textLuminance, luminance(painted)),
      };
    })
    .sort((a, b) => a.contrast - b.contrast);

  expect(
    measured.length,
    `no painted background found behind "${textSelector}"`,
  ).toBeGreaterThan(0);

  const worst = measured[0]!;

  expect(
    worst.contrast,
    `"${textSelector}" is unreadable: text ${sample.textColor} over a layer painting rgb(${Math.round(worst.painted.r)}, ${Math.round(worst.painted.g)}, ${Math.round(worst.painted.b)}) (${worst.contrast.toFixed(2)}:1)`,
  ).toBeGreaterThan(3);
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("wonflow-color-theme", value);
  }, theme);
}

for (const clinician of ALLIED) {
  test.describe(`${clinician.name} portal`, () => {
    test("workspace and profile routes both load", async ({ page }) => {
      test.slow();
      await signIn(page, clinician.email);

      for (const route of [clinician.home, clinician.profile]) {
        const response = await page.goto(route, { waitUntil: "networkidle" });

        expect(response?.status(), `${route} returned an HTTP error`).toBeLessThan(400);
        await expect(page.locator("body")).not.toContainText("Application error");
        await expect(page.locator("body")).not.toContainText("This page could not be found");
      }
    });

    test("workspace leads with its hero and its landing figures", async ({ page }) => {
      await signIn(page, clinician.email);
      await page.goto(clinician.home, { waitUntil: "networkidle" });

      // Scoped to the hero: the shell breadcrumb renders the same page title
      // as this page's h1, so an unscoped heading lookup matches two elements.
      await expect(page.locator(clinician.heroTitleSelector)).toHaveText(clinician.heroTitle);
      await expect(page.getByText(clinician.landingText).first()).toBeVisible();
    });

    test("caseload donut renders with an accessible description", async ({ page }) => {
      test.skip(
        !clinician.hasCaseloadDonut,
        "physiotherapy opens on the caseload picker, not on a summary chart",
      );

      await signIn(page, clinician.email);
      await page.goto(clinician.home, { waitUntil: "networkidle" });

      const donut = page.getByRole("img", { name: /Caseload by referral status/i });
      await expect(donut).toBeVisible();

      // Every chart carries a table view, which is the documented relief for
      // the light-mode palette slots that sit under 3:1 on white.
      const chart = page.locator("figure", { hasText: "Caseload by referral status" }).first();
      await chart.getByRole("button", { name: "Table" }).click();
      await expect(chart.getByRole("table")).toBeVisible();
    });

    test("hero and inbox stay readable in dark mode", async ({ page }) => {
      await setTheme(page, "dark");
      await signIn(page, clinician.email);
      await page.goto(clinician.home, { waitUntil: "networkidle" });

      await expect(page.locator("html")).toHaveClass(/dark/);

      // The exact regression: a pale hero with near-white heading text.
      await expectReadableAgainst(page, clinician.heroTitleSelector);
      await expectReadableAgainst(page, clinician.heroBodySelector);
    });

    test("hero stays readable in light mode too", async ({ page }) => {
      await setTheme(page, "light");
      await signIn(page, clinician.email);
      await page.goto(clinician.home, { waitUntil: "networkidle" });

      await expectReadableAgainst(page, clinician.heroTitleSelector);
    });

    test("profile page shows the account and its permissions", async ({ page }) => {
      await signIn(page, clinician.email);
      await page.goto(clinician.profile, { waitUntil: "networkidle" });

      // Scoped to the hero: the shell breadcrumb also renders "My Profile",
      // so an unscoped heading lookup matches two elements.
      await expect(page.locator(".wf-hero-title")).toHaveText(
        "Clinician Profile & Practice Settings",
      );
      await expect(page.getByText(clinician.email)).toBeVisible();
      // Exact match: the page also carries a sentence beginning "Permissions
      // granted for patient charting…", so a substring lookup matches twice.
      await expect(page.getByText("Permissions Granted", { exact: true })).toBeVisible();

      // Permissions are read-only facts about the account, so they must be
      // present rather than an empty list.
      await expect(page.getByText("referrals.read")).toBeVisible();
    });

    test("profile page stays readable in dark mode", async ({ page }) => {
      await setTheme(page, "dark");
      await signIn(page, clinician.email);
      await page.goto(clinician.profile, { waitUntil: "networkidle" });

      await expectReadableAgainst(page, ".wf-hero-title");
    });

    test("profile edits round-trip through the server", async ({ page }) => {
      await signIn(page, clinician.email);

      const before = await page.request.get(
        `/api/v1/allied/profile?specialty=${clinician.specialty}`,
      );
      expect(before.status()).toBe(200);
      const original = (await before.json()).profile;

      const newTitle = `Senior ${clinician.name} ${Date.now()}`;

      const patch = await page.request.patch("/api/v1/allied/profile", {
        data: { title: newTitle },
      });
      expect(patch.status(), "profile PATCH was rejected").toBe(200);
      expect((await patch.json()).profile.staff.title).toBe(newTitle);

      // Read it back on a fresh request: the response echoing the value is
      // not proof it was persisted.
      const after = await page.request.get(
        `/api/v1/allied/profile?specialty=${clinician.specialty}`,
      );
      expect((await after.json()).profile.staff.title).toBe(newTitle);

      // And it must be what the page actually renders.
      await page.goto(clinician.profile, { waitUntil: "networkidle" });
      await expect(page.locator("#allied-title")).toHaveValue(newTitle);

      // Put the seed data back so the suite can be run repeatedly.
      await page.request.patch("/api/v1/allied/profile", {
        data: { title: original.staff.title },
      });
    });

    test("profile rejects an empty display name with a usable message", async ({ page }) => {
      await signIn(page, clinician.email);

      const response = await page.request.patch("/api/v1/allied/profile", {
        data: { displayName: "   " },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(JSON.stringify(body)).toContain("display name");
    });

    test("profile refuses a branch from another organisation", async ({ page }) => {
      await signIn(page, clinician.email);

      // A well-formed uuid that does not belong to this tenant. Cross-tenant
      // assignment must be impossible to express, not merely unlikely.
      const response = await page.request.patch("/api/v1/allied/profile", {
        data: { primaryBranchId: "00000000-0000-4000-8000-000000000000" },
      });

      expect(response.status()).toBe(404);
    });
  });
}

test("the allied profile API refuses an anonymous caller", async ({ request }) => {
  const response = await request.get("/api/v1/allied/profile", {
    maxRedirects: 0,
  });

  expect(response.status(), "an unauthenticated profile read was allowed").toBeGreaterThanOrEqual(
    300,
  );
  expect(response.status()).not.toBe(200);
});

test("a doctor cannot read an allied profile they do not have", async ({ page }) => {
  await signIn(page, "doctor@wonflow.local");

  const response = await page.request.get("/api/v1/allied/profile");

  // The doctor does have a StaffProfile, so this legitimately succeeds — but
  // it must return the DOCTOR's own record, never an allied colleague's.
  if (response.status() === 200) {
    const profile = (await response.json()).profile;
    expect(profile.identity.email).toBe("doctor@wonflow.local");
  } else {
    expect(response.status()).toBeGreaterThanOrEqual(400);
  }
});

test("a nutrition plan can be published end to end", async ({ page }) => {
  await signIn(page, "nutritionist@wonflow.local");

  const referrals = await page.request.get(
    "/api/v1/allied/referrals?specialty=NUTRITION",
  );
  expect(referrals.status()).toBe(200);

  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded nutrition referral to publish against");

  const referral = list[0];

  // Regression guard: this POST used to fail with "missing-phase" because
  // the screen sent `dietPhase`/`caloricTarget` while the service reads
  // `phase`/`caloricTargetKcal` and requires a `startDate`.
  const response = await page.request.post("/api/v1/allied/nutrition/plans", {
    data: {
      patientId: referral.patientId,
      referralId: referral.id,
      title: "E2E dietary plan",
      phase: "Phase 3: Soft / Pureed Pancreatic Diet",
      startDate: new Date().toISOString(),
      caloricTargetKcal: 1800,
      proteinTargetGrams: 85,
      fluidTargetMl: 2000,
      syncToCarePlan: false,
      items: [
        {
          itemType: "MEAL",
          name: "E2E test meal",
          timeOfDay: "Breakfast",
          quantity: 1,
          unit: "bowl",
          withMeal: false,
        },
      ],
    },
  });

  expect(response.status(), await response.text()).toBe(201);
  expect((await response.json()).plan.phase).toContain("Phase 3");
});

test("the dietary plan tab needs a chosen patient before it will open", async ({ page }) => {
  await signIn(page, "nutritionist@wonflow.local");
  await page.goto("/operations/nutrition", { waitUntil: "networkidle" });

  // Nothing is pre-selected, so the patient-scoped sections say so rather
  // than rendering a form that would write to nobody. The sections are
  // sidebar links now, not buttons on a rail above the content.
  await page.getByRole("link", { name: "Dietary Plan" }).click();
  await expect(page.getByText("Choose a patient first")).toBeVisible();
});

test("the dietary plan states the care-plan prerequisite before it is filled in", async ({
  page,
}) => {
  await signIn(page, "nutritionist@wonflow.local");

  const referrals = await page.request.get("/api/v1/allied/referrals?specialty=NUTRITION");
  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded nutrition referral to work with");

  await page.goto("/operations/nutrition", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Work with this patient/i }).first().click();
  await page.getByRole("link", { name: "Dietary Plan" }).click();

  // Either the patient has an active care plan and the publish switch offers
  // to push the items to their app, or they do not and the screen says so
  // BEFORE the dietitian fills the form in — never discovered afterwards
  // through a save that silently does nothing.
  const notice = page.getByText(/no active care plan yet/i);
  const publishSwitch = page.getByText(/Send the items to the patient/i);

  await expect(notice.or(publishSwitch).first()).toBeVisible();
});

test("publishing without a care plan reports the truth, not a false sync", async ({ page }) => {
  await signIn(page, "nutritionist@wonflow.local");

  const referrals = await page.request.get("/api/v1/allied/referrals?specialty=NUTRITION");
  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded nutrition referral to publish against");

  const referral = list[0];

  const response = await page.request.post("/api/v1/allied/nutrition/plans", {
    data: {
      patientId: referral.patientId,
      referralId: referral.id,
      title: "Sync honesty check",
      phase: "Phase 3: Soft / Pureed Pancreatic Diet",
      startDate: new Date().toISOString(),
      syncToCarePlan: true,
      items: [
        {
          itemType: "MEAL",
          name: "Sync check meal",
          timeOfDay: "Breakfast",
          quantity: 1,
          unit: "bowl",
          withMeal: false,
        },
      ],
    },
  });

  expect(response.status()).toBe(201);
  const sync = (await response.json()).plan.sync;

  // The server must say whether anything actually reached the patient. The
  // screen used to claim "published and synced to the Daily Action Centre"
  // regardless, so a dietitian could leave believing a patient with no care
  // plan had their meals on their phone when nothing had been written.
  expect(sync, "the plan response carries no sync outcome").toBeTruthy();
  expect(sync.requested).toBe(true);
  expect(typeof sync.carePlanFound).toBe("boolean");
  expect(typeof sync.taskCount).toBe("number");

  // Whatever the seed state, the two must agree with each other.
  if (!sync.carePlanFound) expect(sync.taskCount).toBe(0);
  if (sync.taskCount > 0) expect(sync.carePlanFound).toBe(true);
});

/* ==================================================================== */
/* Physiotherapy workspace                                              */
/* ==================================================================== */

test("the physiotherapy workspace selects no patient for you", async ({ page }) => {
  await signIn(page, "physiotherapist@wonflow.local");
  await page.goto("/operations/physiotherapy", { waitUntil: "networkidle" });

  // The whole point of the rebuild: a prescription written against a silently
  // pre-selected patient is a clinical incident, so the landing state has to
  // say plainly that nobody is selected — even when the caseload is not empty.
  await expect(page.getByText("No patient selected")).toBeVisible();

  // And the patient-scoped sections say why they are empty rather than
  // rendering a form that would write to nobody.
  await page.getByRole("link", { name: "Exercise Studio" }).click();
  await expect(page.getByText("Choose a patient first")).toBeVisible();
});

test("choosing a patient opens their recovery deck", async ({ page }) => {
  await signIn(page, "physiotherapist@wonflow.local");

  const referrals = await page.request.get(
    "/api/v1/allied/referrals?specialty=PHYSIOTHERAPY",
  );
  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded physiotherapy referral to select");

  await page.goto("/operations/physiotherapy", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Work with this patient/i }).first().click();

  await expect(page.getByRole("button", { name: /Change patient/i })).toBeVisible();
  await expect(page.getByText("Care team and connected portals")).toBeVisible();
});

test("precaution orders land on the referral the surgeon reads", async ({ page }) => {
  await signIn(page, "physiotherapist@wonflow.local");

  const referrals = await page.request.get(
    "/api/v1/allied/referrals?specialty=PHYSIOTHERAPY",
  );
  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded physiotherapy referral to order against");

  const referral = list[0];
  const marker = `E2E order ${Date.now()}`;

  const response = await page.request.post("/api/v1/allied/physiotherapy/precautions", {
    data: {
      patientId: referral.patientId,
      referralId: referral.id,
      weightBearing: "WBAT",
      precautions: ["SUBCOSTAL", "DRAIN_AWARE"],
      notes: marker,
      dischargeMobilityCleared: false,
    },
  });

  expect(response.status(), await response.text()).toBe(200);

  const published = await response.json();
  expect(published.precautions).toContain("Weight bearing as tolerated");
  expect(published.precautions).toContain("Subcostal");
  expect(published.precautions).toContain(marker);

  // Read it back rather than trusting the echo: the point of publishing is
  // that the next person to open the referral sees it.
  const after = await page.request.get("/api/v1/allied/referrals?specialty=PHYSIOTHERAPY");
  const refreshed = ((await after.json()).referrals ?? []).find(
    (item: { id: string }) => item.id === referral.id,
  );

  expect(refreshed?.precautions).toContain(marker);
});

test("publishing an empty precaution order is refused", async ({ page }) => {
  await signIn(page, "physiotherapist@wonflow.local");

  const referrals = await page.request.get(
    "/api/v1/allied/referrals?specialty=PHYSIOTHERAPY",
  );
  const list = (await referrals.json()).referrals ?? [];
  test.skip(list.length === 0, "no seeded physiotherapy referral to order against");

  const response = await page.request.post("/api/v1/allied/physiotherapy/precautions", {
    data: { patientId: list[0].patientId, precautions: [] },
  });

  expect(response.status()).toBe(400);
});

test("a physiotherapist cannot publish orders for a patient they hold no referral for", async ({
  page,
}) => {
  await signIn(page, "physiotherapist@wonflow.local");

  const response = await page.request.post("/api/v1/allied/physiotherapy/precautions", {
    data: {
      // A well-formed uuid with no physiotherapy referral behind it.
      patientId: "00000000-0000-4000-8000-000000000000",
      weightBearing: "FWB",
    },
  });

  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).not.toBe(200);
});

test("a physiotherapist note reaches the surgical care plan", async ({ page }) => {
  await page.request.post("/api/auth/login", {
    data: { email: "physiotherapist@wonflow.local", password },
  });

  const roster = await page.request.get("/api/v1/clinical/careplans/roster");
  expect(roster.status(), await roster.text()).toBe(200);

  const plans = (await roster.json()).roster ?? [];
  test.skip(plans.length === 0, "no active care plan");

  const marker = `Physiotherapy: handoff probe ${Date.now()}`;

  const posted = await page.request.post(`/api/v1/clinical/careplans/${plans[0].id}/notes`, {
    data: { note: marker },
  });

  expect(posted.status(), await posted.text()).toBe(200);

  const plan = await page.request.get(`/api/v1/clinical/careplans/${plans[0].id}`);
  expect(JSON.stringify(await plan.json())).toContain(marker);
});
