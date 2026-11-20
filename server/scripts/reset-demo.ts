import { prisma } from '../src/lib/prisma';
import { seedDatabase } from '../src/lib/seed';
import { RosterService } from '../src/services/rosterService';

async function main() {
  console.log('🔄 Resetting demo database to clean baseline...');
  await seedDatabase(prisma);

  console.log('📅 Regenerating baseline December 2026 roster...');
  const res = await RosterService.generate(12, 2026);
  console.log(`✅ Demo reset complete! Roster ID: ${res.roster.id}, Conflicts: ${res.conflictsCount}, Entries: ${res.stats.totalEntries}`);
}

main()
  .catch((e) => {
    console.error('Demo reset failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
