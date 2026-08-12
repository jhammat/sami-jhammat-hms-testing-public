import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Fails when production runtime code imports the fictional dataset.
 *
 * Tracked-but-deleted paths are skipped: `git ls-files` still lists a file that
 * has been removed from the working tree, and reading it used to throw, which
 * surfaced as a misleading exit code 0 and an apparently clean audit.
 */
const tracked = execFileSync("git", ["ls-files", "apps/web/src"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const sourceFiles = tracked.filter(
  (file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file) && existsSync(file),
);

const isRuntimeMockDataImport = (source) =>
  /(?:^|\n)\s*(?:import|export)\s+(?!type\b)[\s\S]*?from\s+["']@wonflow\/mock-data["']/.test(source);

const violations = sourceFiles.filter((file) =>
  isRuntimeMockDataImport(readFileSync(file, "utf8")),
);

if (violations.length) {
  console.error(
    `Production mock-data imports found in ${violations.length} of ${sourceFiles.length} runtime files:\n` +
      violations.join("\n"),
  );
  process.exit(1);
}

console.log(`Production runtime audit passed across ${sourceFiles.length} files.`);
