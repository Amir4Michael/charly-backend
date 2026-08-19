import { body, param } from 'express-validator';

export const createQuarryValidator = [
  body('name').trim().notEmpty().withMessage('اسم الكسارة مطلوب'),
  body('owner').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const updateQuarryValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('name').optional().trim().notEmpty().withMessage('اسم الكسارة لا يمكن أن يكون فارغًا'),
  body('owner').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];
