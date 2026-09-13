const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  testMatch: "playtest.spec.js",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    headless: true
  }
});
