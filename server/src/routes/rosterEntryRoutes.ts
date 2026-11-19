import { Router } from 'express';
import { RosterController } from '../controllers/rosterController';
import { validate } from '../middleware/validate';
import { updateEntrySchema } from '../validations/schemas';

const router = Router();

router.patch('/:id', validate(updateEntrySchema), RosterController.updateEntry);
router.delete('/:id', RosterController.unassignEntry);

export default router;
