import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://wonflow:wonflow_local_only@localhost:5432/wonflow_phase1_dev?schema=public",
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["src/generated/**", "**/*.d.ts"],
    },
  },
});
