import { Request, Response, NextFunction } from 'express';
import { RosterService } from '../services/rosterService';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getUTCMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getUTCFullYear();
      const data = await RosterService.getDashboard(month, year);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }
}
