import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createProcessSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listProcesses);
router.post('/', validate(createProcessSchema), CrudController.createProcess);
router.delete('/:id', CrudController.deleteProcess);

export default router;
