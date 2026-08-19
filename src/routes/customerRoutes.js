import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createCustomerValidator, updateCustomerValidator, idParamValidator } from '../validators/customerValidators.js';
import controller from '../controllers/customerController.js';

const router = Router();

router.use(protect); // القراءة متاحة لـ admin و viewer، الكتابة للـadmin فقط

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createCustomerValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateCustomerValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

export default router;
