import {
  access,
  readFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptFilePath = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(scriptFilePath);

const packageRoot = path.resolve(
  scriptsDirectory,
  "..",
);

const sourceRoot = path.join(
  packageRoot,
  "src",
);

const publicIndexPath = path.join(
  sourceRoot,
  "index.ts",
);

const ignoredFiles = new Set([
  "index.ts",
]);

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const discoveredFiles = [];

  for (const entry of entries) {
    const absolutePath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      if (
        entry.name === "__tests__" ||
        entry.name === "node_modules"
      ) {
        continue;
      }

      discoveredFiles.push(
        ...(await collectTypeScriptFiles(absolutePath)),
      );

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith(".ts")) {
      continue;
    }

    if (entry.name.endsWith(".test.ts")) {
      continue;
    }

    const relativePath = path
      .relative(sourceRoot, absolutePath)
      .replaceAll("\\", "/");

    if (ignoredFiles.has(relativePath)) {
      continue;
    }

    discoveredFiles.push(relativePath);
  }

  return discoveredFiles;
}

function toExportPath(relativeFilePath) {
  return `./${relativeFilePath.replace(/\.ts$/, "")}`;
}

function extractBarrelExports(indexSource) {
  const exportPattern =
    /export\s+\*\s+from\s+["']([^"']+)["'];?/g;

  return Array.from(
    indexSource.matchAll(exportPattern),
    (match) => match[1],
  );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
}

async function runAudit() {
  await access(publicIndexPath);

  const sourceFiles = (
    await collectTypeScriptFiles(sourceRoot)
  ).sort();

  const expectedExports = sourceFiles
    .map(toExportPath)
    .sort();

  const indexSource = await readFile(
    publicIndexPath,
    "utf8",
  );

  const actualExports = extractBarrelExports(
    indexSource,
  );

  const missingExports = expectedExports.filter(
    (exportPath) => !actualExports.includes(exportPath),
  );

  const unknownExports = actualExports.filter(
    (exportPath) =>
      exportPath.startsWith("./") &&
      !expectedExports.includes(exportPath),
  );

  const duplicateExports =
    findDuplicates(actualExports);

  const failures = [];

  if (missingExports.length > 0) {
    failures.push(
      [
        "Missing exports:",
        ...missingExports.map(
          (exportPath) => `  - ${exportPath}`,
        ),
      ].join("\n"),
    );
  }

  if (unknownExports.length > 0) {
    failures.push(
      [
        "Exports with no matching source file:",
        ...unknownExports.map(
          (exportPath) => `  - ${exportPath}`,
        ),
      ].join("\n"),
    );
  }

  if (duplicateExports.length > 0) {
    failures.push(
      [
        "Duplicate exports:",
        ...duplicateExports.map(
          (exportPath) => `  - ${exportPath}`,
        ),
      ].join("\n"),
    );
  }

  if (failures.length > 0) {
    console.error(
      "\nWonFlow contract export audit failed.\n",
    );

    console.error(
      failures.join("\n\n"),
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    [
      "WonFlow contract export audit passed.",
      `Source files checked: ${sourceFiles.length}`,
      `Public exports checked: ${actualExports.length}`,
      "No missing, unknown or duplicate export paths were found.",
    ].join("\n"),
  );
}

runAudit().catch((error) => {
  console.error(
    "Unable to complete the WonFlow contract export audit.",
  );

  console.error(error);

  process.exitCode = 1;
});