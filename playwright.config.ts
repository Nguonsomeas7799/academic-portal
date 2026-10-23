import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start -- --port 3100',
        url: 'http://localhost:3100/login',
        reuseExistingServer: false,
        timeout: 60000,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
