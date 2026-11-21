import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
    },
  },
  css: { modules: { generateScopedName: "[local]" } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // Threads start far faster than forked processes on Windows, especially when
    // antivirus scans node_modules; generous timeouts absorb coverage overhead.
    pool: "threads",
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/components/**"],
      reporter: ["text-summary", "text"],
      // Fail the run if coverage drops below these floors.
      thresholds: { lines: 95, statements: 95, functions: 94, branches: 83 },
    },
  },
});
