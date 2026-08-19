import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { addMaterialOptionValidator, removeMaterialOptionValidator } from '../validators/materialOptionValidators.js';
import { getMaterials, addMaterialOption, removeMaterialOption, getInventoryReport } from '../controllers/materialOptionController.js';

const router = Router();

router.use(protect);

router.get('/', getMaterials);
router.get('/inventory-report', getInventoryReport);
router.post('/', authorize('admin'), addMaterialOptionValidator, validate, addMaterialOption);
router.delete('/:category/:value', authorize('admin'), removeMaterialOptionValidator, validate, removeMaterialOption);

export default router;
