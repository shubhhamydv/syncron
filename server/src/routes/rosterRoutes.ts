import { Router } from 'express';
import { RosterController } from '../controllers/rosterController';
import { validate } from '../middleware/validate';
import { generateRosterSchema, publishRosterSchema } from '../validations/schemas';

const router = Router();

router.post('/generate', validate(generateRosterSchema), RosterController.generate);
router.get('/', RosterController.listRosters);
router.get('/:id', RosterController.getRosterById);
router.get('/:id/entries', RosterController.getEntries);
router.get('/:id/employee-view', RosterController.getEmployeeView);
router.get('/:id/brand-view', RosterController.getBrandView);
router.get('/:id/conflicts', RosterController.getConflicts);
router.post('/:id/publish', validate(publishRosterSchema), RosterController.publish);

export default router;
