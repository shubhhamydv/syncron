import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { RosterService } from '../services/rosterService';
import { seedDatabase } from '../lib/seed';

export class AdminController {
  static async resetDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const adminToken = process.env.ADMIN_TOKEN;
      if (!adminToken) {
        return res.status(403).json({
          error: {
            code: 'ADMIN_DISABLED',
            message: 'Admin demo reset is disabled because ADMIN_TOKEN is not configured.',
          },
        });
      }

      const clientToken = req.headers['x-admin-token'];
      if (!clientToken || clientToken !== adminToken) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Invalid or missing x-admin-token header.',
          },
        });
      }

      // Re-seed database idempotently
      await seedDatabase(prisma);

      // Regenerate baseline December 2026 roster
      const genResult = await RosterService.generate(12, 2026);

      res.json({
        success: true,
        message: 'Demo database re-seeded and December 2026 baseline roster regenerated successfully.',
        rosterId: genResult.roster.id,
        conflictsCount: genResult.conflictsCount,
        totalEntries: genResult.stats.totalEntries,
      });
    } catch (e) {
      next(e);
    }
  }
}
