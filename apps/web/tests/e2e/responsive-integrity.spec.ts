import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Nothing may scroll sideways on a phone.
 *
 * The sidebar now offers to install WonFlow as an app on any device, which is
 * a promise that the pages underneath actually work at phone width. A page
 * that scrolls horizontally is the usual way that promise turns out to be
 * false, and it is invisible on a desktop screen - so it is checked here
 * rather than assumed.
 *
 * The common cause is a CSS grid whose tracks are sized by their content's
 * min-content width: the card cannot shrink below its longest unbroken row,
 * so it hangs out past the panel. `min-w-0` on the grid item is the fix, and
 * this test is what finds the next one.
 */

const PASSWORD = "WonFlowDemo2026!";

const PHONE = { width: 390, height: 844 };

async function signIn(page: Page, email: string, role: string): Promise<void> {
  const login = await page.request.post("/api/auth/login", {
    data: { email, password: PASSWORD },
  });

  expect(login.status(), `${email} could not sign in`).toBe(200);

  const body = (await login.json()) as {
    requiresContextSelection?: boolean;
    contexts?: {
      role: string;
      membershipId: string | null;
      tenantId: string | null;
      patientId?: string | null;
    }[];
  };

  if (!body.requiresContextSelection) return;

  const context = body.contexts?.find((candidate) => candidate.role === role);
  expect(context, `${email} does not hold the ${role} portal`).toBeTruthy();

  const selected = await page.request.post("/api/auth/select-context", {
    data: {
      role: context!.role,
      membershipId: context!.membershipId,
      tenantId: context!.tenantId,
      patientId: context!.patientId ?? null,
    },
  });

  expect(selected.status()).toBe(200);
}

/**
 * Every element sticking out past the viewport, with enough of its class list
 * to find it in the source. Reported together so one run names them all rather
 * than one per re-run.
 */
async function elementsPastTheViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const found: string[] = [];

    document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
      const rect = element.getBoundingClientRect();

      // Zero-size and deliberately-offscreen things are not overflow.
      if (rect.width === 0 || rect.height === 0) return;

      const style = getComputedStyle(element);
      if (style.position === "fixed" || style.visibility === "hidden") return;

      // A decorative blur positioned outside a hero that clips it is not
      // overflow - nobody can scroll to it and nothing is cut off. Only count
      // an element if it reaches past the viewport with nothing clipping it
      // on the way up.
      let clipped = false;
      for (
        let ancestor = element.parentElement;
        ancestor && ancestor !== document.body;
        ancestor = ancestor.parentElement
      ) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (overflowX === "hidden" || overflowX === "clip" || overflowX === "auto") {
          clipped = true;
          break;
        }
      }
      if (clipped) return;

      if (rect.right - viewport > 2) {
        const classes = (element.className || "").toString().slice(0, 90);
        found.push(
          `${element.tagName.toLowerCase()} right=${Math.round(rect.right)} :: ${classes}`,
        );
      }
    });

    // The same offending class list repeated per list item is one problem.
    return [...new Set(found)].slice(0, 12);
  });
}

const PAGES: { name: string; email: string; role: string; path: string }[] = [
  {
    name: "physiotherapy caseload",
    email: "physio@samijhammat.local",
    role: "physiotherapist",
    path: "/operations/physiotherapy?view=caseload",
  },
  {
    name: "physiotherapy pathways",
    email: "physio@samijhammat.local",
    role: "physiotherapist",
    path: "/operations/physiotherapy?view=pathways",
  },
  {
    name: "dietetics caseload",
    email: "dietitian@samijhammat.local",
    role: "nutritionist",
    path: "/operations/nutrition?view=caseload",
  },
  {
    name: "dietetics calculators",
    email: "dietitian@samijhammat.local",
    role: "nutritionist",
    path: "/operations/nutrition?view=calculators",
  },
  {
    name: "reception desk",
    email: "reception@samijhammat.local",
    role: "reception",
    path: "/operations/reception",
  },
  {
    name: "doctor dashboard",
    email: "surgeon@samijhammat.local",
    role: "doctor",
    path: "/doctor",
  },
  {
    name: "patient dashboard",
    email: "patient@samijhammat.local",
    role: "patient",
    path: "/patient/dashboard",
  },
];

async function phone(browser: Browser) {
  return browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true });
}

for (const target of PAGES) {
  test(`${target.name} does not scroll sideways on a phone`, async ({ browser }) => {
    const context = await phone(browser);
    const page = await context.newPage();

    try {
      await signIn(page, target.email, target.role);
      await page.goto(target.path);
      await page.waitForLoadState("networkidle").catch(() => undefined);
      await page.waitForTimeout(700);

      const offenders = await elementsPastTheViewport(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(
        offenders,
        `${target.path} has elements past the right edge at ${PHONE.width}px`,
      ).toEqual([]);

      expect(overflow, `${target.path} scrolls horizontally`).toBeLessThanOrEqual(1);
    } finally {
      await context.close();
    }
  });
}
