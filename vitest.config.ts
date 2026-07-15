import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Critical recovery / multi-tab / storage surface (not full app UI)
      include: [
        "src/utils/history/**/*.{ts,tsx}",
        "src/utils/storage/**/*.{ts,tsx}",
        "src/utils/profiles/assets.ts",
        "src/hooks/useDraftHistory.ts",
        "src/components/configurator/VersionComparePanel.tsx",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/utils/history/types.ts",
      ],
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 45,
        statements: 55,
      },
    },
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
