import { body, param } from 'express-validator';

export const createUserValidator = [
  body('name').trim().notEmpty().withMessage('اسم المستخدم مطلوب'),
  body('username').trim().notEmpty().withMessage('اسم الدخول (username) مطلوب')
    .isLength({ min: 3 }).withMessage('اسم الدخول يجب أن يكون 3 أحرف على الأقل')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('اسم الدخول يجب أن يحتوي على حروف إنجليزية وأرقام فقط'),
  body('password').optional().isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('role').isIn(['admin', 'viewer']).withMessage('الصلاحية يجب أن تكون admin أو viewer'),
  body('phone').optional({ checkFalsy: true }).isString(),
];

export const updateUserValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('name').optional().trim().notEmpty().withMessage('اسم المستخدم لا يمكن أن يكون فارغًا'),
  body('role').optional().isIn(['admin', 'viewer']).withMessage('الصلاحية يجب أن تكون admin أو viewer'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('active').optional().isBoolean(),
  body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];
