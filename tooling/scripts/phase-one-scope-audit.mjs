import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Enforces the Phase 1 / Phase 2 boundary.
 *
 * Phase 2 modules live in `deferred/phase-two/` and must stay unreachable from
 * the shipped application: no imports, no route segments, no navigation links.
 * This replaces the former UI foundation audit, whose rules (a shell file that
 * no longer exists, "hidden" labels that are now Phase 1 portals, and a
 * hospitalOperations flag that is now enabled) no longer described the product.
 */

const DEFERRED_ROOT = existsSync("future/deferred/phase-two")
  ? "future/deferred/phase-two"
  : "deferred/phase-two";

/**
 * Each deferred module, with the aliases and route prefixes that must not
 * reappear inside apps/web.
 */
const deferredModules = [
  { name: "blood-bank", aliases: ["@/components/blood-bank", "@/lib/blood-bank"], routes: ["/operations/blood-bank"] },
  { name: "inpatient", aliases: ["@/components/inpatient", "@/lib/inpatient"], routes: ["/operations/inpatient", "/doctor/inpatients"] },
  { name: "insurance", aliases: ["@/components/insurance", "@/lib/insurance"], routes: ["/operations/insurance"] },
  { name: "queue", aliases: ["@/components/queue"], routes: ["/operations/queue", "/doctor/queue"] },
  { name: "surgery", aliases: [], routes: ["/operations/surgery"] },
];

/**
 * Route segment directories that must no longer exist under the App Router.
 */
const removedRouteDirectories = [
  "apps/web/src/app/(hospital-operations)/operations/blood-bank",
  "apps/web/src/app/(hospital-operations)/operations/inpatient",
  "apps/web/src/app/(hospital-operations)/operations/insurance",
  "apps/web/src/app/(hospital-operations)/operations/queue",
  "apps/web/src/app/(hospital-operations)/operations/surgery",
  "apps/web/src/app/(doctor-workspace)/doctor/inpatients",
  "apps/web/src/app/(doctor-workspace)/doctor/queue",
];

const failures = [];

if (!existsSync(DEFERRED_ROOT)) {
  failures.push(`${DEFERRED_ROOT} is missing. Phase 2 modules must be parked there.`);
}

for (const directory of removedRouteDirectories) {
  if (existsSync(directory)) {
    failures.push(`Deferred route segment is back in the application: ${directory}`);
  }
}

/**
 * Removing a route segment can hand its path to a neighbouring dynamic segment,
 * which would serve a placeholder instead of the 404 the module had while it
 * owned an explicit route.
 *
 * Each such segment must call notFound(), must not fall back to a placeholder,
 * and must name the deferred sections so the reason is discoverable — whether
 * it 404s them explicitly or 404s everything unrecognised.
 */
const dynamicSegmentGuards = [
  {
    file: "apps/web/src/app/(doctor-workspace)/doctor/[section]/page.tsx",
    sections: ["queue", "inpatients"],
  },
];

for (const guard of dynamicSegmentGuards) {
  if (!existsSync(guard.file)) {
    failures.push(`Expected dynamic segment is missing: ${guard.file}`);
    continue;
  }

  const source = readFileSync(guard.file, "utf8");
  if (!/notFound\(\)/.test(source)) {
    failures.push(`${guard.file} must call notFound() for deferred sections.`);
  }

  if (/Placeholder/.test(source)) {
    failures.push(`${guard.file} still falls back to a placeholder instead of 404.`);
  }

  for (const section of guard.sections) {
    // Quoted (an explicit deny list) or backticked (named in the comment that
    // explains an unconditional 404) both count as naming the section.
    if (!new RegExp(`["'\`]${section}["'\`]`).test(source)) {
      failures.push(`${guard.file} does not name the deferred section "${section}".`);
    }
  }
}

const tracked = execFileSync("git", ["ls-files", "apps/web/src"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const sourceFiles = tracked.filter((file) => /\.(ts|tsx)$/.test(file) && existsSync(file));

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const module of deferredModules) {
    for (const alias of module.aliases) {
      // Match the alias as a whole import path, so "@/lib/queue" (shared, and
      // deliberately still in apps/web) never matches "@/components/queue".
      if (new RegExp(`["']${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(source)) {
        failures.push(`${file} imports deferred Phase 2 module "${alias}".`);
      }
    }
  }
}

/**
 * Deferred routes must not be linked from navigation. Print and service
 * catalogue metadata may still name them, so only href/push targets count.
 */
const navigationFiles = sourceFiles.filter((file) => /\/(navigation|shell)\//.test(file));

for (const file of navigationFiles) {
  const source = readFileSync(file, "utf8");
  for (const module of deferredModules) {
    for (const route of module.routes) {
      if (new RegExp(`["']${route}(["'/])`).test(source)) {
        failures.push(`${file} links to deferred Phase 2 route "${route}".`);
      }
    }
  }
}

if (failures.length) {
  console.error(`Phase 1 scope audit failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Phase 1 scope audit passed.");
console.log(`Deferred modules parked: ${deferredModules.map((module) => module.name).join(", ")}`);
console.log(`Phase 1 source files scanned: ${sourceFiles.length}`);
