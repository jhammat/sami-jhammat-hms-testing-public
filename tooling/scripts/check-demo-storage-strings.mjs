import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Fails the build if the leftover demo/mock client-storage prefix
 * ("wonflow-demo-") appears anywhere in tracked source. That prefix marks
 * data that was persisted to the browser (localStorage/sessionStorage)
 * instead of PostgreSQL — see docs/architecture/client-storage.md. Its
 * presence anywhere in the source is itself the defect this check exists to
 * catch, independent of the ESLint rule that only inspects statically
 * analysable localStorage/sessionStorage/document.cookie access.
 */

const MARKER = "wonflow-demo" + "-";

const selfPath = path.relative(
  process.cwd(),
  fileURLToPath(import.meta.url),
).split(path.sep).join("/");

const sourceExtensions = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const excludedRoots = [
  "future/",
  "deferred/",
];

const tracked = execFileSync(
  "git",
  ["ls-files"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => sourceExtensions.test(file))
  .filter((file) => file !== selfPath)
  .filter(
    (file) =>
      !excludedRoots.some((root) => file.startsWith(root)),
  );

const marker = new RegExp(
  MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);

const violations = [];

for (const file of tracked) {
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  const lines = contents.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (marker.test(line)) {
      violations.push(
        `${file}:${index + 1}: ${line.trim()}`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error(
    `Found "${MARKER}" in ${violations.length} location${violations.length === 1 ? "" : "s"}:\n${violations.join("\n")}`,
  );
  console.error(
    "\nRemove leftover demo/mock client-storage keys. User data belongs in PostgreSQL, reached through an API route.",
  );
  process.exit(1);
}

console.log(
  `No "${MARKER}" strings found in ${tracked.length} source files.`,
);
