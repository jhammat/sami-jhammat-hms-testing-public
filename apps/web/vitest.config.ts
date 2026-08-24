import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://wonflow:wonflow_dev_password@localhost:5432/wonflow_phase1_dev?schema=public",
      REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["src/generated/**", "**/*.d.ts"],
    },
  },
});
