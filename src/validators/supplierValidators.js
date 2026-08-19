import { body, param } from 'express-validator';
import { SUPPLIER_TYPES } from '../models/Supplier.js';

export const typeParamValidator = [
  param('type').isIn(SUPPLIER_TYPES).withMessage(`نوع المورد يجب أن يكون أحد: ${SUPPLIER_TYPES.join(', ')}`),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const createSupplierValidator = [
  body('name').trim().notEmpty().withMessage('اسم المورد مطلوب'),
  body('contactPerson').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const updateSupplierValidator = [
  body('name').optional().trim().notEmpty().withMessage('اسم المورد لا يمكن أن يكون فارغًا'),
  body('contactPerson').optional({ checkFalsy: true }).isString(),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('address').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];
