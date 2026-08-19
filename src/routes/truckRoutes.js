import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createTruckValidator, updateTruckValidator, idParamValidator } from '../validators/truckValidators.js';
import controller from '../controllers/truckController.js';

const router = Router();

router.use(protect);

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createTruckValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateTruckValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

export default router;
