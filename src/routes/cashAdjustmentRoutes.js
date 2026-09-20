import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createCashAdjustmentValidator, idParamValidator, listCashAdjustmentsValidator } from '../validators/cashAdjustmentValidators.js';
import { getCashAdjustments, createCashAdjustment, deleteCashAdjustment } from '../controllers/cashAdjustmentController.js';

const router = Router();

router.use(protect); // القراءة لكل الأدوار، الكتابة للـadmin فقط (يطابق باقي المسارات المالية)

router.get('/', listCashAdjustmentsValidator, validate, getCashAdjustments);
router.post('/', authorize('admin'), createCashAdjustmentValidator, validate, createCashAdjustment);
router.delete('/:id', authorize('admin'), idParamValidator, validate, deleteCashAdjustment);

export default router;
