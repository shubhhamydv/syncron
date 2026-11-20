/**
 * Test Database Safety Guard.
 * Refuses to let test suites execute against development or production databases.
 * Mandates that the targeted database name must end in '_test' (e.g., roster_db_test).
 */
export function assertTestDatabase(url?: string): void {
  const dbUrl = url || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('\n❌ CRITICAL SAFETY ERROR: DATABASE_URL is not configured for tests.');
    throw new Error('SAFETY CHECK FAILED: DATABASE_URL is not set.');
  }

  try {
    const parsed = new URL(dbUrl);
    const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];

    if (!dbName.endsWith('_test')) {
      console.error('\n================================================================================');
      console.error('❌ CRITICAL TEST SAFETY GUARD TRIGGERED');
      console.error(`Refusing to run tests: DATABASE_URL points to database '${dbName}'.`);
      console.error("Test execution is strictly restricted to databases whose names end in '_test'");
      console.error("Example: postgresql://postgres:postgres@localhost:5432/roster_db_test");
      console.error('================================================================================\n');
      throw new Error(
        `SAFETY CHECK FAILED: Target database '${dbName}' does not end with '_test'. Tests refused to execute.`
      );
    }
  } catch (e: any) {
    if (e.message?.startsWith('SAFETY CHECK FAILED')) throw e;
    throw new Error(`SAFETY CHECK FAILED: Could not parse database URL: ${e.message}`);
  }
}
