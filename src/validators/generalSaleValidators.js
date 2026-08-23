import { body, param, query } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createGeneralSaleValidator = [
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  body('amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون رقمًا أكبر من صفر'),
  body('description').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const listGeneralSalesValidator = [
  query('from').optional().matches(DATE_REGEX).withMessage('from يجب أن يكون بصيغة YYYY-MM-DD'),
  query('to').optional().matches(DATE_REGEX).withMessage('to يجب أن يكون بصيغة YYYY-MM-DD'),
];
