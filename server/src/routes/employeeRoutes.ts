import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createPreferenceSchema,
  updatePreferenceSchema,
} from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listEmployees);
router.get('/:id', CrudController.getEmployeeById);
router.post('/', validate(createEmployeeSchema), CrudController.createEmployee);
router.put('/:id', validate(updateEmployeeSchema), CrudController.updateEmployee);
router.patch('/:id', validate(updateEmployeeSchema), CrudController.updateEmployee);
router.delete('/:id', CrudController.deleteEmployee);

// Preferences
router.get('/:id/preferences', CrudController.listPreferences);
router.post('/:id/preferences', validate(createPreferenceSchema), CrudController.createPreference);
router.put('/:id/preferences/:prefId', validate(updatePreferenceSchema), CrudController.updatePreference);
router.patch('/:id/preferences/:prefId', validate(updatePreferenceSchema), CrudController.updatePreference);
router.delete('/:id/preferences/:prefId', CrudController.deletePreference);

export default router;
