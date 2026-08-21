import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  typeParamValidator, idParamValidator, createSupplierValidator, updateSupplierValidator,
} from '../validators/supplierValidators.js';
import {
  entityIdParamValidator, txIdParamValidator, createHistoricalTransactionValidator, updateHistoricalTransactionValidator,
} from '../validators/historicalTransactionValidators.js';
import {
  listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} from '../controllers/supplierController.js';
import { createHistoricalTransactionController } from '../controllers/historicalTransactionController.js';

const router = Router();
const historical = createHistoricalTransactionController('supplier');

router.use(protect);

router.get('/:type', typeParamValidator, validate, listSuppliers);
router.get('/:type/:id', [...typeParamValidator, ...idParamValidator], validate, getSupplier);
router.post('/:type', authorize('admin'), [...typeParamValidator, ...createSupplierValidator], validate, createSupplier);
router.put('/:type/:id', authorize('admin'), [...typeParamValidator, ...idParamValidator, ...updateSupplierValidator], validate, updateSupplier);
router.delete('/:type/:id', authorize('admin'), [...typeParamValidator, ...idParamValidator], validate, deleteSupplier);

// ——— معاملات قديمة اختيارية للمورد (فارغة افتراضيًا — لا نخترع أي رصيد، فقط ما يُدخله المستخدم فعليًا) ———
router.get('/:type/:id/historical-transactions', [...typeParamValidator, ...entityIdParamValidator], validate, historical.list);
router.post('/:type/:id/historical-transactions', authorize('admin'), [...typeParamValidator, ...createHistoricalTransactionValidator], validate, historical.create);
router.put('/:type/:id/historical-transactions/:txId', authorize('admin'), [...typeParamValidator, ...updateHistoricalTransactionValidator], validate, historical.update);
router.delete('/:type/:id/historical-transactions/:txId', authorize('admin'), [...typeParamValidator, ...txIdParamValidator], validate, historical.remove);

export default router;
