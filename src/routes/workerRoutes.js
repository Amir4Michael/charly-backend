import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createWorkerValidator, updateWorkerValidator, idParamValidator } from '../validators/workerValidators.js';
import controller from '../controllers/workerController.js';

const router = Router();

router.use(protect);

router.get('/', controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.get('/:id/statement', idParamValidator, validate, controller.statement);
router.post('/', authorize('admin'), createWorkerValidator, validate, controller.create);
router.put('/:id', authorize('admin'), updateWorkerValidator, validate, controller.update);
router.delete('/:id', authorize('admin'), idParamValidator, validate, controller.remove);

export default router;
