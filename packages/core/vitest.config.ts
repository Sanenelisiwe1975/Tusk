import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // WalrusStore integration tests do real Walrus uploads and Sui
    // transactions, each taking several seconds. InMemoryStore tests stay
    // far under this ceiling, so raising it doesn't slow them down.
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
