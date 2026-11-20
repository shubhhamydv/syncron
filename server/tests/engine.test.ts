import { describe, it, expect } from 'vitest';
import {
  generateRoster,
  validateRoster,
  findReplacements,
  EngineInput,
  RosterEntryDraft,
  monthDates,
} from '../src/engine';

function createBaseFixture(): EngineInput {
  return {
    month: 12,
    year: 2026,
    brands: [
      { id: 'b1', name: 'Brand Alpha', status: 'ACTIVE' },
      { id: 'b2', name: 'Brand Beta', status: 'ACTIVE' },
    ],
    processes: [
      { id: 'p1', name: 'CS' },
      { id: 'p2', name: 'NDR' },
    ],
    employees: [
      { id: 'e1', name: 'Aarav Sharma', email: 'aarav@test.io', podId: 'pod1', status: 'ACTIVE' },
      { id: 'e2', name: 'Priya Patel', email: 'priya@test.io', podId: 'pod1', status: 'ACTIVE' },
      { id: 'e3', name: 'Rohan Iyer', email: 'rohan@test.io', podId: 'pod1', status: 'ACTIVE' },
    ],
    assignments: [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
      { employeeId: 'e2', brandId: 'b1', processId: 'p1' },
      { employeeId: 'e3', brandId: 'b2', processId: 'p1' },
    ],
    operatingRules: [
      { brandId: 'b1', processId: 'p1', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false },
      { brandId: 'b2', processId: 'p1', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: true },
    ],
    coverageRequirements: [
      { brandId: 'b1', processId: 'p1', minimumStaff: 1 },
      { brandId: 'b2', processId: 'p1', minimumStaff: 1 },
    ],
    availabilities: [
      { employeeId: 'e1', type: 'WEEKLY_OFF', dayOfWeek: 0, status: 'APPROVED' }, // Sun off
      { employeeId: 'e2', type: 'WEEKLY_OFF', dayOfWeek: 0, status: 'APPROVED' }, // Sun off
      { employeeId: 'e3', type: 'WEEKLY_OFF', dayOfWeek: 0, status: 'APPROVED' }, // Sun off
    ],
    holidays: [
      { date: '2026-12-25', name: 'Christmas Day', region: 'National' },
    ],
  };
}

describe('Scheduling Engine & Validator Tests', () => {
  // 1. Single-resource brand, employee available -> assigned.
  it('1. Single-resource brand, employee available -> assigned', () => {
    const fixture = createBaseFixture();
    // Only e1 assigned to b1 p1
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [fixture.operatingRules[0]];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];

    const result = generateRoster(fixture);
    // Tuesday 2026-12-01: e1 is available, brand operates
    const dec1Entry = result.entries.find((e) => e.date === '2026-12-01' && e.employeeId === 'e1');
    expect(dec1Entry).toBeDefined();
    expect(dec1Entry?.status).toBe('WORKING');
    expect(dec1Entry?.brandId).toBe('b1');
    expect(dec1Entry?.processId).toBe('p1');

    // No conflicts on Dec 1
    const dec1Conflict = result.conflicts.find((c) => c.date === '2026-12-01');
    expect(dec1Conflict).toBeUndefined();
  });

  // 2. Single-resource brand, employee on approved leave -> COVERAGE_GAP.
  it('2. Single-resource brand, employee on approved leave -> COVERAGE_GAP', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [fixture.operatingRules[0]];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];
    fixture.availabilities.push({
      employeeId: 'e1',
      type: 'LEAVE',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      status: 'APPROVED',
      reason: 'Medical Leave',
    });

    const result = generateRoster(fixture);
    const dec1Entry = result.entries.find((e) => e.date === '2026-12-01' && e.employeeId === 'e1');
    expect(dec1Entry?.status).toBe('LEAVE');

    const dec1Conflict = result.conflicts.find(
      (c) => c.date === '2026-12-01' && c.brandId === 'b1' && c.processId === 'p1'
    );
    expect(dec1Conflict).toBeDefined();
    expect(dec1Conflict?.type).toBe('COVERAGE_GAP');
    expect(dec1Conflict?.requiredStaff).toBe(1);
    expect(dec1Conflict?.availableStaff).toBe(0);
    expect(dec1Conflict?.message).toContain('Medical Leave');
  });

  // 3. PENDING leave does NOT block assignment.
  it('3. PENDING leave does NOT block assignment', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [fixture.operatingRules[0]];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];
    fixture.availabilities.push({
      employeeId: 'e1',
      type: 'LEAVE',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      status: 'PENDING',
      reason: 'Unapproved Vacation',
    });

    const result = generateRoster(fixture);
    const dec1Entry = result.entries.find((e) => e.date === '2026-12-01' && e.employeeId === 'e1');
    expect(dec1Entry?.status).toBe('WORKING');
    const dec1Conflict = result.conflicts.find((c) => c.date === '2026-12-01');
    expect(dec1Conflict).toBeUndefined();
  });

  // 4. 365-day brand + employee weekly off Sunday -> gap every Sunday.
  it('4. 365-day brand + employee weekly off Sunday -> gap every Sunday', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    // Operates all 7 days (including Sunday 0)
    fixture.operatingRules = [
      { brandId: 'b1', processId: 'p1', workingDays: [0, 1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false },
    ];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];
    // e1 has Sunday weekly off
    fixture.availabilities = [{ employeeId: 'e1', type: 'WEEKLY_OFF', dayOfWeek: 0, status: 'APPROVED' }];

    const result = generateRoster(fixture);
    const sundays = ['2026-12-06', '2026-12-13', '2026-12-20', '2026-12-27'];

    for (const sun of sundays) {
      const sunConflict = result.conflicts.find((c) => c.date === sun && c.brandId === 'b1');
      expect(sunConflict).toBeDefined();
      expect(sunConflict?.type).toBe('COVERAGE_GAP');

      const sunEntry = result.entries.find((e) => e.date === sun && e.employeeId === 'e1');
      expect(sunEntry?.status).toBe('WEEKLY_OFF');
    }
  });

  // 5. Brand closed on a holiday (operatesOnPublicHolidays=false) -> no requirement, no conflict; brand open on holiday -> required.
  it('5. Brand closed on a holiday -> no requirement, no conflict; brand open on holiday -> required', () => {
    const fixture = createBaseFixture();
    // Dec 25 is holiday. b1 operatesOnPublicHolidays=false; b2 operatesOnPublicHolidays=true.
    const result = generateRoster(fixture);

    // b1 is closed on Dec 25: no requirement, no conflict
    const b1HolidayConflict = result.conflicts.find((c) => c.date === '2026-12-25' && c.brandId === 'b1');
    expect(b1HolidayConflict).toBeUndefined();

    // b2 is open on Dec 25: e3 is assigned, working requirement fulfilled
    const b2HolidayEntry = result.entries.find(
      (e) => e.date === '2026-12-25' && e.brandId === 'b2' && e.status === 'WORKING'
    );
    expect(b2HolidayEntry).toBeDefined();
    expect(b2HolidayEntry?.employeeId).toBe('e3');
  });

  // 6. 2-resource brand, one unavailable, min staff 2 -> INSUFFICIENT_STAFF; both unavailable -> COVERAGE_GAP.
  it('6. 2-resource brand, one unavailable, min staff 2 -> INSUFFICIENT_STAFF; both unavailable -> COVERAGE_GAP', () => {
    const fixture = createBaseFixture();
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 2 }];
    // Day 1 (Dec 1): e1 has leave, e2 is available
    fixture.availabilities.push({
      employeeId: 'e1',
      type: 'LEAVE',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      status: 'APPROVED',
      reason: 'Leave for e1',
    });
    // Day 2 (Dec 2): both e1 and e2 on leave
    fixture.availabilities.push(
      {
        employeeId: 'e1',
        type: 'LEAVE',
        startDate: '2026-12-02',
        endDate: '2026-12-02',
        status: 'APPROVED',
        reason: 'Leave for e1',
      },
      {
        employeeId: 'e2',
        type: 'LEAVE',
        startDate: '2026-12-02',
        endDate: '2026-12-02',
        status: 'APPROVED',
        reason: 'Leave for e2',
      }
    );

    const result = generateRoster(fixture);

    // On Dec 1: e2 works, but 1 of 2 required -> INSUFFICIENT_STAFF
    const dec1Conflict = result.conflicts.find((c) => c.date === '2026-12-01' && c.brandId === 'b1');
    expect(dec1Conflict).toBeDefined();
    expect(dec1Conflict?.type).toBe('INSUFFICIENT_STAFF');
    expect(dec1Conflict?.availableStaff).toBe(1);
    expect(dec1Conflict?.requiredStaff).toBe(2);

    // On Dec 2: 0 available -> COVERAGE_GAP
    const dec2Conflict = result.conflicts.find((c) => c.date === '2026-12-02' && c.brandId === 'b1');
    expect(dec2Conflict).toBeDefined();
    expect(dec2Conflict?.type).toBe('COVERAGE_GAP');
    expect(dec2Conflict?.availableStaff).toBe(0);
    expect(dec2Conflict?.requiredStaff).toBe(2);
  });

  // 7. Employee assigned to two brands that both operate the same day -> only one gets them, the other gets an OVERLAP conflict.
  it('7. Employee assigned to two brands operating the same day -> OVERLAP conflict', () => {
    const fixture = createBaseFixture();
    // Only e1 in the system, assigned to both b1 p1 AND b2 p1
    fixture.employees = [fixture.employees[0]];
    fixture.assignments = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
      { employeeId: 'e1', brandId: 'b2', processId: 'p1' },
    ];
    fixture.coverageRequirements = [
      { brandId: 'b1', processId: 'p1', minimumStaff: 1 },
      { brandId: 'b2', processId: 'p1', minimumStaff: 1 },
    ];

    const result = generateRoster(fixture);

    // On Dec 1 (Tuesday): e1 should only be assigned WORKING to one brand
    const dec1Working = result.entries.filter((e) => e.date === '2026-12-01' && e.status === 'WORKING');
    expect(dec1Working.length).toBe(1);

    // The other brand must receive an OVERLAP conflict
    const dec1Conflicts = result.conflicts.filter((c) => c.date === '2026-12-01');
    expect(dec1Conflicts.length).toBe(1);
    expect(dec1Conflicts[0].type).toBe('OVERLAP');
    expect(dec1Conflicts[0].message).toContain('already working on');
  });

  // 8. Leave end date inclusive.
  it('8. Leave end date is inclusive', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [fixture.operatingRules[0]];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];

    // Leave from 2026-12-07 through 2026-12-09 inclusive (Mon, Tue, Wed)
    fixture.availabilities.push({
      employeeId: 'e1',
      type: 'LEAVE',
      startDate: '2026-12-07',
      endDate: '2026-12-09',
      status: 'APPROVED',
      reason: '3-day wedding leave',
    });

    const result = generateRoster(fixture);
    const leaveDays = ['2026-12-07', '2026-12-08', '2026-12-09'];

    for (const d of leaveDays) {
      const entry = result.entries.find((e) => e.date === d && e.employeeId === 'e1');
      expect(entry?.status).toBe('LEAVE');
      const conflict = result.conflicts.find((c) => c.date === d && c.brandId === 'b1');
      expect(conflict).toBeDefined();
      expect(conflict?.type).toBe('COVERAGE_GAP');
    }

    // Dec 10 (Thursday): Employee is available and assigned
    const dec10Entry = result.entries.find((e) => e.date === '2026-12-10' && e.employeeId === 'e1');
    expect(dec10Entry?.status).toBe('WORKING');
    const dec10Conflict = result.conflicts.find((c) => c.date === '2026-12-10');
    expect(dec10Conflict).toBeUndefined();
  });

  // 9. Minimum staffing increased -> new INSUFFICIENT_STAFF.
  it('9. Minimum staffing increased -> new INSUFFICIENT_STAFF', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [fixture.operatingRules[0]];

    // 1 staff: zero conflicts
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];
    const res1 = generateRoster(fixture);
    const dec1Conflict1 = res1.conflicts.find((c) => c.date === '2026-12-01' && c.brandId === 'b1');
    expect(dec1Conflict1).toBeUndefined();

    // Increase minStaff to 2: 1 staff allocated, emits INSUFFICIENT_STAFF
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 2 }];
    const res2 = generateRoster(fixture);
    const dec1Conflict2 = res2.conflicts.find((c) => c.date === '2026-12-01' && c.brandId === 'b1');
    expect(dec1Conflict2).toBeDefined();
    expect(dec1Conflict2?.type).toBe('INSUFFICIENT_STAFF');
    expect(dec1Conflict2?.requiredStaff).toBe(2);
    expect(dec1Conflict2?.availableStaff).toBe(1);
  });

  // 10. Weekly off changed -> regenerating gives new results.
  it('10. Weekly off changed -> regenerating gives new results', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [{ employeeId: 'e1', brandId: 'b1', processId: 'p1' }];
    fixture.employees = [fixture.employees[0]];
    fixture.brands = [fixture.brands[0]];
    fixture.operatingRules = [
      { brandId: 'b1', processId: 'p1', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false },
    ];
    fixture.coverageRequirements = [{ brandId: 'b1', processId: 'p1', minimumStaff: 1 }];

    // Run 1: e1 weekly off on Monday (day 1)
    fixture.availabilities = [{ employeeId: 'e1', type: 'WEEKLY_OFF', dayOfWeek: 1, status: 'APPROVED' }];
    const res1 = generateRoster(fixture);
    // Dec 7 is Monday: has gap in Run 1
    const monConflict1 = res1.conflicts.find((c) => c.date === '2026-12-07' && c.brandId === 'b1');
    expect(monConflict1).toBeDefined();
    // Dec 9 is Wednesday: working in Run 1
    const wedEntry1 = res1.entries.find((e) => e.date === '2026-12-09' && e.employeeId === 'e1');
    expect(wedEntry1?.status).toBe('WORKING');

    // Run 2: change e1 weekly off to Wednesday (day 3)
    fixture.availabilities = [{ employeeId: 'e1', type: 'WEEKLY_OFF', dayOfWeek: 3, status: 'APPROVED' }];
    const res2 = generateRoster(fixture);
    // Dec 7 is Monday: no gap in Run 2
    const monConflict2 = res2.conflicts.find((c) => c.date === '2026-12-07' && c.brandId === 'b1');
    expect(monConflict2).toBeUndefined();
    // Dec 9 is Wednesday: has gap in Run 2
    const wedConflict2 = res2.conflicts.find((c) => c.date === '2026-12-09' && c.brandId === 'b1');
    expect(wedConflict2).toBeDefined();
    expect(wedConflict2?.type).toBe('COVERAGE_GAP');
  });

  // 11. Determinism: run twice, deep-equal.
  it('11. Determinism: running twice produces identical deep-equal output', () => {
    const fixture = createBaseFixture();
    const run1 = generateRoster(fixture);
    const run2 = generateRoster(fixture);
    expect(run1).toEqual(run2);
  });

  // 12. validateRoster flags a hand-corrupted roster (employee on leave marked WORKING, duplicate brand assignment same day, understaffed requirement).
  it('12. validateRoster flags hand-corrupted rosters', () => {
    const fixture = createBaseFixture();
    fixture.assignments = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
      { employeeId: 'e2', brandId: 'b2', processId: 'p1' },
    ];
    fixture.availabilities.push({
      employeeId: 'e1',
      type: 'LEAVE',
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      status: 'APPROVED',
      reason: 'Sick leave',
    });

    const validOutput = generateRoster(fixture);

    // Corruption A: Employee on leave marked WORKING
    const corruptedA: RosterEntryDraft[] = validOutput.entries.map((e) =>
      e.employeeId === 'e1' && e.date === '2026-12-01'
        ? { ...e, status: 'WORKING', brandId: 'b1', processId: 'p1' }
        : { ...e }
    );
    const conflictsA = validateRoster(fixture, corruptedA);
    const leaveViolation = conflictsA.find((c) => c.type === 'LEAVE_CONFLICT' && c.date === '2026-12-01');
    expect(leaveViolation).toBeDefined();
    expect(leaveViolation?.message).toContain('Leave violation');

    // Corruption B: Duplicate working assignment on the same day
    const corruptedB: RosterEntryDraft[] = [
      ...validOutput.entries,
      {
        employeeId: 'e2',
        brandId: 'b1',
        processId: 'p1',
        date: '2026-12-01',
        status: 'WORKING',
      },
    ];
    const conflictsB = validateRoster(fixture, corruptedB);
    const dupViolation = conflictsB.find(
      (c) => c.type === 'OVERLAP' && c.date === '2026-12-01' && c.message.includes('Illegal duplicate shift')
    );
    expect(dupViolation).toBeDefined();

    // Corruption C: Understaffed requirement (wipe all working entries for Dec 2)
    const corruptedC: RosterEntryDraft[] = validOutput.entries.map((e) =>
      e.date === '2026-12-02' ? { ...e, status: 'WEEKLY_OFF', brandId: null, processId: null } : { ...e }
    );
    const conflictsC = validateRoster(fixture, corruptedC);
    const understaffed = conflictsC.filter((c) => c.date === '2026-12-02');
    expect(understaffed.length).toBeGreaterThan(0);
    expect(understaffed.some((c) => c.type === 'COVERAGE_GAP')).toBe(true);
  });

  // 13. findReplacements returns eligible backups and excludes anyone unavailable or already working.
  it('13. findReplacements returns eligible backups and excludes anyone unavailable or already working', () => {
    const fixture = createBaseFixture();
    // 4 employees, all qualified in process p1 ('CS')
    fixture.employees = [
      { id: 'e1', name: 'Aarav Sharma', email: 'aarav@test.io', podId: 'pod1', status: 'ACTIVE' },
      { id: 'e2', name: 'Priya Patel', email: 'priya@test.io', podId: 'pod1', status: 'ACTIVE' },
      { id: 'e3', name: 'Rohan Iyer', email: 'rohan@test.io', podId: 'pod1', status: 'ACTIVE' },
      { id: 'e4', name: 'Neha Joshi', email: 'neha@test.io', podId: 'pod1', status: 'ACTIVE' },
    ];
    fixture.assignments = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
      { employeeId: 'e2', brandId: 'b2', processId: 'p1' },
      { employeeId: 'e3', brandId: 'b2', processId: 'p1' },
      { employeeId: 'e4', brandId: 'b2', processId: 'p1' },
    ];

    // On target date '2026-12-02':
    // e1 has a gap on b1
    // e2 is already WORKING
    // e3 is on approved LEAVE
    // e4 is free (weekly off is on Sunday)
    fixture.availabilities = [
      { employeeId: 'e1', type: 'LEAVE', startDate: '2026-12-02', endDate: '2026-12-02', status: 'APPROVED' },
      { employeeId: 'e3', type: 'LEAVE', startDate: '2026-12-02', endDate: '2026-12-02', status: 'APPROVED' },
      { employeeId: 'e4', type: 'WEEKLY_OFF', dayOfWeek: 0, status: 'APPROVED' }, // Sun off, Dec 2 is Wed
    ];

    const entries: RosterEntryDraft[] = [
      { employeeId: 'e2', brandId: 'b2', processId: 'p1', date: '2026-12-02', status: 'WORKING' },
      { employeeId: 'e1', brandId: null, processId: null, date: '2026-12-02', status: 'LEAVE' },
      { employeeId: 'e3', brandId: null, processId: null, date: '2026-12-02', status: 'LEAVE' },
      { employeeId: 'e4', brandId: null, processId: null, date: '2026-12-02', status: 'WEEKLY_OFF' },
    ];

    const replacements = findReplacements(fixture, entries, {
      date: '2026-12-02',
      brandId: 'b1',
      processId: 'p1',
    });

    const candidateIds = replacements.map((r) => r.employeeId);
    expect(candidateIds).toContain('e4');
    expect(candidateIds).not.toContain('e2'); // already working
    expect(candidateIds).not.toContain('e3'); // on leave
    expect(candidateIds).not.toContain('e1'); // on leave
  });

  // ---------------------------------------------------------------------------
  // STEP 0 REGRESSION TESTS: CONFLICT UNIQUENESS & TUESDAY STAFFING INVARIANTS
  // ---------------------------------------------------------------------------
  it('14. (a) Prevents duplicate conflicts when redundant operating rules exist for the same brand+process', () => {
    const fixture = createBaseFixture();
    fixture.operatingRules = [
      { brandId: 'b1', processId: 'p1', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false },
      // Duplicate rule that previously could cause double resolution
      { brandId: 'b1', processId: 'p1', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false },
    ];
    fixture.coverageRequirements = [
      { brandId: 'b1', processId: 'p1', minimumStaff: 2 },
    ];
    fixture.employees = [
      { id: 'e1', name: 'Worker 1', email: 'w1@test.com', status: 'ACTIVE' },
    ];
    fixture.assignments = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
    ];

    const output = generateRoster(fixture);
    // Filter conflicts for 2026-12-01 (Tuesday)
    const dec1Conflicts = output.conflicts.filter(
      (c) => c.date === '2026-12-01' && c.brandId === 'b1' && c.processId === 'p1'
    );

    expect(dec1Conflicts.length).toBe(1);
    expect(dec1Conflicts[0].type).toBe('INSUFFICIENT_STAFF');
  });

  it('15. (b) Validator Invariant: Ensures at most one conflict exists per (date, brand, process)', () => {
    const fixture = createBaseFixture();
    fixture.operatingRules = [
      { brandId: 'b1', processId: 'p1', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false },
    ];
    fixture.coverageRequirements = [
      { brandId: 'b1', processId: 'p1', minimumStaff: 2 },
    ];
    fixture.employees = [
      { id: 'e1', name: 'Worker 1', email: 'w1@test.com', status: 'ACTIVE' },
    ];
    fixture.assignments = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1' },
    ];
    fixture.availabilities = [
      // Worker 1 is on approved leave on 2026-12-01
      { employeeId: 'e1', type: 'LEAVE', startDate: '2026-12-01', endDate: '2026-12-01', status: 'APPROVED' },
    ];

    // Suppose an entry illegally marked e1 as WORKING on 2026-12-01
    const entries: RosterEntryDraft[] = [
      { employeeId: 'e1', brandId: 'b1', processId: 'p1', date: '2026-12-01', status: 'WORKING' },
    ];

    const validationConflicts = validateRoster(fixture, entries);
    const dec1Conflicts = validationConflicts.filter(
      (c) => c.date === '2026-12-01' && c.brandId === 'b1' && c.processId === 'p1'
    );

    // Must be exactly one conflict (no duplicate LEAVE_CONFLICT + INSUFFICIENT_STAFF on same date+brand+process)
    expect(dec1Conflicts.length).toBe(1);
  });

  it('16. (c) Asserts every Tuesday in a month with a weekly-off employee on a min-2 brand yields INSUFFICIENT_STAFF', () => {
    const fixture = createBaseFixture();
    fixture.brands.push({ id: 'b_indus', name: 'Indus Techworks', status: 'ACTIVE' });
    fixture.processes.push({ id: 'p_ret', name: 'Retention' });

    fixture.operatingRules = [
      { brandId: 'b_indus', processId: 'p_ret', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false },
    ];
    fixture.coverageRequirements = [
      { brandId: 'b_indus', processId: 'p_ret', minimumStaff: 2 },
    ];
    fixture.employees = [
      { id: 'emp_rohan', name: 'Rohan Iyer', email: 'rohan@test.com', status: 'ACTIVE' },
      { id: 'emp_sneha', name: 'Sneha Nair', email: 'sneha@test.com', status: 'ACTIVE' },
    ];
    fixture.assignments = [
      { employeeId: 'emp_rohan', brandId: 'b_indus', processId: 'p_ret' },
      { employeeId: 'emp_sneha', brandId: 'b_indus', processId: 'p_ret' },
    ];
    fixture.availabilities = [
      // Sneha has recurring Tuesday weekly-off (dayOfWeek: 2)
      { employeeId: 'emp_sneha', type: 'WEEKLY_OFF', dayOfWeek: 2, status: 'APPROVED' },
      // Rohan on leave only on Dec 15
      { employeeId: 'emp_rohan', type: 'LEAVE', startDate: '2026-12-15', endDate: '2026-12-15', status: 'APPROVED' },
    ];

    const output = generateRoster(fixture);

    // In December 2026, Tuesdays are: Dec 1, Dec 8, Dec 15, Dec 22, Dec 29
    const tuesdays = ['2026-12-01', '2026-12-08', '2026-12-15', '2026-12-22', '2026-12-29'];

    for (const tue of tuesdays) {
      const tueConflicts = output.conflicts.filter(
        (c) => c.date === tue && c.brandId === 'b_indus' && c.processId === 'p_ret'
      );

      expect(tueConflicts.length).toBe(1);

      if (tue === '2026-12-15') {
        // Both unavailable -> COVERAGE_GAP (0/2)
        expect(tueConflicts[0].type).toBe('COVERAGE_GAP');
        expect(tueConflicts[0].availableStaff).toBe(0);
      } else {
        // Sneha off, Rohan works -> INSUFFICIENT_STAFF (1/2)
        expect(tueConflicts[0].type).toBe('INSUFFICIENT_STAFF');
        expect(tueConflicts[0].availableStaff).toBe(1);
      }
    }
  });
});
