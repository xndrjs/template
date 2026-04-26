// Vitest config for the whole monorepo
import { defineBaseVitestConfig } from "@features/config-vitest";

export default defineBaseVitestConfig({
  test: {
    include: ["features/**/*.test.ts", "tools/**/*.test.ts"],
  },
});
