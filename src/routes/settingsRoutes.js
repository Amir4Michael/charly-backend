import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsValidator } from '../validators/settingsValidators.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('admin'), updateSettingsValidator, validate, updateSettings);

export default router;
