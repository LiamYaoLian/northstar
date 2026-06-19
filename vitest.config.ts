import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["src/components/**/*.test.tsx", "happy-dom"],
      ["src/components/**/*.test.ts", "happy-dom"],
    ],
    setupFiles: ["./src/test/setup.ts"],
    // libSQL file DB locks under parallel integration tests
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
