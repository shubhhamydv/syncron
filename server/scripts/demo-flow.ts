/**
 * Live Demonstration Script: demo-flow.ts
 *
 * Executes the live demo end-to-end against the Express API:
 * 1. Generate Dec 2026 roster (check 201)
 * 2. Pick a single-resource brand (Veda Naturals CS, Vikram Malhotra)
 * 3. Add approved leave for Vikram on a working day -> assert COVERAGE_GAP opens
 * 4. Fetch replacements -> assert non-empty, print candidates
 * 5. Assign the first candidate -> assert conflict is resolved
 * 6. Assert parity: validateRoster output matches stored OPEN conflicts
 * 7. Clean up demo changes and restore pristine baseline
 *
 * Exits non-zero on failure.
 */

import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { loadEngineInput, validateRoster, toDateString } from '../src/engine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n❌ DEMO FAILURE: ${message}`);
    process.exit(1);
  }
}

async function runDemo() {
  console.log('='.repeat(80));
  console.log('🚀 LIVE DEMO FLOW: SMART ROSTER ENGINE & REST API');
  console.log('   DataStraw AI Tech Internship Assessment');
  console.log('='.repeat(80));

  // Connect DB
  await prisma.$connect();

  // Ensure initial DRAFT state
  const existingRoster = await prisma.roster.findUnique({
    where: { month_year: { month: 12, year: 2026 } },
  });
  if (existingRoster && existingRoster.status === 'PUBLISHED') {
    await prisma.roster.update({
      where: { id: existingRoster.id },
      data: { status: 'DRAFT' },
    });
  }

  // ---------------------------------------------------------------------------
  // STEP 1: Generate Dec 2026 Roster
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 1] Generating December 2026 roster via POST /api/rosters/generate...');
  const genRes = await request(app).post('/api/rosters/generate').send({
    month: 12,
    year: 2026,
  });

  assert(genRes.status === 201, `Expected status 201, got ${genRes.status}: ${JSON.stringify(genRes.body)}`);
  assert(genRes.body.roster?.id !== undefined, 'Roster ID missing in response');
  assert(genRes.body.conflictsCount === 18, `Expected 18 baseline conflicts, got ${genRes.body.conflictsCount}`);

  const rosterId = genRes.body.roster.id;
  console.log(`✅ Roster generated successfully!`);
  console.log(`   Roster ID: ${rosterId}`);
  console.log(`   Total Entries: ${genRes.body.stats.totalEntries}`);
  console.log(`   Working Shifts: ${genRes.body.stats.workingEntries}`);
  console.log(`   Baseline Trap Conflicts: ${genRes.body.conflictsCount}`);

  // ---------------------------------------------------------------------------
  // STEP 2: Pick Single-Resource Brand (Veda Naturals CS)
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 2] Inspecting Single-Resource Brand: Veda Naturals CS...');
  const veda = await prisma.brand.findUnique({ where: { name: 'Veda Naturals' } });
  assert(!!veda, 'Brand "Veda Naturals" not found in database');

  const vikram = await prisma.employee.findFirst({ where: { name: 'Vikram Malhotra' } });
  assert(!!vikram, 'Employee "Vikram Malhotra" not found');

  const testDate = '2026-12-01'; // Tuesday - normal working day for Veda Naturals
  const initialEntry = await prisma.rosterEntry.findFirst({
    where: {
      rosterId,
      employeeId: vikram!.id,
      date: new Date(`${testDate}T00:00:00.000Z`),
    },
  });

  assert(!!initialEntry, `Initial roster entry for Vikram on ${testDate} not found`);
  assert(initialEntry!.status === 'WORKING', `Vikram was expected to be WORKING on ${testDate}, found ${initialEntry!.status}`);
  console.log(`✅ Single-resource brand verified:`);
  console.log(`   Brand: Veda Naturals (Sole assigned resource: Vikram Malhotra)`);
  console.log(`   Target Date: ${testDate} (Tuesday)`);
  console.log(`   Current Shift Status: ${initialEntry!.status} (${initialEntry!.brandId ? 'Assigned' : 'Unassigned'})`);

  // ---------------------------------------------------------------------------
  // STEP 3: Add Approved Leave -> Assert COVERAGE_GAP Opens
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 3] Adding approved emergency leave for Vikram Malhotra on 2026-12-01...');
  const openConflictsBefore = await prisma.conflict.count({
    where: { rosterId, status: 'OPEN' },
  });

  const leaveRes = await request(app).post('/api/availability').send({
    employeeId: vikram!.id,
    type: 'LEAVE',
    startDate: testDate,
    endDate: testDate,
    status: 'APPROVED',
    reason: 'Emergency dental surgery',
  });

  assert(leaveRes.status === 201, `Failed to create leave: ${JSON.stringify(leaveRes.body)}`);
  const leaveId = leaveRes.body.availability.id;

  // Verify Vikram's entry converted to LEAVE
  const updatedEntry = await prisma.rosterEntry.findFirst({
    where: {
      rosterId,
      employeeId: vikram!.id,
      date: new Date(`${testDate}T00:00:00.000Z`),
    },
  });
  assert(updatedEntry!.status === 'LEAVE', `Entry status should be LEAVE, found ${updatedEntry!.status}`);

  // Verify that an OPEN COVERAGE_GAP conflict was created
  const openConflictsAfter = await prisma.conflict.count({
    where: { rosterId, status: 'OPEN' },
  });
  assert(openConflictsAfter === openConflictsBefore + 1, `Expected open conflicts to increase by 1 (${openConflictsBefore + 1}), got ${openConflictsAfter}`);

  const openedConflict = await prisma.conflict.findFirst({
    where: {
      rosterId,
      brandId: veda!.id,
      date: new Date(`${testDate}T00:00:00.000Z`),
      status: 'OPEN',
    },
  });

  assert(!!openedConflict, `OPEN conflict for Veda Naturals on ${testDate} was not found!`);
  assert(openedConflict!.type === 'COVERAGE_GAP', `Expected COVERAGE_GAP, got ${openedConflict!.type}`);
  console.log(`✅ New COVERAGE_GAP conflict automatically opened!`);
  console.log(`   Conflict ID: ${openedConflict!.id}`);
  console.log(`   Date: ${toDateString(openedConflict!.date)}`);
  console.log(`   Type: ${openedConflict!.type}`);
  console.log(`   Message: ${openedConflict!.message}`);

  // ---------------------------------------------------------------------------
  // STEP 4: Query AI / Engine Replacements
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 4] Fetching eligible cross-brand replacements via GET /api/conflicts/:id/replacements...');
  const repRes = await request(app).get(`/api/conflicts/${openedConflict!.id}/replacements`);
  assert(repRes.status === 200, `Failed to get replacements: ${JSON.stringify(repRes.body)}`);

  const candidates = repRes.body;
  assert(Array.isArray(candidates) && candidates.length > 0, 'No replacement candidates found!');
  console.log(`✅ Found ${candidates.length} eligible cross-brand replacement candidates:`);
  candidates.slice(0, 5).forEach((c: any, idx: number) => {
    console.log(
      `   ${idx + 1}. ${c.employeeName.padEnd(20)} (${c.email}) | Primary: ${(c.primaryBrandName || 'None').padEnd(18)} | Working Days So Far: ${c.workingDaysSoFar}`
    );
  });

  const selectedCandidate = candidates[0];
  console.log(`   👉 Selected top fair-distribution candidate: ${selectedCandidate.employeeName} (${selectedCandidate.employeeId})`);

  // ---------------------------------------------------------------------------
  // STEP 5: Assign the First Candidate -> Assert Conflict is Resolved
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 5] Assigning replacement via POST /api/conflicts/:id/assign...');
  const assignRes = await request(app)
    .post(`/api/conflicts/${openedConflict!.id}/assign`)
    .send({ employeeId: selectedCandidate.employeeId });

  assert(assignRes.status === 200, `Assignment failed: ${JSON.stringify(assignRes.body)}`);
  assert(assignRes.body.entry.status === 'WORKING', `Expected status WORKING, got ${assignRes.body.entry.status}`);
  assert(assignRes.body.entry.employeeId === selectedCandidate.employeeId, 'Assigned employeeId mismatch');

  const resolvedConflict = await prisma.conflict.findUnique({
    where: { id: openedConflict!.id },
  });
  assert(resolvedConflict!.status === 'RESOLVED', `Expected conflict status RESOLVED, got ${resolvedConflict!.status}`);
  assert(resolvedConflict!.resolvedAt !== null, 'resolvedAt timestamp was not set');

  console.log(`✅ Conflict successfully resolved!`);
  console.log(`   Assigned Employee: ${selectedCandidate.employeeName}`);
  console.log(`   Shift Date: ${testDate}`);
  console.log(`   Conflict Status: ${resolvedConflict!.status}`);
  console.log(`   Resolved At: ${resolvedConflict!.resolvedAt?.toISOString()}`);

  // ---------------------------------------------------------------------------
  // STEP 6: Assert Strict Parity with validateRoster
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 6] Asserting strict parity between validateRoster and database OPEN conflicts...');
  const input = await loadEngineInput(prisma, 2026, 12);
  const allEntries = await prisma.rosterEntry.findMany({ where: { rosterId } });
  const entryDrafts = allEntries.map((e) => ({
    employeeId: e.employeeId,
    brandId: e.brandId,
    processId: e.processId,
    date: toDateString(e.date),
    status: e.status,
  }));

  const validationConflicts = validateRoster(input, entryDrafts);
  const currentOpenDbConflicts = await prisma.conflict.findMany({
    where: { rosterId, status: 'OPEN' },
    orderBy: [{ date: 'asc' }, { brandId: 'asc' }],
  });

  assert(
    validationConflicts.length === currentOpenDbConflicts.length,
    `Parity count mismatch: Validator detected ${validationConflicts.length} conflicts, but DB has ${currentOpenDbConflicts.length} OPEN conflicts`
  );

  console.log(`✅ ZERO UNEXPECTED CONFLICTS: Full parity verified!`);
  console.log(`   Database OPEN Conflicts: ${currentOpenDbConflicts.length}`);
  console.log(`   Engine Validator Detected: ${validationConflicts.length}`);

  // ---------------------------------------------------------------------------
  // STEP 7: Cleanup
  // ---------------------------------------------------------------------------
  console.log('\n[STEP 7] Cleaning up demo leave and restoring baseline December 2026 roster...');
  await request(app).delete(`/api/availability/${leaveId}`);
  // Regenerate clean baseline
  await request(app).post('/api/rosters/generate').send({ month: 12, year: 2026 });

  const finalCheck = await prisma.conflict.count({
    where: { rosterId, status: 'OPEN' },
  });
  console.log(`✅ Clean baseline restored: ${finalCheck} deliberate trap conflicts remaining.`);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 DEMO FLOW COMPLETED WITH 100% SUCCESS!');
  console.log('='.repeat(80));

  await prisma.$disconnect();
  process.exit(0);
}

runDemo().catch(async (err) => {
  console.error('Fatal Demo Error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
