/**
 * Database Loader for the Scheduling Engine.
 * One of ONLY two files permitted to touch Prisma.
 *
 * Loads database models into plain EngineInput POJOs.
 */

import { PrismaClient } from '@prisma/client';
import { EngineInput } from './types';
import { toDateString } from './dates';

export async function loadEngineInput(
  prisma: PrismaClient,
  year: number,
  month: number
): Promise<EngineInput> {
  const [
    brands,
    processes,
    employees,
    assignments,
    operatingRules,
    coverageRequirements,
    availabilities,
    holidays,
    preferences,
  ] = await Promise.all([
    prisma.brand.findMany(),
    prisma.process.findMany(),
    prisma.employee.findMany(),
    prisma.assignment.findMany(),
    prisma.operatingRule.findMany(),
    prisma.coverageRequirement.findMany(),
    prisma.employeeAvailability.findMany(),
    prisma.publicHoliday.findMany(),
    prisma.employeePreference.findMany(),
  ]);

  return {
    month,
    year,
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
    })),
    processes: processes.map((p) => ({
      id: p.id,
      name: p.name,
    })),
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      podId: e.podId,
      status: e.status,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      brandId: a.brandId,
      processId: a.processId,
    })),
    operatingRules: operatingRules.map((r) => ({
      id: r.id,
      brandId: r.brandId,
      processId: r.processId,
      workingDays: r.workingDays,
      operatesOnPublicHolidays: r.operatesOnPublicHolidays,
    })),
    coverageRequirements: coverageRequirements.map((cr) => ({
      id: cr.id,
      brandId: cr.brandId,
      processId: cr.processId,
      minimumStaff: cr.minimumStaff,
      date: cr.date ? toDateString(cr.date) : null,
      dayOfWeek: cr.dayOfWeek,
    })),
    availabilities: availabilities.map((av) => ({
      id: av.id,
      employeeId: av.employeeId,
      type: av.type,
      dayOfWeek: av.dayOfWeek,
      startDate: av.startDate ? toDateString(av.startDate) : null,
      endDate: av.endDate ? toDateString(av.endDate) : null,
      status: av.status,
      reason: av.reason,
    })),
    holidays: holidays.map((h) => ({
      id: h.id,
      date: toDateString(h.date),
      name: h.name,
      region: h.region,
    })),
    preferences: preferences.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      type: p.type as 'PREFERRED_OFF_DAY',
      dayOfWeek: p.dayOfWeek,
      note: p.note,
    })),
  };
}
