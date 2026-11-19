import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createOperatingRuleSchema, updateOperatingRuleSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listOperatingRules);
router.post('/', validate(createOperatingRuleSchema), CrudController.createOperatingRule);
router.patch('/:id', validate(updateOperatingRuleSchema), CrudController.updateOperatingRule);
router.delete('/:id', CrudController.deleteOperatingRule);

export default router;
