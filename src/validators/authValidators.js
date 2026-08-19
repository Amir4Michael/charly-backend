import { body } from 'express-validator';

export const loginValidator = [
  body('username').trim().notEmpty().withMessage('اسم المستخدم مطلوب'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('كلمة المرور الحالية مطلوبة'),
  body('newPassword').isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'),
];
