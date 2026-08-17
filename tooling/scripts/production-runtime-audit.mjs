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
  (file) =>
    /\.(ts|tsx)$/.test(file) &&
    !/\.test\.(ts|tsx)$/.test(file) &&
    !file.endsWith("lib/data/runtime.ts") &&
    existsSync(file),
);

const isRuntimeMockDataImport = (source) => {
  const statementRegex = /(?:import|export)\s+([\s\S]*?)\s+from\s+["']@wonflow\/mock-data["']/g;
  let match;
  while ((match = statementRegex.exec(source)) !== null) {
    let clause = match[0].trim();
    const lastImportIndex = clause.lastIndexOf("import ");
    const lastExportIndex = clause.lastIndexOf("export ");
    const lastKeywordIndex = Math.max(lastImportIndex, lastExportIndex);
    if (lastKeywordIndex >= 0) {
      clause = clause.slice(lastKeywordIndex).trim();
    }
    const isTypeImport = /^(?:import|export)\s+type\b/.test(clause);
    if (!isTypeImport) {
      return true;
    }
  }
  return false;
};

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
