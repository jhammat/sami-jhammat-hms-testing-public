import {
  readFile,
  readdir,
} from "node:fs/promises";

import path from "node:path";
import process from "node:process";
import {
  fileURLToPath,
} from "node:url";

const scriptPath =
  fileURLToPath(import.meta.url);

const packageRoot =
  path.resolve(
    path.dirname(scriptPath),
    "..",
  );

const sourceRoot =
  path.join(
    packageRoot,
    "src",
  );

async function collectSourceFiles(
  directory,
) {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes: true,
      },
    );

  const files = [];

  for (const entry of entries) {
    const absolutePath =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      files.push(
        ...await collectSourceFiles(
          absolutePath,
        ),
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".ts")
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

const forbiddenPatterns = [
  {
    label:
      "consumer email domain",
    pattern:
      /@(gmail|yahoo|hotmail|outlook|live)\.[a-z]{2,}/i,
  },
  {
    label:
      "CNIC-like identifier",
    pattern:
      /\b\d{5}-\d{7}-\d\b/,
  },
  {
    label:
      "Pakistan mobile number without an explicit demo prefix",
    pattern:
      /\b03\d{2}[-\s]?\d{7}\b/,
  },
];

async function runAudit() {
  const files =
    await collectSourceFiles(
      sourceRoot,
    );

  const contents = [];

  for (const filePath of files) {
    contents.push(
      await readFile(
        filePath,
        "utf8",
      ),
    );
  }

  const combinedSource =
    contents.join("\n");

  const failures = [];

  const requiredMarkers = [
    "fictional: true",
    "wonflow.example",
    "WF-DEMO-MR-",
  ];

  for (
    const marker of requiredMarkers
  ) {
    if (
      !combinedSource.includes(marker)
    ) {
      failures.push(
        `Missing fictional-data marker: ${marker}`,
      );
    }
  }

  for (
    const rule of forbiddenPatterns
  ) {
    if (
      rule.pattern.test(
        combinedSource,
      )
    ) {
      failures.push(
        `Detected forbidden ${rule.label}.`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      "\nWonFlow fictional-data audit failed.\n",
    );

    for (
      const failure of failures
    ) {
      console.error(
        `- ${failure}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log(
    [
      "WonFlow fictional-data audit passed.",
      `Source files checked: ${files.length}`,
      "Fictional markers are present.",
      "No consumer email, CNIC-like or ordinary mobile-number patterns were detected.",
    ].join("\n"),
  );
}

runAudit().catch(
  (error) => {
    console.error(
      "Unable to complete the fictional-data audit.",
    );

    console.error(error);

    process.exitCode = 1;
  },
);