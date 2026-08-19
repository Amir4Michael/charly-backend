import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { getWeeklyScheduleValidator, saveWeeklyScheduleValidator } from '../validators/weeklyScheduleValidators.js';
import { getWeeklySchedule, saveWeeklySchedule } from '../controllers/weeklyScheduleController.js';

const router = Router();

router.use(protect);

router.get('/', getWeeklyScheduleValidator, validate, getWeeklySchedule);
router.put('/', authorize('admin'), saveWeeklyScheduleValidator, validate, saveWeeklySchedule);

export default router;
