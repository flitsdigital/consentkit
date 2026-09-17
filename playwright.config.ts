import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000", permissions: ["clipboard-read", "clipboard-write"] },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
});
