import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createPublicHolidaySchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listPublicHolidays);
router.post('/', validate(createPublicHolidaySchema), CrudController.createPublicHoliday);
router.delete('/:id', CrudController.deletePublicHoliday);

export default router;
