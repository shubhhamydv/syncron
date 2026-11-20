/**
 * CRUD Services for Foundation Entities.
 *
 * Implements referential checks (throwing 409), validation rules,
 * and roster synchronization hooks when availability or rules are modified.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { parseUTCDate, toDateString } from '../engine';
import { RosterService } from './rosterService';
import { computeChangeImpact } from './impactService';

export class CrudService {
  // ---------------------------------------------------------------------------
  // EMPLOYEES
  // ---------------------------------------------------------------------------
  static async listEmployees(query: {
    podId?: string;
    brandId?: string;
    status?: any;
    search?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {};

    if (query.podId) where.podId = query.podId;
    if (query.status) where.status = query.status;
    if (query.brandId) {
      where.assignments = { some: { brandId: query.brandId } };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        pod: { select: { id: true, name: true } },
        assignments: {
          include: {
            brand: { select: { id: true, name: true } },
            process: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  static async getEmployeeById(id: string) {
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        pod: true,
        assignments: { include: { brand: true, process: true } },
        availabilities: true,
      },
    });
    if (!emp) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');
    return emp;
  }

  static async createEmployee(data: {
    name: string;
    email: string;
    podId: string;
    status?: any;
  }) {
    const pod = await prisma.pod.findUnique({ where: { id: data.podId } });
    if (!pod) throw new AppError(404, 'NOT_FOUND', `Pod with ID ${data.podId} not found.`);

    const existing = await prisma.employee.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, 'DUPLICATE_EMAIL', `Email ${data.email} is already in use.`);

    return await prisma.employee.create({ data });
  }

  static async updateEmployee(id: string, data: { name?: string; email?: string; podId?: string; status?: any }) {
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');

    if (data.podId) {
      const pod = await prisma.pod.findUnique({ where: { id: data.podId } });
      if (!pod) throw new AppError(404, 'NOT_FOUND', 'Target Pod not found.');
    }

    if (data.email && data.email !== emp.email) {
      const existing = await prisma.employee.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError(409, 'DUPLICATE_EMAIL', 'Email is already in use.');
    }

    return await prisma.employee.update({ where: { id }, data });
  }

  static async deleteEmployee(id: string) {
    const emp = await prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');

    // Check if employee leads a pod
    const ledPod = await prisma.pod.findFirst({ where: { leadEmployeeId: id } });
    if (ledPod) {
      throw new AppError(
        409,
        'DEPENDENCY_CONFLICT',
        `Cannot delete employee ${emp.name} because they are the designated lead of ${ledPod.name}. Reassign pod lead first.`
      );
    }

    // Check if assigned to any brand/process
    const assignmentsCount = await prisma.assignment.count({ where: { employeeId: id } });
    if (assignmentsCount > 0) {
      throw new AppError(
        409,
        'DEPENDENCY_CONFLICT',
        `Cannot delete employee ${emp.name} with ${assignmentsCount} active brand assignment(s). Remove assignments first.`
      );
    }

    return await prisma.employee.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // PODS
  // ---------------------------------------------------------------------------
  static async listPods() {
    return await prisma.pod.findMany({
      include: {
        lead: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getPodById(id: string) {
    const pod = await prisma.pod.findUnique({
      where: { id },
      include: {
        lead: true,
        members: { select: { id: true, name: true, email: true, status: true } },
      },
    });
    if (!pod) throw new AppError(404, 'NOT_FOUND', 'Pod not found.');
    return pod;
  }

  static async createPod(data: { name: string; leadEmployeeId?: string | null }) {
    if (data.leadEmployeeId) {
      const lead = await prisma.employee.findUnique({ where: { id: data.leadEmployeeId } });
      if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead employee not found.');
    }
    return await prisma.pod.create({ data });
  }

  static async updatePod(id: string, data: { name?: string; leadEmployeeId?: string | null }) {
    const pod = await prisma.pod.findUnique({ where: { id } });
    if (!pod) throw new AppError(404, 'NOT_FOUND', 'Pod not found.');

    if (data.leadEmployeeId) {
      // Must belong to this pod!
      const lead = await prisma.employee.findUnique({ where: { id: data.leadEmployeeId } });
      if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead employee not found.');
      if (lead.podId !== id) {
        throw new AppError(
          409,
          'INVALID_LEAD',
          `Employee ${lead.name} belongs to a different pod. The designated pod lead must belong to this pod.`
        );
      }
    }

    return await prisma.pod.update({ where: { id }, data });
  }

  static async deletePod(id: string) {
    const count = await prisma.employee.count({ where: { podId: id } });
    if (count > 0) {
      throw new AppError(
        409,
        'DEPENDENCY_CONFLICT',
        `Cannot delete pod with ${count} assigned employee(s). Reassign employees first.`
      );
    }
    return await prisma.pod.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // BRANDS & PROCESSES
  // ---------------------------------------------------------------------------
  static async listBrands() {
    return await prisma.brand.findMany({
      include: {
        _count: { select: { assignments: true, operatingRules: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getBrandById(id: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        assignments: { include: { employee: true, process: true } },
        operatingRules: { include: { process: true } },
        coverageRequirements: { include: { process: true } },
      },
    });
    if (!brand) throw new AppError(404, 'NOT_FOUND', 'Brand not found.');
    return brand;
  }

  static async createBrand(data: { name: string; status?: any }) {
    const existing = await prisma.brand.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(409, 'DUPLICATE_BRAND', `Brand ${data.name} already exists.`);
    return await prisma.brand.create({ data });
  }

  static async updateBrand(id: string, data: { name?: string; status?: any }) {
    return await prisma.brand.update({ where: { id }, data });
  }

  static async deleteBrand(id: string) {
    const assignmentsCount = await prisma.assignment.count({ where: { brandId: id } });
    if (assignmentsCount > 0) {
      throw new AppError(
        409,
        'DEPENDENCY_CONFLICT',
        `Cannot delete brand with ${assignmentsCount} active assignment(s). Remove assignments first.`
      );
    }
    return await prisma.brand.delete({ where: { id } });
  }

  static async listProcesses() {
    return await prisma.process.findMany({ orderBy: { name: 'asc' } });
  }

  static async createProcess(data: { name: string }) {
    const existing = await prisma.process.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError(409, 'DUPLICATE_PROCESS', `Process ${data.name} already exists.`);
    return await prisma.process.create({ data });
  }

  static async deleteProcess(id: string) {
    const assignmentsCount = await prisma.assignment.count({ where: { processId: id } });
    if (assignmentsCount > 0) {
      throw new AppError(
        409,
        'DEPENDENCY_CONFLICT',
        `Cannot delete process with ${assignmentsCount} active assignment(s). Remove assignments first.`
      );
    }
    return await prisma.process.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // ASSIGNMENTS
  // ---------------------------------------------------------------------------
  static async listAssignments(filter?: { employeeId?: string; brandId?: string; processId?: string }) {
    return await prisma.assignment.findMany({
      where: filter,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });
  }

  static async createAssignment(data: { employeeId: string; brandId: string; processId: string }) {
    // Unique on the triple
    const existing = await prisma.assignment.findUnique({
      where: {
        employeeId_brandId_processId: {
          employeeId: data.employeeId,
          brandId: data.brandId,
          processId: data.processId,
        },
      },
    });
    if (existing) {
      throw new AppError(
        409,
        'DUPLICATE_ASSIGNMENT',
        'Assignment for this employee, brand, and process already exists.'
      );
    }
    return await prisma.$transaction(async (tx) => {
      const created = await tx.assignment.create({ data });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { assignment: created, syncResults };
    });
  }

  static async deleteAssignment(id: string) {
    return await prisma.$transaction(async (tx) => {
      const deleted = await tx.assignment.delete({ where: { id } });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { assignment: deleted, syncResults };
    });
  }

  // ---------------------------------------------------------------------------
  // OPERATING RULES & COVERAGE REQUIREMENTS (With sync hook)
  // ---------------------------------------------------------------------------
  static async listOperatingRules() {
    return await prisma.operatingRule.findMany({
      include: {
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });
  }

  static async createOperatingRule(data: {
    brandId: string;
    processId: string;
    workingDays: number[];
    operatesOnPublicHolidays?: boolean;
  }) {
    const existing = await prisma.operatingRule.findUnique({
      where: {
        brandId_processId: {
          brandId: data.brandId,
          processId: data.processId,
        },
      },
    });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_RULE', 'Operating rule for this brand and process already exists.');
    }
    return await prisma.operatingRule.create({ data });
  }

  static async updateOperatingRule(
    id: string,
    data: { workingDays?: number[]; operatesOnPublicHolidays?: boolean }
  ) {
    const rule = await prisma.operatingRule.findUnique({ where: { id } });
    if (!rule) throw new AppError(404, 'NOT_FOUND', 'Operating rule not found.');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.operatingRule.update({ where: { id }, data });
      // Sync all open DRAFT rosters
      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }
      return { rule: updated, syncResults };
    });
  }

  static async deleteOperatingRule(id: string) {
    return await prisma.operatingRule.delete({ where: { id } });
  }

  static async listCoverageRequirements() {
    return await prisma.coverageRequirement.findMany({
      include: {
        brand: { select: { id: true, name: true } },
        process: { select: { id: true, name: true } },
      },
    });
  }

  static async createCoverageRequirement(data: {
    brandId: string;
    processId: string;
    minimumStaff: number;
    date?: string | null;
    dayOfWeek?: number | null;
  }) {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.coverageRequirement.create({
        data: {
          brandId: data.brandId,
          processId: data.processId,
          minimumStaff: data.minimumStaff,
          date: data.date ? parseUTCDate(data.date) : null,
          dayOfWeek: data.dayOfWeek,
        },
      });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      let impact: any[] = [];
      const primaryDraft = draftRosters[0];
      if (primaryDraft && data.date) {
        impact = await computeChangeImpact(tx as any, primaryDraft.id, {
          dates: [data.date],
          brandIds: [data.brandId],
          processIds: [data.processId],
        });
      }

      return { requirement: created, syncResults, impact };
    });
  }

  static async updateCoverageRequirement(
    id: string,
    data: { minimumStaff?: number; date?: string | null; dayOfWeek?: number | null }
  ) {
    const req = await prisma.coverageRequirement.findUnique({ where: { id } });
    if (!req) throw new AppError(404, 'NOT_FOUND', 'Coverage requirement not found.');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.coverageRequirement.update({
        where: { id },
        data: {
          minimumStaff: data.minimumStaff,
          date: data.date !== undefined ? (data.date ? parseUTCDate(data.date) : null) : undefined,
          dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : undefined,
        },
      });

      // Synchronize all open DRAFT rosters
      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      let impact: any[] = [];
      const primaryDraft = draftRosters[0];
      const targetDate = data.date || (req.date ? toDateString(req.date) : null);
      if (primaryDraft && targetDate) {
        impact = await computeChangeImpact(tx as any, primaryDraft.id, {
          dates: [targetDate],
          brandIds: [req.brandId],
          processIds: [req.processId],
        });
      }

      return { requirement: updated, syncResults, impact };
    });
  }

  static async deleteCoverageRequirement(id: string) {
    const req = await prisma.coverageRequirement.findUnique({ where: { id } });
    if (!req) throw new AppError(404, 'NOT_FOUND', 'Coverage requirement not found.');

    return await prisma.$transaction(async (tx) => {
      await tx.coverageRequirement.delete({ where: { id } });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      let impact: any[] = [];
      const primaryDraft = draftRosters[0];
      const targetDate = req.date ? toDateString(req.date) : null;
      if (primaryDraft && targetDate) {
        impact = await computeChangeImpact(tx as any, primaryDraft.id, {
          dates: [targetDate],
          brandIds: [req.brandId],
          processIds: [req.processId],
        });
      }

      return { success: true, syncResults, impact };
    });
  }

  // ---------------------------------------------------------------------------
  // AVAILABILITY (With sync hooks)
  // ---------------------------------------------------------------------------
  static async listAvailabilities(filter?: { employeeId?: string; type?: any; status?: any }) {
    return await prisma.employeeAvailability.findMany({
      where: filter,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createAvailability(data: {
    employeeId: string;
    type: any;
    dayOfWeek?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    status: any;
    reason?: string | null;
  }) {
    // Validate rules
    if (data.type === 'WEEKLY_OFF') {
      if (data.dayOfWeek === null || data.dayOfWeek === undefined || data.dayOfWeek < 0 || data.dayOfWeek > 6) {
        throw new AppError(400, 'INVALID_WEEKLY_OFF', 'Weekly off requires dayOfWeek between 0 (Sun) and 6 (Sat).');
      }
    } else {
      if (!data.startDate || !data.endDate) {
        throw new AppError(400, 'INVALID_LEAVE_DATES', 'Leave and comp-off require startDate and endDate.');
      }
      if (data.endDate < data.startDate) {
        throw new AppError(400, 'INVALID_DATE_RANGE', 'Leave endDate must be greater than or equal to startDate.');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const created = await tx.employeeAvailability.create({
        data: {
          employeeId: data.employeeId,
          type: data.type,
          dayOfWeek: data.dayOfWeek,
          startDate: data.startDate ? parseUTCDate(data.startDate) : null,
          endDate: data.endDate ? parseUTCDate(data.endDate) : null,
          status: data.status,
          reason: data.reason,
        },
      });

      // If APPROVED, convert affected WORKING entries in open DRAFT rosters and sync
      const syncResults: any[] = [];
      if (data.status === 'APPROVED') {
        const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
        for (const roster of draftRosters) {
          // If leave or comp-off overlaps this roster
          if (data.type === 'LEAVE' || data.type === 'COMP_OFF') {
            const startStr = data.startDate!;
            const endStr = data.endDate!;

          // Convert shifts in this interval to LEAVE/COMP_OFF
          await tx.rosterEntry.updateMany({
            where: {
              rosterId: roster.id,
              employeeId: data.employeeId,
              date: {
                gte: parseUTCDate(startStr),
                lte: parseUTCDate(endStr),
              },
            },
            data: {
              status: data.type,
              brandId: null,
              processId: null,
            },
          });
          }

          const syncRes = await RosterService.syncAffectedDraftRosters(tx, roster.month, roster.year);
          syncResults.push(...syncRes);
        }
      }

      // Calculate change impact summary
      let impact: any[] = [];
      const primaryDraft = await tx.roster.findFirst({ where: { status: 'DRAFT' }, orderBy: { year: 'desc' } });
      if (primaryDraft) {
        const dates: string[] = [];
        if (data.startDate && data.endDate) {
          let curr = parseUTCDate(data.startDate);
          const end = parseUTCDate(data.endDate);
          while (curr <= end) {
            dates.push(toDateString(curr));
            curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
          }
        }
        impact = await computeChangeImpact(tx as any, primaryDraft.id, { dates });
      }

      return { availability: created, syncResults, impact };
    });
  }

  static async updateAvailability(
    id: string,
    data: {
      type?: any;
      dayOfWeek?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      status?: any;
      reason?: string | null;
    }
  ) {
    const existing = await prisma.employeeAvailability.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Availability record not found.');

    const newStart = data.startDate !== undefined ? data.startDate : (existing.startDate ? toDateString(existing.startDate) : null);
    const newEnd = data.endDate !== undefined ? data.endDate : (existing.endDate ? toDateString(existing.endDate) : null);

    if (newStart && newEnd && newEnd < newStart) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'Leave endDate must be greater than or equal to startDate.');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.employeeAvailability.update({
        where: { id },
        data: {
          type: data.type,
          dayOfWeek: data.dayOfWeek,
          startDate: newStart ? parseUTCDate(newStart) : null,
          endDate: newEnd ? parseUTCDate(newEnd) : null,
          status: data.status,
          reason: data.reason,
        },
      });

      const syncResults: any[] = [];
      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      for (const roster of draftRosters) {
        const syncRes = await RosterService.syncAffectedDraftRosters(tx, roster.month, roster.year);
        syncResults.push(...syncRes);
      }

      let impact: any[] = [];
      const primaryDraft = draftRosters[0];
      if (primaryDraft && newStart && newEnd) {
        const dates: string[] = [];
        let curr = parseUTCDate(newStart);
        const end = parseUTCDate(newEnd);
        while (curr <= end) {
          dates.push(toDateString(curr));
          curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
        }
        impact = await computeChangeImpact(tx as any, primaryDraft.id, { dates });
      }

      return { availability: updated, syncResults, impact };
    });
  }

  static async deleteAvailability(id: string) {
    const existing = await prisma.employeeAvailability.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Availability record not found.');

    return await prisma.$transaction(async (tx) => {
      await tx.employeeAvailability.delete({ where: { id } });

      const syncResults: any[] = [];
      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      for (const roster of draftRosters) {
        if (
          existing.status === 'APPROVED' &&
          (existing.type === 'LEAVE' || existing.type === 'COMP_OFF') &&
          existing.startDate &&
          existing.endDate
        ) {
          const empAssignments = await tx.assignment.findMany({
            where: { employeeId: existing.employeeId },
            include: { brand: true, process: true },
          });

          const entriesToRestore = await tx.rosterEntry.findMany({
            where: {
              rosterId: roster.id,
              employeeId: existing.employeeId,
              status: { in: ['LEAVE', 'COMP_OFF'] },
              date: {
                gte: existing.startDate,
                lte: existing.endDate,
              },
            },
          });

          for (const entry of entriesToRestore) {
            const dateStr = toDateString(entry.date);
            const weekday = parseUTCDate(dateStr).getUTCDay();

            let restored = false;
            for (const assign of empAssignments) {
              const rule = await tx.operatingRule.findFirst({
                where: { brandId: assign.brandId, processId: assign.processId },
              });
              if (rule && rule.workingDays.includes(weekday)) {
                await tx.rosterEntry.update({
                  where: { id: entry.id },
                  data: {
                    status: 'WORKING',
                    brandId: assign.brandId,
                    processId: assign.processId,
                  },
                });
                restored = true;
                break;
              }
            }

            if (!restored) {
              await tx.rosterEntry.update({
                where: { id: entry.id },
                data: {
                  status: 'WEEKLY_OFF',
                  brandId: null,
                  processId: null,
                },
              });
            }
          }
        }

        const syncRes = await RosterService.syncAffectedDraftRosters(tx, roster.month, roster.year);
        syncResults.push(...syncRes);
      }

      let impact: any[] = [];
      const primaryDraft = draftRosters[0];
      if (primaryDraft && existing.startDate && existing.endDate) {
        const dates: string[] = [];
        let curr = parseUTCDate(toDateString(existing.startDate));
        const end = parseUTCDate(toDateString(existing.endDate));
        while (curr <= end) {
          dates.push(toDateString(curr));
          curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
        }
        impact = await computeChangeImpact(tx as any, primaryDraft.id, { dates });
      }

      return { success: true, syncResults, impact };
    });
  }

  // ---------------------------------------------------------------------------
  // EMPLOYEE PREFERENCES
  // ---------------------------------------------------------------------------
  static async listPreferences(employeeId: string) {
    return await prisma.employeePreference.findMany({
      where: { employeeId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async createPreference(employeeId: string, data: { type?: any; dayOfWeek: number; note?: string | null }) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new AppError(404, 'NOT_FOUND', 'Employee not found.');

    return await prisma.$transaction(async (tx) => {
      const created = await tx.employeePreference.create({
        data: {
          employeeId,
          type: data.type || 'PREFERRED_OFF_DAY',
          dayOfWeek: data.dayOfWeek,
          note: data.note,
        },
      });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { preference: created, syncResults };
    });
  }

  static async updatePreference(id: string, data: { dayOfWeek?: number; note?: string | null }) {
    const existing = await prisma.employeePreference.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Preference not found.');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.employeePreference.update({
        where: { id },
        data,
      });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { preference: updated, syncResults };
    });
  }

  static async deletePreference(id: string) {
    const existing = await prisma.employeePreference.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Preference not found.');

    return await prisma.$transaction(async (tx) => {
      await tx.employeePreference.delete({ where: { id } });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { success: true, syncResults };
    });
  }

  // ---------------------------------------------------------------------------
  // PUBLIC HOLIDAYS (With sync hook)
  // ---------------------------------------------------------------------------
  static async listPublicHolidays() {
    return await prisma.publicHoliday.findMany({ orderBy: { date: 'asc' } });
  }

  static async createPublicHoliday(data: { date: string; name: string; region?: string }) {
    const d = parseUTCDate(data.date);
    const region = data.region || 'ALL';

    const existing = await prisma.publicHoliday.findUnique({
      where: { date_region: { date: d, region } },
    });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_HOLIDAY', 'Holiday for this date and region already exists.');
    }

    return await prisma.$transaction(async (tx) => {
      const holiday = await tx.publicHoliday.create({
        data: {
          date: d,
          name: data.name,
          region,
        },
      });

      // Synchronize affected draft rosters
      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { holiday, syncResults };
    });
  }

  static async updatePublicHoliday(id: string, data: { date?: string; name?: string; region?: string }) {
    const existing = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Public holiday not found.');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.publicHoliday.update({
        where: { id },
        data: {
          name: data.name,
          region: data.region,
          date: data.date ? parseUTCDate(data.date) : undefined,
        },
      });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { holiday: updated, syncResults };
    });
  }

  static async deletePublicHoliday(id: string) {
    const existing = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Public holiday not found.');

    return await prisma.$transaction(async (tx) => {
      await tx.publicHoliday.delete({ where: { id } });

      const draftRosters = await tx.roster.findMany({ where: { status: 'DRAFT' } });
      const syncResults = [];
      for (const r of draftRosters) {
        const res = await RosterService.syncAffectedDraftRosters(tx, r.month, r.year);
        syncResults.push(...res);
      }

      return { success: true, syncResults };
    });
  }
}
