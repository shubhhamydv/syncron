import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npx ts-node src/server.ts',
      cwd: '../server',
      port: 4000,
      reuseExistingServer: true,
      env: {
        PORT: '4000',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/roster_db?schema=test_schema',
      },
    },
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: true,
      env: {
        VITE_API_URL: 'http://localhost:4000/api',
      },
    },
  ],
});
