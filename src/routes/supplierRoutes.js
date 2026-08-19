import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  typeParamValidator, idParamValidator, createSupplierValidator, updateSupplierValidator,
} from '../validators/supplierValidators.js';
import {
  listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
} from '../controllers/supplierController.js';

const router = Router();

router.use(protect);

router.get('/:type', typeParamValidator, validate, listSuppliers);
router.get('/:type/:id', [...typeParamValidator, ...idParamValidator], validate, getSupplier);
router.post('/:type', authorize('admin'), [...typeParamValidator, ...createSupplierValidator], validate, createSupplier);
router.put('/:type/:id', authorize('admin'), [...typeParamValidator, ...idParamValidator, ...updateSupplierValidator], validate, updateSupplier);
router.delete('/:type/:id', authorize('admin'), [...typeParamValidator, ...idParamValidator], validate, deleteSupplier);

export default router;
