import { Router } from 'express';
import { loginLimiter } from '../middleware/rateLimiters.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loginValidator, changePasswordValidator } from '../validators/authValidators.js';
import {
  getLoginCandidates, loginController, refreshController, logoutController, meController, changePasswordController,
} from '../controllers/authController.js';

const router = Router();

router.get('/login-users', getLoginCandidates);
router.post('/login', loginLimiter, loginValidator, validate, loginController);
router.post('/refresh', refreshController);
router.post('/logout', logoutController);
router.get('/me', protect, meController);
router.patch('/change-password', protect, changePasswordValidator, validate, changePasswordController);

export default router;
