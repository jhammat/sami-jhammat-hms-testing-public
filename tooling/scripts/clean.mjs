import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const directTargets = [
  "apps/web/.next",
  "apps/web/out",
  "apps/web/tsconfig.tsbuildinfo",
  "tsconfig.tsbuildinfo"
];

const packageRoot = path.join(root, "packages");

if (fs.existsSync(packageRoot)) {
  for (const packageName of fs.readdirSync(packageRoot)) {
    directTargets.push(
      path.join(
        "packages",
        packageName,
        "tsconfig.tsbuildinfo"
      )
    );
  }
}

let removedCount = 0;

for (const relativeTarget of directTargets) {
  const target = path.join(root, relativeTarget);

  if (!fs.existsSync(target)) {
    continue;
  }

  fs.rmSync(target, {
    recursive: true,
    force: true
  });

  console.log(`Removed: ${relativeTarget}`);
  removedCount += 1;
}

if (removedCount === 0) {
  console.log("No generated build files required cleaning.");
} else {
  console.log(
    `Clean completed. Removed ${removedCount} generated item(s).`
  );
}
