import { seedDatabase } from '../src/lib/seed';
import { prisma } from '../src/lib/prisma';

seedDatabase(prisma)
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
