import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createGeneralSaleValidator, idParamValidator, listGeneralSalesValidator } from '../validators/generalSaleValidators.js';
import { getGeneralSales, createGeneralSale, deleteGeneralSale } from '../controllers/generalSaleController.js';

const router = Router();

router.use(protect); // القراءة لكل الأدوار، الكتابة للـadmin فقط (يطابق باقي المسارات المالية)

router.get('/', listGeneralSalesValidator, validate, getGeneralSales);
router.post('/', authorize('admin'), createGeneralSaleValidator, validate, createGeneralSale);
router.delete('/:id', authorize('admin'), idParamValidator, validate, deleteGeneralSale);

export default router;
