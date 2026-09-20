import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createCustomerValidator, updateCustomerValidator, idParamValidator } from '../validators/customerValidators.js';
import {
  entityIdParamValidator, txIdParamValidator, createHistoricalTransactionValidator, updateHistoricalTransactionValidator,
  addPaymentValidator, paymentIdParamValidator,
} from '../validators/historicalTransactionValidators.js';
import controller from '../controllers/customerController.js';
import { createHistoricalTransactionController } from '../controllers/historicalTransactionController.js';

const router = Router();
const historical = createHistoricalTransactionController('customer');

router.use(protect); // القراءة متاحة لـ admin و viewer، الكتابة للـadmin فقط

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createCustomerValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateCustomerValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

// ——— المعاملات القديمة (من الدفاتر الورقية) الخاصة بهذا العميل ———
router.get('/:id/historical-transactions', entityIdParamValidator, validate, historical.list);
router.post('/:id/historical-transactions', authorize('admin'), createHistoricalTransactionValidator, validate, historical.create);
router.put('/:id/historical-transactions/:txId', authorize('admin'), updateHistoricalTransactionValidator, validate, historical.update);
router.delete('/:id/historical-transactions/:txId', authorize('admin'), txIdParamValidator, validate, historical.remove);

// ——— الدفعات على المعاملات القديمة ———
router.post('/:id/historical-transactions/:txId/payments', authorize('admin'), addPaymentValidator, validate, historical.addPayment);
router.delete('/:id/historical-transactions/:txId/payments/:paymentId', authorize('admin'), paymentIdParamValidator, validate, historical.removePayment);

export default router;