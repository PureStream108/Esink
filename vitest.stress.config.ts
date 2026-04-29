import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.stress.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
