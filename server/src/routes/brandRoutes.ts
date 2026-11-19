import { Router } from 'express';
import { CrudController } from '../controllers/crudController';
import { validate } from '../middleware/validate';
import { createBrandSchema, updateBrandSchema } from '../validations/schemas';

const router = Router();

router.get('/', CrudController.listBrands);
router.get('/:id', CrudController.getBrandById);
router.post('/', validate(createBrandSchema), CrudController.createBrand);
router.put('/:id', validate(updateBrandSchema), CrudController.updateBrand);
router.patch('/:id', validate(updateBrandSchema), CrudController.updateBrand);
router.delete('/:id', CrudController.deleteBrand);

export default router;
