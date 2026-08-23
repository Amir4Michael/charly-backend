import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createWorkerValidator, updateWorkerValidator, idParamValidator } from '../validators/workerValidators.js';
import {
  entityIdParamValidator, txIdParamValidator, createHistoricalTransactionValidator, updateHistoricalTransactionValidator,
  addPaymentValidator, paymentIdParamValidator,
} from '../validators/historicalTransactionValidators.js';
import controller from '../controllers/workerController.js';
import { createHistoricalTransactionController } from '../controllers/historicalTransactionController.js';

const router = Router();
const historical = createHistoricalTransactionController('worker');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createWorkerValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateWorkerValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

// ——— عمليات قديمة (مبلغ + تاريخ + دفعات متعددة) خاصة بهذا العامل ———
router.get('/:id/historical-transactions', entityIdParamValidator, validate, historical.list);
router.post('/:id/historical-transactions', authorize('admin'), createHistoricalTransactionValidator, validate, historical.create);
router.put('/:id/historical-transactions/:txId', authorize('admin'), updateHistoricalTransactionValidator, validate, historical.update);
router.delete('/:id/historical-transactions/:txId', authorize('admin'), txIdParamValidator, validate, historical.remove);

router.post('/:id/historical-transactions/:txId/payments', authorize('admin'), addPaymentValidator, validate, historical.addPayment);
router.delete('/:id/historical-transactions/:txId/payments/:paymentId', authorize('admin'), paymentIdParamValidator, validate, historical.removePayment);

export default router;