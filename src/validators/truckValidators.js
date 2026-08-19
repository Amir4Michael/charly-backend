import { body, param } from 'express-validator';

export const createTruckValidator = [
  body('name').trim().notEmpty().withMessage('اسم القلاب مطلوب'),
  body('driver').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('plateNumber').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const updateTruckValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('name').optional().trim().notEmpty().withMessage('اسم القلاب لا يمكن أن يكون فارغًا'),
  body('driver').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('plateNumber').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];
