import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createCoverageRequirementSchema, updateCoverageRequirementSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listCoverageRequirements);
router.post('/', validate(createCoverageRequirementSchema), CrudController.createCoverageRequirement);
router.patch('/:id', validate(updateCoverageRequirementSchema), CrudController.updateCoverageRequirement);
router.put('/:id', validate(updateCoverageRequirementSchema), CrudController.updateCoverageRequirement);
router.delete('/:id', CrudController.deleteCoverageRequirement);

export default router;
