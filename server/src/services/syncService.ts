/**
 * Conflict Synchronization Service.
 *
 * Demo-critical service:
 * Re-validates the saved entries against engine inputs and synchronizes
 * the stored conflicts using a stable key:
 * (rosterId + date + brandId + processId + type).
 *
 * Returns { opened, resolved }.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { loadEngineInput, parseUTCDate, toDateString, validateRoster } from '../engine';

type PrismaTx = Prisma.TransactionClient | PrismaClient;

export interface SyncConflictsResult {
  opened: number;
  resolved: number;
}

export async function syncConflicts(
  tx: PrismaTx,
  rosterId: string
): Promise<SyncConflictsResult> {
  const roster = await tx.roster.findUnique({
    where: { id: rosterId },
  });
  if (!roster) {
    return { opened: 0, resolved: 0 };
  }

  // 1. Load engine input and current saved entries
  const input = await loadEngineInput(tx as any, roster.year, roster.month);
  const currentEntries = await tx.rosterEntry.findMany({
    where: { rosterId },
  });

  const entryDrafts = currentEntries.map((e) => ({
    employeeId: e.employeeId,
    brandId: e.brandId,
    processId: e.processId,
    date: toDateString(e.date),
    status: e.status,
  }));

  // 2. Derive fresh conflicts from the independent validator
  const freshConflicts = validateRoster(input, entryDrafts);

  // 3. Load stored conflicts from database
  const storedConflicts = await tx.conflict.findMany({
    where: { rosterId },
  });

  const makeKey = (c: {
    date: string | Date;
    brandId: string;
    processId: string;
    type: string;
  }) => `${rosterId}_${toDateString(c.date)}_${c.brandId}_${c.processId}_${c.type}`;

  const storedMap = new Map(storedConflicts.map((c) => [makeKey(c), c]));
  const freshMap = new Map(freshConflicts.map((c) => [makeKey(c), c]));

  let opened = 0;
  let resolved = 0;

  // Insert new conflicts or re-open previously resolved ones
  for (const fresh of freshConflicts) {
    const key = makeKey(fresh);
    const existing = storedMap.get(key);

    if (!existing) {
      await tx.conflict.create({
        data: {
          rosterId,
          date: parseUTCDate(fresh.date),
          brandId: fresh.brandId,
          processId: fresh.processId,
          type: fresh.type,
          requiredStaff: fresh.requiredStaff,
          availableStaff: fresh.availableStaff,
          message: fresh.message,
          status: 'OPEN',
          resolvedAt: null,
        },
      });
      opened++;
    } else if (existing.status === 'RESOLVED') {
      await tx.conflict.update({
        where: { id: existing.id },
        data: {
          status: 'OPEN',
          resolvedAt: null,
          message: fresh.message,
          requiredStaff: fresh.requiredStaff,
          availableStaff: fresh.availableStaff,
        },
      });
      opened++;
    } else {
      // Leave unchanged or update message/availableStaff if counts shifted
      if (
        existing.message !== fresh.message ||
        existing.availableStaff !== fresh.availableStaff ||
        existing.requiredStaff !== fresh.requiredStaff
      ) {
        await tx.conflict.update({
          where: { id: existing.id },
          data: {
            message: fresh.message,
            requiredStaff: fresh.requiredStaff,
            availableStaff: fresh.availableStaff,
          },
        });
      }
    }
  }

  // Mark conflicts that no longer apply as RESOLVED
  for (const stored of storedConflicts) {
    const key = makeKey(stored);
    if (stored.status === 'OPEN' && !freshMap.has(key)) {
      await tx.conflict.update({
        where: { id: stored.id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      resolved++;
    }
  }

  return { opened, resolved };
}
