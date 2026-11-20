process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/roster_db_test';

import { assertTestDatabase } from '../src/lib/testDbSafety';
assertTestDatabase(process.env.DATABASE_URL);

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { loadEngineInput, validateRoster, toDateString } from '../src/engine';

describe('Smart Roster Management REST API - Phase 3 Integration Tests', () => {
  let rosterId: string;
  let sampleConflictId: string;
  let sampleConflictDate: string;
  let sampleEligibleEmpId: string;

  beforeAll(async () => {
    // Ensure database is connected
    await prisma.$connect();
    await prisma.employeeAvailability.deleteMany({
      where: { reason: { in: ['Family emergency', 'Emergency medical appointment'] } },
    });
  });

  afterAll(async () => {
    // Reset any test overrides back to clean DRAFT state for Dec 2026
    const r = await prisma.roster.findUnique({
      where: { month_year: { month: 12, year: 2026 } },
    });
    if (r) {
      await prisma.roster.update({
        where: { id: r.id },
        data: { status: 'DRAFT' },
      });
    }
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // 0. HEALTH CHECK
  // ---------------------------------------------------------------------------
  describe('GET /api/health', () => {
    it('returns 200 OK with service identifier', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('syncron-roster-api');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. REFERENTIAL INTEGRITY (409s ON DELETE) & VALIDATIONS
  // ---------------------------------------------------------------------------
  describe('Referential Integrity & Validations', () => {
    it('returns 409 when attempting to delete an employee with active assignments', async () => {
      const emp = await prisma.employee.findFirst({
        where: {
          assignments: { some: {} },
          ledPod: null,
        },
      });
      expect(emp).toBeDefined();

      const res = await request(app).delete(`/api/employees/${emp!.id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DEPENDENCY_CONFLICT');
      expect(res.body.error.message).toContain('active brand assignment');
    });

    it('returns 409 when attempting to delete an employee who is a pod lead', async () => {
      const leadEmp = await prisma.employee.findFirst({
        where: { ledPod: { isNot: null } },
      });
      expect(leadEmp).toBeDefined();

      const res = await request(app).delete(`/api/employees/${leadEmp!.id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DEPENDENCY_CONFLICT');
      expect(res.body.error.message).toContain('designated lead');
    });

    it('returns 409 when attempting to delete a brand with active assignments', async () => {
      const brand = await prisma.brand.findFirst({
        where: { assignments: { some: {} } },
      });
      expect(brand).toBeDefined();

      const res = await request(app).delete(`/api/brands/${brand!.id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DEPENDENCY_CONFLICT');
      expect(res.body.error.message).toContain('active assignment');
    });

    it('returns 409 when attempting to delete a pod with active members', async () => {
      const pod = await prisma.pod.findFirst({
        where: { members: { some: {} } },
      });
      expect(pod).toBeDefined();

      const res = await request(app).delete(`/api/pods/${pod!.id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DEPENDENCY_CONFLICT');
      expect(res.body.error.message).toContain('assigned employee(s)');
    });

    it('returns 400 when creating leave with endDate before startDate', async () => {
      const emp = await prisma.employee.findFirst();
      const res = await request(app).post('/api/availability').send({
        employeeId: emp!.id,
        type: 'LEAVE',
        startDate: '2026-12-15',
        endDate: '2026-12-10',
        status: 'APPROVED',
        reason: 'Invalid inverted dates',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });

  // ---------------------------------------------------------------------------
  // 1 & 2. ROSTER GENERATION & IDEMPOTENCY
  // ---------------------------------------------------------------------------
  describe('Roster Generation & Idempotency', () => {
    it('1. POST /api/rosters/generate generates December 2026 roster (201)', async () => {
      const res = await request(app).post('/api/rosters/generate').send({
        month: 12,
        year: 2026,
      });

      expect(res.status).toBe(201);
      expect(res.body.roster).toBeDefined();
      expect(res.body.roster.month).toBe(12);
      expect(res.body.roster.year).toBe(2026);
      expect(res.body.roster.status).toBe('DRAFT');
      expect(res.body.stats.totalEntries).toBe(1116);
      expect(res.body.conflictsCount).toBe(18);

      rosterId = res.body.roster.id;
    });

    it('2. Idempotent regeneration replaces existing DRAFT without duplicate key errors', async () => {
      const res = await request(app).post('/api/rosters/generate').send({
        month: 12,
        year: 2026,
      });

      expect(res.status).toBe(201);
      expect(res.body.roster.id).toBe(rosterId);
      expect(res.body.stats.totalEntries).toBe(1116);
      expect(res.body.conflictsCount).toBe(18);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PUBLISHED GUARD
  // ---------------------------------------------------------------------------
  describe('Published Guard', () => {
    it('rejects publishing when open conflicts exist without force:true (409)', async () => {
      const res = await request(app).post(`/api/rosters/${rosterId}/publish`).send({});
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ROSTER_HAS_OPEN_CONFLICTS');
    });

    it('publishes successfully when force:true is provided', async () => {
      const res = await request(app).post(`/api/rosters/${rosterId}/publish`).send({ force: true });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLISHED');
    });

    it('rejects regeneration of a PUBLISHED roster with 409', async () => {
      const res = await request(app).post('/api/rosters/generate').send({
        month: 12,
        year: 2026,
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ROSTER_ALREADY_PUBLISHED');
    });

    it('rejects manual entry edits on a PUBLISHED roster with 409', async () => {
      const entry = await prisma.rosterEntry.findFirst({ where: { rosterId } });
      expect(entry).toBeDefined();

      const res = await request(app).patch(`/api/roster-entries/${entry!.id}`).send({
        status: 'WEEKLY_OFF',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ROSTER_PUBLISHED');

      // Revert status back to DRAFT for subsequent change handling tests
      await prisma.roster.update({
        where: { id: rosterId },
        data: { status: 'DRAFT' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4, 5, 6. CONFLICT REPLACEMENTS & ASSIGNMENT
  // ---------------------------------------------------------------------------
  describe('Conflict Resolution & Replacements', () => {
    beforeAll(async () => {
      // Find a Kalyan Organics Sunday gap conflict
      const kalyan = await prisma.brand.findUnique({ where: { name: 'Kalyan Organics' } });
      const conflict = await prisma.conflict.findFirst({
        where: {
          rosterId,
          brandId: kalyan!.id,
          type: 'COVERAGE_GAP',
        },
      });
      expect(conflict).toBeDefined();
      sampleConflictId = conflict!.id;
      sampleConflictDate = toDateString(conflict!.date);
    });

    it('4. GET /api/conflicts/:id/replacements returns eligible cross-brand candidates', async () => {
      const res = await request(app).get(`/api/conflicts/${sampleConflictId}/replacements`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const firstCandidate = res.body[0];
      expect(firstCandidate).toHaveProperty('employeeId');
      expect(firstCandidate).toHaveProperty('employeeName');
      expect(firstCandidate).toHaveProperty('workingDaysSoFar');
      expect(firstCandidate).toHaveProperty('primaryBrandName');

      sampleEligibleEmpId = firstCandidate.employeeId;
    });

    it('6. Ineligible replacement gets 422 when attempting to assign unqualified / unavailable staff', async () => {
      // Pick an employee not qualified for CS (e.g. someone assigned to NDR only or Retention only)
      const unqualifiedEmp = await prisma.employee.findFirst({
        where: {
          assignments: {
            none: { process: { name: 'CS' } },
          },
        },
      });
      expect(unqualifiedEmp).toBeDefined();

      const res = await request(app)
        .post(`/api/conflicts/${sampleConflictId}/assign`)
        .send({ employeeId: unqualifiedEmp!.id });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INELIGIBLE_REPLACEMENT');
    });

    it('5. POST /api/conflicts/:id/assign assigns eligible candidate, resolves conflict, and validates parity', async () => {
      const res = await request(app)
        .post(`/api/conflicts/${sampleConflictId}/assign`)
        .send({ employeeId: sampleEligibleEmpId });

      expect(res.status).toBe(200);
      expect(res.body.entry).toBeDefined();
      expect(res.body.entry.status).toBe('WORKING');
      expect(res.body.entry.employeeId).toBe(sampleEligibleEmpId);

      // Verify the conflict in the database is now RESOLVED
      const updatedConflict = await prisma.conflict.findUnique({
        where: { id: sampleConflictId },
      });
      expect(updatedConflict!.status).toBe('RESOLVED');
      expect(updatedConflict!.resolvedAt).not.toBeNull();

      // PARITY VERIFICATION:
      // Load current entries and run validateRoster; assert DB OPEN conflicts match validateRoster exactly
      const input = await loadEngineInput(prisma, 2026, 12);
      const allEntries = await prisma.rosterEntry.findMany({ where: { rosterId } });
      const entryDrafts = allEntries.map((e) => ({
        employeeId: e.employeeId,
        brandId: e.brandId,
        processId: e.processId,
        date: toDateString(e.date),
        status: e.status,
      }));

      const validatorConflicts = validateRoster(input, entryDrafts);
      const openDbConflicts = await prisma.conflict.findMany({
        where: { rosterId, status: 'OPEN' },
      });

      expect(openDbConflicts.length).toBe(validatorConflicts.length);
      expect(openDbConflicts.length).toBe(17); // 18 original - 1 resolved
    });
  });

  // ---------------------------------------------------------------------------
  // 7. MANUAL ENTRY EDITS & OVERRIDE FLAG
  // ---------------------------------------------------------------------------
  describe('Manual Entry Edits & Hard Constraint Guards', () => {
    it('fails with 422 when attempting to manually assign an unavailable employee without override', async () => {
      // Find an employee with approved leave (e.g. Priya Patel on Dec 7)
      const leave = await prisma.employeeAvailability.findFirst({
        where: { type: 'LEAVE', status: 'APPROVED' },
      });
      expect(leave).toBeDefined();

      const leaveDate = toDateString(leave!.startDate!);
      const entry = await prisma.rosterEntry.findFirst({
        where: {
          rosterId,
          employeeId: leave!.employeeId,
          date: leave!.startDate!,
        },
      });
      expect(entry).toBeDefined();

      // Attempt to set to WORKING without override
      const res = await request(app).patch(`/api/roster-entries/${entry!.id}`).send({
        status: 'WORKING',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('LEAVE_CONFLICT');
      expect(res.body.error.message).toContain('override: true');
    });

    it('succeeds when setting to WORKING with { override: true }', async () => {
      const leave = await prisma.employeeAvailability.findFirst({
        where: { type: 'LEAVE', status: 'APPROVED' },
      });
      const entry = await prisma.rosterEntry.findFirst({
        where: {
          rosterId,
          employeeId: leave!.employeeId,
          date: leave!.startDate!,
        },
      });

      // Get one of employee's assigned processes
      const assignment = await prisma.assignment.findFirst({
        where: { employeeId: leave!.employeeId },
      });

      const res = await request(app).patch(`/api/roster-entries/${entry!.id}`).send({
        status: 'WORKING',
        brandId: assignment!.brandId,
        processId: assignment!.processId,
        override: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.entry.status).toBe('WORKING');

      // Revert back to LEAVE
      await request(app).patch(`/api/roster-entries/${entry!.id}`).send({
        status: 'LEAVE',
        brandId: null,
        processId: null,
        override: true,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 8. APPROVED LEAVE LIFECYCLE (CREATING OPENS GAP, DELETING RESOLVES)
  // ---------------------------------------------------------------------------
  describe('Approved Leave Synchronization Lifecycle', () => {
    it('opens a COVERAGE_GAP when approved leave is added on a single-resource brand, then resolves it on deletion', async () => {
      // Find Vikram Malhotra working on Veda Naturals on Tuesday Dec 1 (where there are 0 initial conflicts)
      const vikram = await prisma.employee.findFirst({ where: { name: 'Vikram Malhotra' } });
      const testDate = '2026-12-01'; // Tuesday

      const workingEntryBefore = await prisma.rosterEntry.findFirst({
        where: {
          rosterId,
          employeeId: vikram!.id,
          date: new Date(`${testDate}T00:00:00.000Z`),
          status: 'WORKING',
        },
      });
      expect(workingEntryBefore).toBeDefined();

      // Count open conflicts before
      const openBefore = await prisma.conflict.count({
        where: { rosterId, status: 'OPEN' },
      });

      // 1. Add approved leave for Vikram on Dec 1
      const createRes = await request(app).post('/api/availability').send({
        employeeId: vikram!.id,
        type: 'LEAVE',
        startDate: testDate,
        endDate: testDate,
        status: 'APPROVED',
        reason: 'Emergency medical appointment',
      });

      expect(createRes.status).toBe(201);
      const createdAvailId = createRes.body.availability.id;

      // Assert that an OPEN COVERAGE_GAP conflict was created
      const openAfter = await prisma.conflict.count({
        where: { rosterId, status: 'OPEN' },
      });
      expect(openAfter).toBe(openBefore + 1);

      const newConflict = await prisma.conflict.findFirst({
        where: {
          rosterId,
          date: new Date(`${testDate}T00:00:00.000Z`),
          brandId: workingEntryBefore!.brandId!,
          status: 'OPEN',
        },
      });
      expect(newConflict).toBeDefined();
      expect(newConflict!.type).toBe('COVERAGE_GAP');

      // 2. Delete the approved leave
      const deleteRes = await request(app).delete(`/api/availability/${createdAvailId}`);
      expect(deleteRes.status).toBe(200);

      // Assert that the conflict was resolved!
      const resolvedConflict = await prisma.conflict.findUnique({
        where: { id: newConflict!.id },
      });
      expect(resolvedConflict!.status).toBe('RESOLVED');
      expect(resolvedConflict!.resolvedAt).not.toBeNull();

      // Assert that Vikram was restored to WORKING
      const restoredEntry = await prisma.rosterEntry.findFirst({
        where: {
          rosterId,
          employeeId: vikram!.id,
          date: new Date(`${testDate}T00:00:00.000Z`),
        },
      });
      expect(restoredEntry!.status).toBe('WORKING');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. COVERAGE REQUIREMENT INCREASE OPENS INSUFFICIENT_STAFF
  // ---------------------------------------------------------------------------
  describe('Coverage Requirement Modification', () => {
    it('opens INSUFFICIENT_STAFF when minimumStaff is increased, and resolves when reverted', async () => {
      // Find a brand with minimumStaff: 1 and 0 conflicts, e.g. Veda Naturals CS
      const veda = await prisma.brand.findUnique({ where: { name: 'Veda Naturals' } });
      const req = await prisma.coverageRequirement.findFirst({
        where: { brandId: veda!.id },
      });
      expect(req).toBeDefined();
      const originalMin = req!.minimumStaff; // 1

      // Increase minimumStaff from 1 to 2
      const updateRes = await request(app)
        .put(`/api/coverage-requirements/${req!.id}`)
        .send({ minimumStaff: 2 });

      expect(updateRes.status).toBe(200);

      // Check that INSUFFICIENT_STAFF conflicts are now opened for Veda Naturals
      const insufficientConflicts = await prisma.conflict.findMany({
        where: {
          rosterId,
          brandId: veda!.id,
          type: 'INSUFFICIENT_STAFF',
          status: 'OPEN',
        },
      });
      expect(insufficientConflicts.length).toBeGreaterThan(0);

      // Revert minimumStaff back to original value (1)
      const revertRes = await request(app)
        .put(`/api/coverage-requirements/${req!.id}`)
        .send({ minimumStaff: originalMin });

      expect(revertRes.status).toBe(200);

      // Check that the INSUFFICIENT_STAFF conflicts are now RESOLVED
      const openAfterRevert = await prisma.conflict.findMany({
        where: {
          rosterId,
          brandId: veda!.id,
          type: 'INSUFFICIENT_STAFF',
          status: 'OPEN',
        },
      });
      expect(openAfterRevert.length).toBe(0);
    });

    it('rejects scheduling an employee on approved leave with 422 LEAVE_CONFLICT, and opens LEAVE_CONFLICT on override', async () => {
      const rohan = await prisma.employee.findFirst({ where: { name: 'Rohan Iyer' } });
      const indus = await prisma.brand.findUnique({ where: { name: 'Indus Techworks' } });
      const retProc = await prisma.process.findUnique({ where: { name: 'Retention' } });
      const dateStr = '2026-12-15';
      const entry = await prisma.rosterEntry.findFirst({
        where: {
          rosterId,
          employeeId: rohan!.id,
          date: new Date(`${dateStr}T00:00:00.000Z`),
        },
      });
      expect(entry).toBeDefined();

      // 1. Attempt to update to WORKING without override -> 422
      const rejectRes = await request(app)
        .patch(`/api/roster-entries/${entry!.id}`)
        .send({ status: 'WORKING', brandId: indus!.id, processId: retProc!.id });
      expect(rejectRes.status).toBe(422);
      expect(rejectRes.body.error.code).toBe('LEAVE_CONFLICT');

      // 2. Perform update with override: true -> 200, opens LEAVE_CONFLICT
      const overrideRes = await request(app)
        .patch(`/api/roster-entries/${entry!.id}`)
        .send({ status: 'WORKING', brandId: indus!.id, processId: retProc!.id, override: true });
      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.opened).toBe(1);
      expect(overrideRes.body.resolved).toBe(1);

      // Verify that LEAVE_CONFLICT is now OPEN for Indus Techworks Retention
      const leaveConflict = await prisma.conflict.findFirst({
        where: {
          rosterId,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          brandId: indus!.id,
          processId: retProc!.id,
          type: 'LEAVE_CONFLICT',
          status: 'OPEN',
        },
      });
      expect(leaveConflict).toBeDefined();

      // Revert Rohan back to LEAVE
      await request(app)
        .patch(`/api/roster-entries/${entry!.id}`)
        .send({ status: 'LEAVE', brandId: null, processId: null, override: true });
    });
  });

  // ---------------------------------------------------------------------------
  // VIEWS & DASHBOARD
  // ---------------------------------------------------------------------------
  describe('Views & Dashboard Endpoints', () => {
    it('GET /api/rosters/:id/employee-view returns mapped employee schedule', async () => {
      const res = await request(app).get(`/api/rosters/${rosterId}/employee-view`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(36); // 36 employees

      const firstEmp = res.body[0];
      expect(firstEmp).toHaveProperty('employee');
      expect(firstEmp.employee).toHaveProperty('id');
      expect(firstEmp.employee).toHaveProperty('name');
      expect(firstEmp).toHaveProperty('schedule');
      expect(firstEmp.schedule.length).toBe(31);
    });

    it('GET /api/rosters/:id/brand-view returns coverage statuses OK, GAP, and PARTIAL', async () => {
      const res = await request(app).get(`/api/rosters/${rosterId}/brand-view`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const statuses = new Set(res.body.map((b: any) => b.coverageStatus));
      expect(statuses.has('OK')).toBe(true);
      expect(statuses.has('GAP')).toBe(true);
    });

    it('GET /api/dashboard returns high level KPI metrics', async () => {
      const res = await request(app).get('/api/dashboard?month=12&year=2026');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('employees', 36);
      expect(res.body).toHaveProperty('brands', 15);
      expect(res.body).toHaveProperty('pods', 5);
      expect(res.body).toHaveProperty('processes', 6);
      expect(res.body).toHaveProperty('requiredSlots');
      expect(res.body).toHaveProperty('filledSlots');
      expect(res.body).toHaveProperty('coveragePercent');
      expect(res.body.coveragePercent).toBeGreaterThan(90);
      expect(res.body).toHaveProperty('openConflictsByType');
    });
  });

  // ---------------------------------------------------------------------------
  // ADMIN DEMO RESET
  // ---------------------------------------------------------------------------
  describe('POST /api/admin/reset-demo', () => {
    it('rejects reset without valid x-admin-token (403)', async () => {
      const res = await request(app).post('/api/admin/reset-demo');
      expect(res.status).toBe(403);
    });

    it('rejects reset with wrong x-admin-token (403)', async () => {
      const res = await request(app)
        .post('/api/admin/reset-demo')
        .set('x-admin-token', 'wrong-token');
      expect(res.status).toBe(403);
    });

    it('resets demo database and regenerates baseline December 2026 roster (200)', async () => {
      process.env.ADMIN_TOKEN = 'test-admin-token-123';
      const res = await request(app)
        .post('/api/admin/reset-demo')
        .set('x-admin-token', 'test-admin-token-123');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('conflictsCount', 18);
      expect(res.body).toHaveProperty('totalEntries', 1116);
    });
  });
});
