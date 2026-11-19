import { Request, Response, NextFunction } from 'express';
import { CrudService } from '../services/crudService';

function getId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class CrudController {
  // Employees
  static async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CrudService.listEmployees(req.query as any);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CrudService.getEmployeeById(getId(req));
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CrudService.createEmployee(req.body);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CrudService.updateEmployee(getId(req), req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteEmployee(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Pods
  static async listPods(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listPods());
    } catch (e) {
      next(e);
    }
  }

  static async getPodById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.getPodById(getId(req)));
    } catch (e) {
      next(e);
    }
  }

  static async createPod(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createPod(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async updatePod(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.updatePod(getId(req), req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deletePod(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deletePod(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Brands
  static async listBrands(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listBrands());
    } catch (e) {
      next(e);
    }
  }

  static async getBrandById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.getBrandById(getId(req)));
    } catch (e) {
      next(e);
    }
  }

  static async createBrand(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createBrand(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async updateBrand(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.updateBrand(getId(req), req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteBrand(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteBrand(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Processes
  static async listProcesses(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listProcesses());
    } catch (e) {
      next(e);
    }
  }

  static async createProcess(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createProcess(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteProcess(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteProcess(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Assignments
  static async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listAssignments(req.query as any));
    } catch (e) {
      next(e);
    }
  }

  static async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createAssignment(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteAssignment(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Operating Rules
  static async listOperatingRules(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listOperatingRules());
    } catch (e) {
      next(e);
    }
  }

  static async createOperatingRule(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createOperatingRule(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async updateOperatingRule(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.updateOperatingRule(getId(req), req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteOperatingRule(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteOperatingRule(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Coverage Requirements
  static async listCoverageRequirements(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listCoverageRequirements());
    } catch (e) {
      next(e);
    }
  }

  static async createCoverageRequirement(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createCoverageRequirement(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async updateCoverageRequirement(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.updateCoverageRequirement(getId(req), req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteCoverageRequirement(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deleteCoverageRequirement(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }

  // Availability
  static async listAvailabilities(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listAvailabilities(req.query as any));
    } catch (e) {
      next(e);
    }
  }

  static async createAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createAvailability(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.updateAvailability(getId(req), req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deleteAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.deleteAvailability(getId(req)));
    } catch (e) {
      next(e);
    }
  }

  // Public Holidays
  static async listPublicHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await CrudService.listPublicHolidays());
    } catch (e) {
      next(e);
    }
  }

  static async createPublicHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await CrudService.createPublicHoliday(req.body));
    } catch (e) {
      next(e);
    }
  }

  static async deletePublicHoliday(req: Request, res: Response, next: NextFunction) {
    try {
      await CrudService.deletePublicHoliday(getId(req));
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
}
