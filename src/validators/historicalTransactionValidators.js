import { body, param } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const entityIdParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const txIdParamValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  param('txId').isMongoId().withMessage('معرّف المعاملة غير صالح'),
];

export const createHistoricalTransactionValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  body('amount').isFloat({ min: 0 }).withMessage('المبلغ يجب أن يكون رقمًا موجبًا'),
  body('direction').isIn(['له', 'عليه']).withMessage('يجب تحديد هل العملية له أو عليه'),
  body('type').optional({ checkFalsy: true }).isString(),
  body('unitPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقمًا موجبًا'),
  body('description').optional({ checkFalsy: true }).isString(),
];

export const updateHistoricalTransactionValidator = [
  ...txIdParamValidator,
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  body('amount').isFloat({ min: 0 }).withMessage('المبلغ يجب أن يكون رقمًا موجبًا'),
  body('direction').isIn(['له', 'عليه']).withMessage('يجب تحديد هل العملية له أو عليه'),
  body('type').optional({ checkFalsy: true }).isString(),
  body('unitPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقمًا موجبًا'),
  body('description').optional({ checkFalsy: true }).isString(),
];
