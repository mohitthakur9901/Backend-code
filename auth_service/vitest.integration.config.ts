import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgresql://looply:password@localhost:5432/looply",
      JWT_SECRET: "integration-test-secret",
      JWT_EXPIRES_IN: "1h",
      NODE_ENV: "test",
    },
  },
});
