/**
 * Roster and Scheduling Business Logic Service.
 */

import { Prisma, PrismaClient, Roster } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  findReplacements,
  generateRoster,
  getUnavailability,
  loadEngineInput,
  monthDates,
  parseUTCDate,
  persistRoster,
  resolveDailyRequirements,
  toDateString,
} from '../engine';
import { syncConflicts } from './syncService';

type PrismaTx = Prisma.TransactionClient | PrismaClient;

export class RosterService {
  /**
   * Generates a monthly roster via the pure engine and persists it as a DRAFT.
   * Throws 409 if the roster already exists in PUBLISHED status.
   */
  static async generate(month: number, year: number) {
    const existing = await prisma.roster.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing && existing.status === 'PUBLISHED') {
      throw new AppError(
        409,
        'ROSTER_ALREADY_PUBLISHED',
        `Cannot regenerate roster for ${month}/${year}. It is already PUBLISHED.`
      );
    }

    const input = await loadEngineInput(prisma, year, month);
    const output = generateRoster(input);
    const persisted = await persistRoster(prisma, input, output);

    return {
      roster: persisted,
      stats: output.stats,
      conflictsCount: output.conflicts.length,
    };
  }

  /**
   * Lists rosters with summary counts.
   */
  static async listRosters(filter?: { month?: number; year?: number }) {
    const where: Prisma.RosterWhereInput = {};
    if (filter?.month) where.month = filter.month;
    if (filter?.year) where.year = filter.year;

    return await prisma.roster.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: {
          select: {
            entries: true,
            conflicts: true,
          },
        },
      },
    });
  }

  /**
   * Gets a specific roster with its statistics.
   */
  static async getRosterById(id: string) {
    const roster = await prisma.roster.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            entries: true,
            conflicts: true,
          },
        },
      },
    });

    if (!roster) {
      throw new AppError(404, 'NOT_FOUND', `Roster with ID ${id} not found.`);
    }

    // Compute conflict breakdown
    const openConflicts = await prisma.conflict.groupBy({
      by: ['type'],
      where: { rosterId: id, status: 'OPEN' },
      _count: { id: true },
    });

    const resolvedConflictsCount = await prisma.conflict.count({
      where: { rosterId: id, status: 'RESOLVED' },
    });

    return {
      ...roster,
      openConflicts: openConflicts.map((c) => ({ type: c.type, count: c._count.id })),
      resolvedConflictsCount,
    };
  }

  /**
   * Query roster entries with optional filtering.
   */
  static async getEntries(
    rosterId: string,
    filter: {
      employeeId?: string;
      brandId?: string;
      from?: string;
      to?: string;
      status?: any;
    }
  ) {
    const where: Prisma.RosterEntryWhereInput = { rosterId };

    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.brandId) where.brandId = filter.brandId;
    if (filter.status) where.status = filter.status;

    if (filter.from || filter.to) {
      where.date = {};
      if (filter.from) where.date.gte = parseUTCDate(filter.from);
      if (filter.to) where.date.lte = parseUTCDate(filter.to);
    }

    return await prisma.rosterEntry.findMany({
      where,
      orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
      include: {
        employee: { select: { id: true, name: true, email: true } },
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Gets employee-centric view of the roster.
   */
  static async getEmployeeView(rosterId: string) {
    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { pod: true },
      orderBy: { name: 'asc' },
    });

    const entries = await prisma.rosterEntry.findMany({
      where: { rosterId },
      include: {
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const entriesByEmployee = new Map<string, any[]>();
    for (const e of entries) {
      if (!entriesByEmployee.has(e.employeeId)) {
        entriesByEmployee.set(e.employeeId, []);
      }
      entriesByEmployee.get(e.employeeId)!.push({
        id: e.id,
        date: toDateString(e.date),
        status: e.status,
        brand: e.brand,
        process: e.process,
      });
    }

    return employees.map((emp) => ({
      employee: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        pod: emp.pod.name,
      },
      schedule: entriesByEmployee.get(emp.id) || [],
    }));
  }

  /**
   * Gets brand-centric operational view of the roster:
   * Per brand, process, date: required, allocated, employees, status (OK / GAP / PARTIAL).
   */
  static async getBrandView(rosterId: string) {
    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');

    const input = await loadEngineInput(prisma, roster.year, roster.month);
    const dates = monthDates(roster.year, roster.month);

    const workingEntries = await prisma.rosterEntry.findMany({
      where: { rosterId, status: 'WORKING' },
      include: {
        employee: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });

    // Pre-calculate single-resource brands
    const brandDistinctEmployees = new Map<string, Set<string>>();
    for (const a of input.assignments) {
      if (!brandDistinctEmployees.has(a.brandId)) {
        brandDistinctEmployees.set(a.brandId, new Set());
      }
      brandDistinctEmployees.get(a.brandId)!.add(a.employeeId);
    }
    const isSingleResourceBrand = (brandId: string) => {
      const emps = brandDistinctEmployees.get(brandId);
      return emps !== undefined && emps.size === 1;
    };

    // Group working entries by "date_brandId_processId" and "date_brandId"
    const allocatedMap = new Map<string, Array<{ id: string; name: string }>>();
    const brandDayAllocatedMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const w of workingEntries) {
      if (!w.brandId) continue;
      const brandKey = `${toDateString(w.date)}_${w.brandId}`;
      if (!brandDayAllocatedMap.has(brandKey)) {
        brandDayAllocatedMap.set(brandKey, []);
      }
      brandDayAllocatedMap.get(brandKey)!.push({ id: w.employee.id, name: w.employee.name });

      if (w.processId) {
        const key = `${toDateString(w.date)}_${w.brandId}_${w.processId}`;
        if (!allocatedMap.has(key)) {
          allocatedMap.set(key, []);
        }
        allocatedMap.get(key)!.push({ id: w.employee.id, name: w.employee.name });
      }
    }

    const brandViewResults = [];
    for (const dateStr of dates) {
      const dailyReqs = resolveDailyRequirements(dateStr, input);
      for (const req of dailyReqs) {
        const key = `${dateStr}_${req.brandId}_${req.processId}`;
        let allocatedEmployees = allocatedMap.get(key) || [];
        if (allocatedEmployees.length === 0 && isSingleResourceBrand(req.brandId)) {
          const brandEmps = brandDayAllocatedMap.get(`${dateStr}_${req.brandId}`) || [];
          if (brandEmps.length > 0) {
            allocatedEmployees = brandEmps;
          }
        }
        const allocated = allocatedEmployees.length;

        let coverageStatus: 'OK' | 'GAP' | 'PARTIAL' = 'OK';
        if (allocated === 0) {
          coverageStatus = 'GAP';
        } else if (allocated < req.minimumStaff) {
          coverageStatus = 'PARTIAL';
        }

        brandViewResults.push({
          date: dateStr,
          brandId: req.brandId,
          brandName: req.brandName,
          processId: req.processId,
          processName: req.processName,
          required: req.minimumStaff,
          allocated,
          coverageStatus,
          employees: allocatedEmployees,
        });
      }
    }

    return brandViewResults;
  }

  /**
   * Gets process-centric operational view of the roster:
   * Process -> Daily totals (required, allocated, status) -> Brand drilldown.
   */
  static async getProcessView(rosterId: string) {
    const brandViewData = await this.getBrandView(rosterId);
    const processes = await prisma.process.findMany({ orderBy: { name: 'asc' } });

    // Group brand view results by processId -> date
    const processMap = new Map<string, Map<string, any[]>>();
    for (const b of brandViewData) {
      if (!processMap.has(b.processId)) {
        processMap.set(b.processId, new Map());
      }
      const dateMap = processMap.get(b.processId)!;
      if (!dateMap.has(b.date)) {
        dateMap.set(b.date, []);
      }
      dateMap.get(b.date)!.push(b);
    }

    return processes.map((proc) => {
      const dateMap = processMap.get(proc.id) || new Map();
      const dailyBreakdown: any[] = [];

      for (const [date, brands] of dateMap.entries()) {
        const required = brands.reduce((sum: number, b: any) => sum + b.required, 0);
        const allocated = brands.reduce((sum: number, b: any) => sum + b.allocated, 0);
        let status: 'OK' | 'GAP' | 'PARTIAL' = 'OK';
        if (allocated === 0 && required > 0) status = 'GAP';
        else if (allocated < required) status = 'PARTIAL';

        dailyBreakdown.push({
          date,
          required,
          allocated,
          status,
          brands,
        });
      }

      dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

      return {
        processId: proc.id,
        processName: proc.name,
        days: dailyBreakdown,
      };
    });
  }

  /**
   * Gets pod-centric operational view of the roster:
   * Pod -> Lead -> Members with shift count & coverage summary.
   */
  static async getPodView(rosterId: string) {
    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');

    const pods = await prisma.pod.findMany({
      include: {
        lead: { select: { id: true, name: true, email: true } },
        members: {
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const workingEntries = await prisma.rosterEntry.findMany({
      where: { rosterId, status: 'WORKING' },
      select: { employeeId: true },
    });

    const shiftCountMap = new Map<string, number>();
    for (const w of workingEntries) {
      shiftCountMap.set(w.employeeId, (shiftCountMap.get(w.employeeId) || 0) + 1);
    }

    return pods.map((pod) => {
      const memberDetails = pod.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        isLead: pod.lead?.id === m.id,
        workingDaysCount: shiftCountMap.get(m.id) || 0,
      }));

      const totalShifts = memberDetails.reduce((sum, m) => sum + m.workingDaysCount, 0);

      return {
        podId: pod.id,
        podName: pod.name,
        lead: pod.lead,
        members: memberDetails,
        totalMembers: memberDetails.length,
        totalShifts,
      };
    });
  }

  /**
   * Lists conflicts with optional filters.
   */
  static async getConflicts(
    rosterId: string,
    filter: { status?: 'OPEN' | 'RESOLVED'; type?: any; brandId?: string; severity?: any }
  ) {
    const where: Prisma.ConflictWhereInput = { rosterId };
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.brandId) where.brandId = filter.brandId;
    if (filter.severity) where.severity = filter.severity;

    return await prisma.conflict.findMany({
      where,
      orderBy: [{ date: 'asc' }, { brandId: 'asc' }],
      include: {
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Publishes a roster. Rejects with 409 if open ERROR conflicts exist unless force === true.
   * Warnings never block publishing.
   */
  static async publish(rosterId: string, force = false) {
    const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
    if (!roster) throw new AppError(404, 'NOT_FOUND', 'Roster not found.');

    const openErrorCount = await prisma.conflict.count({
      where: { rosterId, status: 'OPEN', severity: 'ERROR' },
    });

    if (openErrorCount > 0 && !force) {
      throw new AppError(
        409,
        'ROSTER_HAS_OPEN_CONFLICTS',
        `Cannot publish roster with ${openErrorCount} open error conflict(s). Set { force: true } to publish anyway.`
      );
    }

    return await prisma.roster.update({
      where: { id: rosterId },
      data: { status: 'PUBLISHED' },
    });
  }

  /**
   * Finds replacement candidates for a conflict.
   */
  static async getReplacementsForConflict(conflictId: string) {
    const conflict = await prisma.conflict.findUnique({
      where: { id: conflictId },
      include: { roster: true },
    });
    if (!conflict) throw new AppError(404, 'NOT_FOUND', 'Conflict not found.');

    const input = await loadEngineInput(prisma, conflict.roster.year, conflict.roster.month);
    const entries = await prisma.rosterEntry.findMany({
      where: { rosterId: conflict.rosterId },
    });

    const drafts = entries.map((e) => ({
      employeeId: e.employeeId,
      brandId: e.brandId,
      processId: e.processId,
      date: toDateString(e.date),
      status: e.status,
    }));

    return findReplacements(input, drafts, {
      date: toDateString(conflict.date),
      brandId: conflict.brandId,
      processId: conflict.processId,
    });
  }

  /**
   * Assigns an eligible replacement employee to resolve a conflict.
   */
  static async assignReplacement(conflictId: string, employeeId: string) {
    const conflict = await prisma.conflict.findUnique({
      where: { id: conflictId },
      include: { roster: true },
    });
    if (!conflict) throw new AppError(404, 'NOT_FOUND', 'Conflict not found.');

    if (conflict.roster.status === 'PUBLISHED') {
      throw new AppError(409, 'ROSTER_PUBLISHED', 'Cannot modify entries on a PUBLISHED roster.');
    }

    // Verify eligibility
    const replacements = await this.getReplacementsForConflict(conflictId);
    const isEligible = replacements.some((r) => r.employeeId === employeeId);

    if (!isEligible) {
      throw new AppError(
        422,
        'INELIGIBLE_REPLACEMENT',
        `Employee ${employeeId} is not an eligible replacement (may be unavailable, not qualified, or already working).`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Upsert entry for this employee on this date
      const date = conflict.date;
      const entry = await tx.rosterEntry.upsert({
        where: {
          rosterId_employeeId_date: {
            rosterId: conflict.rosterId,
            employeeId,
            date,
          },
        },
        create: {
          rosterId: conflict.rosterId,
          employeeId,
          date,
          status: 'WORKING',
          brandId: conflict.brandId,
          processId: conflict.processId,
        },
        update: {
          status: 'WORKING',
          brandId: conflict.brandId,
          processId: conflict.processId,
        },
      });

      const syncResult = await syncConflicts(tx, conflict.rosterId);
      return { entry, ...syncResult };
    });
  }

  /**
   * Manually updates a roster entry with hard constraint checks.
   */
  static async updateEntry(
    entryId: string,
    data: {
      status?: any;
      employeeId?: string;
      brandId?: string | null;
      processId?: string | null;
      override?: boolean;
    }
  ) {
    const entry = await prisma.rosterEntry.findUnique({
      where: { id: entryId },
      include: { roster: true },
    });
    if (!entry) throw new AppError(404, 'NOT_FOUND', 'Roster entry not found.');

    if (entry.roster.status === 'PUBLISHED') {
      throw new AppError(409, 'ROSTER_PUBLISHED', 'Cannot edit entries on a PUBLISHED roster.');
    }

    const targetEmpId = data.employeeId || entry.employeeId;
    const targetStatus = data.status || entry.status;
    let targetBrandId = data.brandId !== undefined ? data.brandId : entry.brandId;
    let targetProcessId = data.processId !== undefined ? data.processId : entry.processId;

    if (targetStatus === 'WORKING' && (!targetBrandId || !targetProcessId)) {
      const firstAssignment = await prisma.assignment.findFirst({
        where: { employeeId: targetEmpId },
      });
      if (firstAssignment) {
        if (!targetBrandId) targetBrandId = firstAssignment.brandId;
        if (!targetProcessId) targetProcessId = firstAssignment.processId;
      }
    }

    const dateStr = toDateString(entry.date);

    // Hard constraint validation if attempting to set status to WORKING without override
    if (targetStatus === 'WORKING' && !data.override) {
      const emp = await prisma.employee.findUnique({ where: { id: targetEmpId } });
      if (!emp) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');

      // 1. Process qualification check
      if (targetProcessId) {
        const hasAssignment = await prisma.assignment.findFirst({
          where: { employeeId: targetEmpId, processId: targetProcessId },
        });
        if (!hasAssignment) {
          throw new AppError(
            422,
            'NOT_QUALIFIED',
            `Employee ${emp.name} is not assigned to process ${targetProcessId}. Use { override: true } to force.`,
            { violation: 'PROCESS_UNASSIGNED' }
          );
        }
      }

      // 2. Approved Leave / Comp-off check
      const input = await loadEngineInput(prisma, entry.roster.year, entry.roster.month);
      const unavail = getUnavailability(emp as any, dateStr, input.availabilities);
      if (unavail && (unavail.type === 'LEAVE' || unavail.type === 'COMP_OFF')) {
        throw new AppError(
          422,
          'LEAVE_CONFLICT',
          `Employee ${emp.name} is on approved ${unavail.type} (${unavail.reason}). Use { override: true } to force.`,
          { violation: 'ON_APPROVED_LEAVE', details: unavail }
        );
      }

      // 3. Duplicate working shift check on the same date
      const alreadyWorking = await prisma.rosterEntry.findFirst({
        where: {
          rosterId: entry.rosterId,
          employeeId: targetEmpId,
          date: entry.date,
          status: 'WORKING',
          id: { not: entry.id },
        },
      });
      if (alreadyWorking) {
        throw new AppError(
          422,
          'OVERLAP_CONFLICT',
          `Employee ${emp.name} is already working another shift on ${dateStr}. Use { override: true } to force.`,
          { violation: 'ALREADY_WORKING_ELSEWHERE' }
        );
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.rosterEntry.update({
        where: { id: entryId },
        data: {
          status: targetStatus,
          employeeId: targetEmpId,
          brandId: targetBrandId,
          processId: targetProcessId,
        },
      });

      const syncResult = await syncConflicts(tx, entry.rosterId);
      return { entry: updated, ...syncResult };
    });
  }

  /**
   * Unassigns an entry by converting it to WEEKLY_OFF and synchronizing conflicts.
   */
  static async unassignEntry(entryId: string) {
    const entry = await prisma.rosterEntry.findUnique({
      where: { id: entryId },
      include: { roster: true },
    });
    if (!entry) throw new AppError(404, 'NOT_FOUND', 'Roster entry not found.');

    if (entry.roster.status === 'PUBLISHED') {
      throw new AppError(409, 'ROSTER_PUBLISHED', 'Cannot edit entries on a PUBLISHED roster.');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.rosterEntry.update({
        where: { id: entryId },
        data: {
          status: 'WEEKLY_OFF',
          brandId: null,
          processId: null,
        },
      });

      const syncResult = await syncConflicts(tx, entry.rosterId);
      return { entry: updated, ...syncResult };
    });
  }

  /**
   * Synchronizes all open draft rosters affected by an availability or requirement change.
   */
  static async syncAffectedDraftRosters(tx: PrismaTx, month: number, year: number) {
    const draftRosters = await tx.roster.findMany({
      where: { month, year, status: 'DRAFT' },
    });

    const results = [];
    for (const r of draftRosters) {
      const syncRes = await syncConflicts(tx, r.id);
      results.push({ rosterId: r.id, ...syncRes });
    }
    return results;
  }

  /**
   * Returns dashboard metrics.
   */
  static async getDashboard(month: number, year: number) {
    const [employeeCount, brandCount, podCount, processCount] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.brand.count({ where: { status: 'ACTIVE' } }),
      prisma.pod.count(),
      prisma.process.count(),
    ]);

    const roster = await prisma.roster.findUnique({
      where: { month_year: { month, year } },
    });

    if (!roster) {
      return {
        employees: employeeCount,
        brands: brandCount,
        pods: podCount,
        processes: processCount,
        roster: null,
        requiredSlots: 0,
        filledSlots: 0,
        coveragePercent: 0,
        openConflictsByType: {},
        resolvedConflicts: 0,
      };
    }

    const input = await loadEngineInput(prisma, year, month);
    const dates = monthDates(year, month);

    const brandViewData = await this.getBrandView(roster.id);
    let requiredSlots = 0;
    let filledSlots = 0;
    for (const b of brandViewData) {
      requiredSlots += b.required;
      filledSlots += Math.min(b.allocated, b.required);
    }

    const openConflicts = await prisma.conflict.groupBy({
      by: ['type'],
      where: { rosterId: roster.id, status: 'OPEN' },
      _count: { id: true },
    });

    const openConflictsByType: Record<string, number> = {};
    for (const oc of openConflicts) {
      openConflictsByType[oc.type] = oc._count.id;
    }

    const resolvedConflicts = await prisma.conflict.count({
      where: { rosterId: roster.id, status: 'RESOLVED' },
    });

    const coveragePercent =
      requiredSlots > 0 ? parseFloat(((filledSlots / requiredSlots) * 100).toFixed(1)) : 100;

    return {
      employees: employeeCount,
      brands: brandCount,
      pods: podCount,
      processes: processCount,
      roster: {
        id: roster.id,
        status: roster.status,
        month: roster.month,
        year: roster.year,
      },
      requiredSlots,
      filledSlots,
      coveragePercent,
      openConflictsByType,
      resolvedConflicts,
    };
  }
}
