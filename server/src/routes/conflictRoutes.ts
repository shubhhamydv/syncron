import { Router } from 'express';
import { RosterController } from '../controllers/rosterController';
import { validate } from '../middleware/validate';
import { assignReplacementSchema } from '../validations/schemas';

const router = Router();

router.get('/:id/replacements', RosterController.getReplacements);
router.post('/:id/assign', validate(assignReplacementSchema), RosterController.assignReplacement);

export default router;
