import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createAvailabilitySchema, updateAvailabilitySchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listAvailabilities);
router.post('/', validate(createAvailabilitySchema), CrudController.createAvailability);
router.put('/:id', validate(updateAvailabilitySchema), CrudController.updateAvailability);
router.patch('/:id', validate(updateAvailabilitySchema), CrudController.updateAvailability);
router.delete('/:id', CrudController.deleteAvailability);

export default router;
