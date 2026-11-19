import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createEmployeeSchema, updateEmployeeSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listEmployees);
router.get('/:id', CrudController.getEmployeeById);
router.post('/', validate(createEmployeeSchema), CrudController.createEmployee);
router.put('/:id', validate(updateEmployeeSchema), CrudController.updateEmployee);
router.patch('/:id', validate(updateEmployeeSchema), CrudController.updateEmployee);
router.delete('/:id', CrudController.deleteEmployee);

export default router;
