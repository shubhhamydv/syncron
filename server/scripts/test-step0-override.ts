import { prisma } from '../src/lib/prisma';
import { RosterService } from '../src/services/rosterService';

async function main() {
  const rohan = await prisma.employee.findFirst({ where: { name: 'Rohan Iyer' } });
  if (!rohan) throw new Error('Rohan Iyer not found');

  const roster = await prisma.roster.findUnique({
    where: { month_year: { month: 12, year: 2026 } },
  });
  if (!roster) throw new Error('December 2026 roster not found');

  const targetDate = new Date('2026-12-15T00:00:00.000Z');
  const entry = await prisma.rosterEntry.findFirst({
    where: {
      rosterId: roster.id,
      employeeId: rohan.id,
      date: targetDate,
    },
    include: { brand: true, process: true },
  });

  if (!entry) throw new Error('Entry not found for Rohan on 2026-12-15');

  console.log(`Initial entry: ID=${entry.id}, status=${entry.status}, brand=${entry.brand?.name}, process=${entry.process?.name}`);

  // Perform override: set status to WORKING with override: true
  console.log('\n--- Calling RosterService.updateEntry with override: true ---');
  const result = await RosterService.updateEntry(entry.id, {
    status: 'WORKING',
    override: true,
  });

  const exactResponse = {
    opened: result.opened,
    resolved: result.resolved,
  };

  console.log('EXACT_RESPONSE:', JSON.stringify(exactResponse));
  console.log(`opened: ${exactResponse.opened} (type: ${typeof exactResponse.opened})`);
  console.log(`resolved: ${exactResponse.resolved} (type: ${typeof exactResponse.resolved})`);

  // Query conflicts for that date
  const conflicts = await prisma.conflict.findMany({
    where: {
      rosterId: roster.id,
      date: targetDate,
    },
  });

  console.log('\nConflicts after override on 2026-12-15:');
  for (const c of conflicts) {
    console.log(` - ID=${c.id} | Type=${c.type} | Status=${c.status} | Required=${c.requiredStaff} | Available=${c.availableStaff} | Message="${c.message}"`);
  }

  // Now revert back to LEAVE
  console.log('\n--- Reverting Rohan Iyer back to LEAVE ---');
  const revertResult = await RosterService.updateEntry(entry.id, {
    status: 'LEAVE',
    brandId: null,
    processId: null,
    override: true,
  });
  console.log('Revert response:', JSON.stringify({ opened: revertResult.opened, resolved: revertResult.resolved }));

  const totalOpenConflicts = await prisma.conflict.count({
    where: { rosterId: roster.id, status: 'OPEN' },
  });
  console.log(`Total open conflicts after revert: ${totalOpenConflicts}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
