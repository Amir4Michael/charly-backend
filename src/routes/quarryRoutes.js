import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createQuarryValidator, updateQuarryValidator, idParamValidator } from '../validators/quarryValidators.js';
import {
  entityIdParamValidator, txIdParamValidator, createHistoricalTransactionValidator, updateHistoricalTransactionValidator,
} from '../validators/historicalTransactionValidators.js';
import controller from '../controllers/quarryController.js';
import { createHistoricalTransactionController } from '../controllers/historicalTransactionController.js';

const router = Router();
const historical = createHistoricalTransactionController('quarry');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createQuarryValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateQuarryValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

// ——— المعاملات القديمة للدفعات ———
router.get('/:id/historical-transactions', entityIdParamValidator, validate, historical.list);
router.post('/:id/historical-transactions', authorize('admin'), createHistoricalTransactionValidator, validate, historical.create);
router.put('/:id/historical-transactions/:txId', authorize('admin'), updateHistoricalTransactionValidator, validate, historical.update);
router.delete('/:id/historical-transactions/:txId', authorize('admin'), txIdParamValidator, validate, historical.remove);

// ——— الدفعات على المعاملات القديمة ———
router.post('/:id/historical-transactions/:txId/payments', authorize('admin'), historical.addPayment);
router.delete('/:id/historical-transactions/:txId/payments/:paymentId', authorize('admin'), historical.removePayment);

export default router;