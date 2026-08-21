import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createTruckValidator, updateTruckValidator, idParamValidator } from '../validators/truckValidators.js';
import {
  entityIdParamValidator, txIdParamValidator, createHistoricalTransactionValidator, updateHistoricalTransactionValidator,
} from '../validators/historicalTransactionValidators.js';
import controller from '../controllers/truckController.js';
import { createHistoricalTransactionController } from '../controllers/historicalTransactionController.js';

const router = Router();
const historical = createHistoricalTransactionController('truck');

router.use(protect);

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createTruckValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateTruckValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

router.get('/:id/historical-transactions', entityIdParamValidator, validate, historical.list);
router.post('/:id/historical-transactions', authorize('admin'), createHistoricalTransactionValidator, validate, historical.create);
router.put('/:id/historical-transactions/:txId', authorize('admin'), updateHistoricalTransactionValidator, validate, historical.update);
router.delete('/:id/historical-transactions/:txId', authorize('admin'), txIdParamValidator, validate, historical.remove);

export default router;
