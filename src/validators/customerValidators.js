import { body, param } from 'express-validator';

export const createCustomerValidator = [
  body('name').trim().notEmpty().withMessage('اسم العميل مطلوب'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('contactPerson').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const updateCustomerValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('name').optional().trim().notEmpty().withMessage('اسم العميل لا يمكن أن يكون فارغًا'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('contactPerson').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];
