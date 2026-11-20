import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const router = Router();

router.post('/reset-demo', AdminController.resetDemo);

export default router;
