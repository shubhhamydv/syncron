import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createAssignmentSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listAssignments);
router.post('/', validate(createAssignmentSchema), CrudController.createAssignment);
router.delete('/:id', CrudController.deleteAssignment);

export default router;
