import { Request, Response, NextFunction } from 'express';
import { RosterService } from '../services/rosterService';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class RosterController {
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;
      const data = await RosterService.generate(month, year);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async listRosters(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const data = await RosterService.listRosters({ month, year });
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getRosterById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getRosterById(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getEntries(getId(req), req.query as any);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getEmployeeView(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getEmployeeView(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getBrandView(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getBrandView(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getConflicts(getId(req), req.query as any);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const force = req.body.force === true;
      const data = await RosterService.publish(getId(req), force);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getReplacements(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.getReplacementsForConflict(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async assignReplacement(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.body;
      const data = await RosterService.assignReplacement(getId(req), employeeId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async updateEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.updateEntry(getId(req), req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async unassignEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RosterService.unassignEntry(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }
}
