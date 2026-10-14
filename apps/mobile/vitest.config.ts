import { defineConfig } from "vitest/config";

// Unit tests cover the pure logic (storage, body map, lock policy). Screens
// are exercised on a device or simulator.
export default defineConfig({
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
