/**
 * Change Impact Analysis Service.
 * Evaluates operational coverage impact before and after schedule or constraint modifications.
 */

import { PrismaClient } from '@prisma/client';
import { loadEngineInput, resolveDailyRequirements, toDateString } from '../engine';

export interface ChangeImpactItem {
  date: string;
  brandId: string;
  brandName: string;
  processId: string;
  processName: string;
  requiredStaff: number;
  allocatedBefore: number;
  allocatedBeforeEmployees: string[];
  allocatedAfter: number;
  allocatedAfterEmployees: string[];
  status: 'STILL_COVERED' | 'PARTIAL' | 'GAP';
}

export async function computeChangeImpact(
  prisma: PrismaClient,
  rosterId: string,
  filter: {
    dates?: string[];
    brandIds?: string[];
    processIds?: string[];
  }
): Promise<ChangeImpactItem[]> {
  const roster = await prisma.roster.findUnique({ where: { id: rosterId } });
  if (!roster) return [];

  const input = await loadEngineInput(prisma, roster.year, roster.month);

  // Load current working entries for this roster
  const workingEntries = await prisma.rosterEntry.findMany({
    where: { rosterId, status: 'WORKING' },
    include: {
      employee: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      process: { select: { id: true, name: true } },
    },
  });

  // Calculate distinct employees per brand to detect single-resource brands
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
  const bpAllocatedMap = new Map<string, Array<{ id: string; name: string }>>();
  const brandDayAllocatedMap = new Map<string, Array<{ id: string; name: string }>>();

  for (const w of workingEntries) {
    if (!w.brandId) continue;
    const dateStr = toDateString(w.date);
    const bKey = `${dateStr}_${w.brandId}`;
    if (!brandDayAllocatedMap.has(bKey)) {
      brandDayAllocatedMap.set(bKey, []);
    }
    brandDayAllocatedMap.get(bKey)!.push({ id: w.employee.id, name: w.employee.name });

    if (w.processId) {
      const key = `${dateStr}_${w.brandId}_${w.processId}`;
      if (!bpAllocatedMap.has(key)) {
        bpAllocatedMap.set(key, []);
      }
      bpAllocatedMap.get(key)!.push({ id: w.employee.id, name: w.employee.name });
    }
  }

  const impactList: ChangeImpactItem[] = [];
  const targetDates = filter.dates && filter.dates.length > 0 ? filter.dates : [];

  for (const dateStr of targetDates) {
    const dailyReqs = resolveDailyRequirements(dateStr, input);
    for (const req of dailyReqs) {
      if (filter.brandIds && filter.brandIds.length > 0 && !filter.brandIds.includes(req.brandId)) {
        continue;
      }
      if (filter.processIds && filter.processIds.length > 0 && !filter.processIds.includes(req.processId)) {
        continue;
      }

      const key = `${dateStr}_${req.brandId}_${req.processId}`;
      let allocatedEmployees = bpAllocatedMap.get(key) || [];
      if (allocatedEmployees.length === 0 && isSingleResourceBrand(req.brandId)) {
        const brandEmps = brandDayAllocatedMap.get(`${dateStr}_${req.brandId}`) || [];
        if (brandEmps.length > 0) {
          allocatedEmployees = brandEmps;
        }
      }

      const allocatedCount = allocatedEmployees.length;
      let status: 'STILL_COVERED' | 'PARTIAL' | 'GAP' = 'STILL_COVERED';
      if (allocatedCount === 0 && req.minimumStaff > 0) {
        status = 'GAP';
      } else if (allocatedCount < req.minimumStaff) {
        status = 'PARTIAL';
      }

      const empNames = allocatedEmployees.map((e) => e.name);

      impactList.push({
        date: dateStr,
        brandId: req.brandId,
        brandName: req.brandName,
        processId: req.processId,
        processName: req.processName,
        requiredStaff: req.minimumStaff,
        allocatedBefore: allocatedCount,
        allocatedBeforeEmployees: empNames,
        allocatedAfter: allocatedCount,
        allocatedAfterEmployees: empNames,
        status,
      });
    }
  }

  return impactList;
}
