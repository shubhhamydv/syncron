import { defineConfig, devices } from '@playwright/test';

const testDbUrl =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/roster_db_test';

// Safety Guard: Refuse to run unless DB ends in '_test'
try {
  const parsed = new URL(testDbUrl);
  const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (!dbName.endsWith('_test')) {
    console.error(`\n❌ PLAYWRIGHT SAFETY REFUSAL: DATABASE_URL points to '${dbName}'. Target DB must end in '_test'.`);
    process.exit(1);
  }
} catch (e: any) {
  console.error(`\n❌ PLAYWRIGHT SAFETY REFUSAL: Invalid DATABASE_URL '${testDbUrl}': ${e.message}`);
  process.exit(1);
}

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
        DATABASE_URL: testDbUrl,
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
