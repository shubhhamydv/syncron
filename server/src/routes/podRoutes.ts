import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createPodSchema, updatePodSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listPods);
router.get('/:id', CrudController.getPodById);
router.post('/', validate(createPodSchema), CrudController.createPod);
router.put('/:id', validate(updatePodSchema), CrudController.updatePod);
router.patch('/:id', validate(updatePodSchema), CrudController.updatePod);
router.delete('/:id', CrudController.deletePod);

export default router;
