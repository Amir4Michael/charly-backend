import { body } from 'express-validator';

export const updateSettingsValidator = [
  body('factoryName').optional().trim().notEmpty().withMessage('اسم المصنع لا يمكن أن يكون فارغًا'),
  body('address').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('email').optional({ checkFalsy: true }).isString(),
  body('taxNumber').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];
