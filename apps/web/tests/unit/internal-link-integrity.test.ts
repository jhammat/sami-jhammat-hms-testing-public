import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every internal link must point at a route that exists.
 *
 * This exists because two of them did not. The management dashboard's
 * "Practitioners" tile linked to `/operations/team`, and the hospital
 * operations overview had a "Live Queue" button pointing at
 * `/operations/queue`. Neither route has ever existed, so both answered 404 —
 * and nothing in the type system, the linter or the build had any way to
 * notice, because a Next.js `href` is just a string.
 *
 * The check walks the app directory to build the real route table (stripping
 * route groups, treating `[param]` as a wildcard), then scans every component
 * for literal internal hrefs and asserts each one resolves.
 */

const APP_DIR = resolve(__dirname, "../../src/app");
const SRC_DIR = resolve(__dirname, "../../src");

function walk(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === ".next" || entry === "node_modules") continue;
      found.push(...walk(full));
    } else {
      found.push(full);
    }
  }

  return found;
}

/** The route table, with Next.js route groups removed. */
function collectRoutes(): string[] {
  const routes = new Set<string>();

  for (const file of walk(APP_DIR)) {
    if (!file.endsWith(`${"page"}.tsx`)) continue;

    const rel = relative(APP_DIR, file).replace(/\\/g, "/").replace(/\/page\.tsx$/, "");
    if (rel === "page.tsx" || rel === "") {
      routes.add("/");
      continue;
    }

    const segments = rel
      .split("/")
      .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));

    routes.add(`/${segments.join("/")}`);
  }

  return [...routes];
}

function resolves(path: string, routes: string[]): boolean {
  const pathParts = path.split("/").filter(Boolean);

  return routes.some((route) => {
    const routeParts = route.split("/").filter(Boolean);
    if (routeParts.length !== pathParts.length) return false;

    return routeParts.every(
      (part, index) =>
        part === pathParts[index] || (part.startsWith("[") && part.endsWith("]")),
    );
  });
}

const HREF = /href=(?:"(\/[^"]*)"|\{`(\/[^`$]*)`\})/g;

describe("internal link integrity", () => {
  const routes = collectRoutes();

  it("discovers the application's routes", () => {
    expect(routes.length).toBeGreaterThan(50);
    expect(routes).toContain("/doctor");
    expect(routes).toContain("/operations/physiotherapy");
    expect(routes).toContain("/operations/nutrition");
  });

  it("every literal internal href points at a real route", () => {
    const broken: string[] = [];

    for (const file of walk(SRC_DIR)) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;

      const source = readFileSync(file, "utf8");
      const lines = source.split("\n");

      lines.forEach((line, index) => {
        HREF.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = HREF.exec(line)) !== null) {
          const raw = match[1] ?? match[2];
          if (!raw) continue;

          const path = (raw.split("?")[0]!.split("#")[0]!.replace(/\/$/, "") || "/") as string;

          // API routes are handlers, not pages; a trailing extension is a file.
          if (path.startsWith("/api/")) continue;
          if (path.split("/").pop()?.includes(".")) continue;

          if (!resolves(path, routes)) {
            broken.push(`${relative(SRC_DIR, file).replace(/\\/g, "/")}:${index + 1} -> ${raw}`);
          }
        }
      });
    }

    expect(broken, `these links do not resolve to a route:\n${broken.join("\n")}`).toEqual([]);
  });
});
