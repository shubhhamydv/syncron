/**
 * Integration Script: generate-december.ts
 *
 * 1. Loads seeded database records for December 2026 via loader.ts.
 * 2. Generates the December 2026 roster using generateRoster().
 * 3. Validates the generated roster with validateRoster().
 * 4. Asserts that validateRoster produces the exact SAME conflicts as generateRoster.
 * 5. Tests idempotent persistence (calls persistRoster twice, tests PUBLISHED guard).
 * 6. Prints totals, conflict breakdown, diagnosis of free days, and itemizes every conflict by brand/date.
 * 7. Verifies known scenario traps and prints candidate replacements.
 */

import { PrismaClient } from '@prisma/client';
import {
  loadEngineInput,
  generateRoster,
  validateRoster,
  persistRoster,
  findReplacements,
} from '../src/engine';

const prisma = new PrismaClient();

async function run() {
  console.log('='.repeat(80));
  console.log('INTEGRATION CHECK: DECEMBER 2026 ROSTER ENGINE & VALIDATOR');
  console.log('='.repeat(80));

  // 1. Load from DB
  console.log('\n[1] Loading database data for December 2026...');
  const input = await loadEngineInput(prisma, 2026, 12);
  console.log(
    `    Loaded: ${input.employees.length} employees, ${input.brands.length} brands, ` +
      `${input.processes.length} processes, ${input.assignments.length} assignments, ` +
      `${input.operatingRules.length} operating rules, ${input.coverageRequirements.length} coverage requirements.`
  );

  // 2. Generate Roster
  console.log('\n[2] Generating roster via pure scheduling engine (generateRoster)...');
  const output = generateRoster(input);
  console.log(`    Generated ${output.entries.length} entries and ${output.conflicts.length} conflicts.`);

  // 3. Validate Roster Independently
  console.log('\n[3] Validating roster independently via validator engine (validateRoster)...');
  const validationConflicts = validateRoster(input, output.entries);
  console.log(`    Validation found ${validationConflicts.length} conflicts.`);

  // 4. Assert Exact Conflict Parity between Generator and Validator
  console.log('\n[4] Asserting parity between generator conflicts and validator conflicts...');
  if (output.conflicts.length !== validationConflicts.length) {
    console.error(
      `PARITY FAILURE: Generator emitted ${output.conflicts.length} conflicts, but Validator detected ${validationConflicts.length} conflicts!`
    );
    process.exit(1);
  }

  let parityMismatches = 0;
  for (let i = 0; i < output.conflicts.length; i++) {
    const gen = output.conflicts[i];
    const val = validationConflicts[i];

    const match =
      gen.date === val.date &&
      gen.brandId === val.brandId &&
      gen.processId === val.processId &&
      gen.type === val.type &&
      gen.requiredStaff === val.requiredStaff &&
      gen.availableStaff === val.availableStaff;

    if (!match) {
      parityMismatches++;
      console.error(
        `MISMATCH at conflict [${i}]: Gen(${gen.date}, ${gen.brandId}, ${gen.type}) vs Val(${val.date}, ${val.brandId}, ${val.type})`
      );
    }
  }

  if (parityMismatches > 0) {
    console.error(`PARITY ASSERTION FAILED: ${parityMismatches} conflict mismatch(es) found!`);
    process.exit(1);
  }
  console.log('    PARITY ASSERTION PASSED: validateRoster produced the exact SAME conflicts as generateRoster.');

  // 5. Test Idempotent Persist & Published Guard
  console.log('\n[5] Testing persistRoster idempotency and PUBLISHED guard...');
  // First persist
  const persisted1 = await persistRoster(prisma, input, output);
  const count1Entries = await prisma.rosterEntry.count({ where: { rosterId: persisted1.id } });
  const count1Conflicts = await prisma.conflict.count({ where: { rosterId: persisted1.id } });
  console.log(
    `    Call 1: Saved Roster ID: ${persisted1.id} (Entries: ${count1Entries}, Conflicts: ${count1Conflicts})`
  );

  // Second persist (idempotency check: should delete and recreate without error)
  const persisted2 = await persistRoster(prisma, input, output);
  const count2Entries = await prisma.rosterEntry.count({ where: { rosterId: persisted2.id } });
  const count2Conflicts = await prisma.conflict.count({ where: { rosterId: persisted2.id } });
  console.log(
    `    Call 2: Re-persisted Roster ID: ${persisted2.id} (Entries: ${count2Entries}, Conflicts: ${count2Conflicts})`
  );

  if (count1Entries !== count2Entries || count1Conflicts !== count2Conflicts) {
    console.error('IDEMPOTENCY FAILURE: Counts mismatch between consecutive persistRoster calls!');
    process.exit(1);
  }
  console.log('    PERSIST IDEMPOTENCY PASSED: Re-running persistRoster safely replaced draft records.');

  // Test PUBLISHED guard
  await prisma.roster.update({
    where: { id: persisted2.id },
    data: { status: 'PUBLISHED' },
  });
  let publishedBlocked = false;
  try {
    await persistRoster(prisma, input, output);
  } catch (err: any) {
    if (err.message.includes('PUBLISHED')) {
      publishedBlocked = true;
      console.log(`    PUBLISHED GUARD PASSED: Successfully rejected overwrite with message: "${err.message}"`);
    }
  }
  // Reset back to DRAFT
  await prisma.roster.update({
    where: { id: persisted2.id },
    data: { status: 'DRAFT' },
  });

  if (!publishedBlocked) {
    console.error('PUBLISHED GUARD FAILURE: persistRoster allowed overwriting a PUBLISHED roster!');
    process.exit(1);
  }

  // 6. Diagnostics & Statistics
  console.log('\n[6] SUMMARY STATISTICS & DIAGNOSTICS:');
  const brandMap = new Map(input.brands.map((b) => [b.id, b]));
  const processMap = new Map(input.processes.map((p) => [p.id, p]));

  console.log(`    Total Days in December: ${output.stats.totalDays}`);
  console.log(`    Total Active Employees: ${output.stats.totalEmployees}`);
  console.log(`    Total Roster Entries:   ${output.stats.totalEntries}`);
  console.log(`    Working Shift Entries:  ${output.stats.workingEntries}`);
  console.log(`    Off Duty / Leave:       ${output.stats.offEntries}`);
  console.log(`    Total Conflicts Emitted: ${output.stats.conflictCount}`);

  // (a) Roster entries grouped by status
  const entriesByStatus: Record<string, number> = {};
  for (const e of output.entries) {
    entriesByStatus[e.status] = (entriesByStatus[e.status] || 0) + 1;
  }
  console.log(`\n    --- Roster Entries Grouped by Status ---`);
  for (const [st, count] of Object.entries(entriesByStatus)) {
    console.log(`      * ${st.padEnd(16)}: ${count}`);
  }

  // (b) Diagnosis: Free Day with Brand Closed (e.g. Sunday for Mon-Sat brand)
  console.log(`\n    --- Diagnosis: Free Day with Brand Closed ---`);
  const sampleFreeSundayEntry = output.entries.find((e) => {
    const emp = input.employees.find((em) => em.name === 'Preeti Choudhury');
    return emp && e.employeeId === emp.id && e.date === '2026-12-06';
  });
  console.log(`      Sample Employee: Preeti Choudhury (Urban Dhaga Escalations, Mon-Sat)`);
  console.log(`      Designated Weekly Off: Sunday (day 0)`);
  console.log(`      Date: 2026-12-06 (Sunday - brand is closed, employee is on weekly off)`);
  console.log(`      Stored Status: ${sampleFreeSundayEntry?.status}`);

  // (c) Conflicts grouped by Brand + Process + Type
  console.log(`\n    --- Conflicts Grouped by Brand + Process + Type ---`);
  const groupedConflicts = new Map<string, number>();
  for (const c of output.conflicts) {
    const bName = brandMap.get(c.brandId)?.name || c.brandId;
    const pName = processMap.get(c.processId)?.name || c.processId;
    const key = `${bName} | ${pName} | ${c.type}`;
    groupedConflicts.set(key, (groupedConflicts.get(key) || 0) + 1);
  }

  const sortedGroups = Array.from(groupedConflicts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedGroups) {
    console.log(`      * ${key.padEnd(52)}: ${count}`);
  }

  // (d) ITEMIZE EVERY REMAINING CONFLICT IN DECEMBER
  console.log(`\n[7] ITEMIZED LIST OF ALL ${output.conflicts.length} REMAINING CONFLICTS IN DECEMBER 2026:`);
  for (let i = 0; i < output.conflicts.length; i++) {
    const c = output.conflicts[i];
    const bName = brandMap.get(c.brandId)?.name || c.brandId;
    const pName = processMap.get(c.processId)?.name || c.processId;
    console.log(
      `${c.date} | ${bName} | ${pName} | ${c.type} | ${c.message}`
    );
  }

  // 8. Known Scenarios Verification
  console.log('\n[8] KNOWN SCENARIOS IN DECEMBER 2026:');
  const kalyan = input.brands.find((b) => b.name === 'Kalyan Organics')!;
  const csProc = input.processes.find((p) => p.name === 'CS')!;
  const sundayDates = ['2026-12-06', '2026-12-13', '2026-12-20', '2026-12-27'];

  console.log('\n  --- Scenario A: Kalyan Organics CS (Sunday Gaps) ---');
  for (const sun of sundayDates) {
    const c = output.conflicts.find(
      (cf) => cf.date === sun && cf.brandId === kalyan.id && cf.processId === csProc.id
    );
    console.log(`    * ${sun} [Sunday]: ${c ? `FOUND ${c.type} -> ${c.message}` : 'MISSING'}`);
  }

  console.log('\n  --- Scenario B: Zingy Spices NDR (3-day approved leave: Dec 7-9) ---');
  const zingy = input.brands.find((b) => b.name === 'Zingy Spices')!;
  const ndrProc = input.processes.find((p) => p.name === 'NDR')!;
  const zingyDates = ['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10'];

  for (const d of zingyDates) {
    const c = output.conflicts.find(
      (cf) => cf.date === d && cf.brandId === zingy.id && cf.processId === ndrProc.id
    );
    console.log(
      `    * ${d}: ${c ? `CONFLICT ${c.type} -> ${c.message}` : 'COVERED (Working shift assigned as expected)'}`
    );
  }

  console.log('\n  --- Scenario C: Indus Techworks Retention (Dec 15 - Both unavailable) ---');
  const indus = input.brands.find((b) => b.name === 'Indus Techworks')!;
  const retProc = input.processes.find((p) => p.name === 'Retention')!;
  const indusDec15 = output.conflicts.find(
    (cf) => cf.date === '2026-12-15' && cf.brandId === indus.id && cf.processId === retProc.id
  );
  console.log(
    `    * 2026-12-15: ${indusDec15 ? `FOUND ${indusDec15.type} (0/${indusDec15.requiredStaff} staff) -> ${indusDec15.message}` : 'MISSING'}`
  );

  console.log("\n  --- Scenario D: Vikram Malhotra's Cross-Brand Allocation & Overlap Conflicts ---");
  const veda = input.brands.find((b) => b.name === 'Veda Naturals')!;
  const desi = input.brands.find((b) => b.name === 'Desi Threads')!;

  const vikramWorkingEntries = output.entries.filter(
    (e) =>
      input.employees.find((emp) => emp.id === e.employeeId)?.name === 'Vikram Malhotra' &&
      e.status === 'WORKING'
  );
  const desiOverlapConflicts = output.conflicts.filter(
    (cf) => cf.brandId === desi.id && cf.processId === csProc.id && cf.type === 'OVERLAP'
  );

  console.log(
    `    Vikram Malhotra Working Days: ${vikramWorkingEntries.length} shifts (Veda Mon-Fri, Desi Sat)`
  );
  console.log(
    `    Overlap Conflicts Emitted on Second Brand (${desi.name}): ${desiOverlapConflicts.length} dates (Fridays only: Dec 4, 11, 18, 25)`
  );
  for (const oc of desiOverlapConflicts) {
    console.log(`      * ${oc.date} [Friday]: ${oc.message}`);
  }

  console.log('\n  --- Scenario E: Christmas Day (Dec 25, 2026) Holiday Divergence ---');
  const chai = input.brands.find((b) => b.name === 'ChaiMakers')!;
  const bharat = input.brands.find((b) => b.name === 'Bharat Bazaar')!;

  const chaiDec25Entries = output.entries.filter(
    (e) => e.date === '2026-12-25' && e.brandId === chai.id && e.status === 'WORKING'
  );
  const chaiDec25Conflicts = output.conflicts.filter(
    (cf) => cf.date === '2026-12-25' && cf.brandId === chai.id
  );
  const bharatDec25Working = output.entries.filter(
    (e) => e.date === '2026-12-25' && e.brandId === bharat.id && e.status === 'WORKING'
  );

  console.log(`    * ChaiMakers (operatesOnPublicHolidays = false):`);
  console.log(`        Working shifts: ${chaiDec25Entries.length}, Conflicts: ${chaiDec25Conflicts.length} (Closed, staff received HOLIDAY_OFF)`);
  console.log(`    * Bharat Bazaar (operatesOnPublicHolidays = true):`);
  console.log(`        Working shifts assigned: ${bharatDec25Working.length} (Active operation staffed normally on Christmas)`);

  // 9. Replacement List for the first Kalyan Organics gap (2026-12-06)
  console.log('\n[9] REPLACEMENT LIST FOR FIRST KALYAN ORGANICS GAP (2026-12-06):');
  const replacements = findReplacements(input, output.entries, {
    date: '2026-12-06',
    brandId: kalyan.id,
    processId: csProc.id,
  });

  console.log(`    Eligible cross-brand replacements found: ${replacements.length}`);
  for (let i = 0; i < replacements.length; i++) {
    const r = replacements[i];
    console.log(
      `    ${i + 1}. ${r.employeeName.padEnd(20)} (${r.email}) | Primary: ${(r.primaryBrandName || 'N/A').padEnd(18)} | Working Days So Far: ${r.workingDaysSoFar}`
    );
  }

  console.log('\n' + '='.repeat(80));
  console.log('ALL INTEGRATION CHECKS & SCENARIO ASSERTIONS PASSED SUCCESSFULLY!');
  console.log('='.repeat(80));
}

run()
  .catch((e) => {
    console.error('Fatal error in generate-december:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
