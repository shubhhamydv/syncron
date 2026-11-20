import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/roster_db_test',
    },
  },
});
