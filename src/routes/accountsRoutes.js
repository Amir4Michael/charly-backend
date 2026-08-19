import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getOverview } from '../controllers/accountsController.js';

const router = Router();

router.use(protect); // admin + viewer (عرض فقط، يطابق AccountsPage.jsx المتاحة لكل الأدوار)

router.get('/overview', getOverview);

export default router;
