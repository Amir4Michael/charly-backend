import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createUserValidator, updateUserValidator, idParamValidator } from '../validators/userValidators.js';
import {
  getUsers, createUser, updateUser, deleteUser, toggleUserStatus,
} from '../controllers/userController.js';

const router = Router();

router.use(protect); // كل مسارات المستخدمين تحتاج تسجيل دخول على الأقل

router.get('/', getUsers); // القراءة متاحة لـ admin و viewer (تطابق عرض جدول المستخدمين في UsersPage.jsx لكل الأدوار)
router.post('/', authorize('admin'), createUserValidator, validate, createUser);
router.put('/:id', authorize('admin'), updateUserValidator, validate, updateUser);
router.delete('/:id', authorize('admin'), idParamValidator, validate, deleteUser);
router.patch('/:id/toggle-status', authorize('admin'), idParamValidator, validate, toggleUserStatus);

export default router;
