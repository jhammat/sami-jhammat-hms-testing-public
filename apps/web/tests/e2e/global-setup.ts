import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Restore the development dataset before the suite runs. The diagnostics flow
 * consumes open laboratory orders when it releases a result, so without this
 * the suite would only pass on a freshly seeded database.
 */
export default function globalSetup(): void {
  const repositoryRoot = path.resolve(__dirname, "../../../..");

  execSync("pnpm db:seed:dev", { cwd: repositoryRoot, stdio: "inherit" });
}
