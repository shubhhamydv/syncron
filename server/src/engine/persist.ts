/**
 * Database Persistence Engine for Roster Output.
 * One of ONLY two files permitted to touch Prisma.
 *
 * Persists the generated Roster, RosterEntry drafts, and Conflict drafts.
 *
 * Idempotency & Safety Rules:
 * - Safe to call repeatedly for the same month/year in DRAFT status.
 * - In one atomic transaction, cleans out previous entries and conflicts and replaces them.
 * - Refuses with a descriptive error if the target roster has already been PUBLISHED.
 */

import { PrismaClient, Roster } from '@prisma/client';
import { EngineInput, EngineOutput } from './types';
import { parseUTCDate } from './dates';

export async function persistRoster(
  prisma: PrismaClient,
  input: EngineInput,
  output: EngineOutput
): Promise<Roster> {
  return await prisma.$transaction(async (tx) => {
    // 1. Guard against overwriting a PUBLISHED roster
    const existing = await tx.roster.findUnique({
      where: {
        month_year: {
          month: input.month,
          year: input.year,
        },
      },
    });

    if (existing && existing.status === 'PUBLISHED') {
      throw new Error(
        `Cannot overwrite published roster for month ${input.month}/${input.year}. Roster status is PUBLISHED.`
      );
    }

    // 2. Upsert monthly Roster container (status remains DRAFT)
    const roster = await tx.roster.upsert({
      where: {
        month_year: {
          month: input.month,
          year: input.year,
        },
      },
      create: {
        month: input.month,
        year: input.year,
        status: 'DRAFT',
      },
      update: {
        status: 'DRAFT',
      },
    });

    // 3. Atomically delete existing draft entries and conflicts for this roster
    await tx.rosterEntry.deleteMany({ where: { rosterId: roster.id } });
    await tx.conflict.deleteMany({ where: { rosterId: roster.id } });

    // 4. Batch insert roster entries
    if (output.entries.length > 0) {
      await tx.rosterEntry.createMany({
        data: output.entries.map((e) => ({
          rosterId: roster.id,
          employeeId: e.employeeId,
          brandId: e.brandId,
          processId: e.processId,
          date: parseUTCDate(e.date),
          status: e.status,
        })),
      });
    }

    // 5. Batch insert conflicts
    if (output.conflicts.length > 0) {
      await tx.conflict.createMany({
        data: output.conflicts.map((c) => ({
          rosterId: roster.id,
          date: parseUTCDate(c.date),
          brandId: c.brandId,
          processId: c.processId,
          type: c.type,
          severity: (c.severity || (c.type === 'PREFERENCE_VIOLATION' ? 'WARNING' : 'ERROR')) as any,
          requiredStaff: c.requiredStaff,
          availableStaff: c.availableStaff,
          message: c.message,
          status: 'OPEN',
        })),
      });
    }

    return roster;
  });
}
