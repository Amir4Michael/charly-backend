import { body, param, query } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createExpenseValidator = [
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  body('type').trim().notEmpty().withMessage('نوع/اسم المصروف مطلوب'),
  body('amount').isFloat({ min: 0 }).withMessage('المبلغ يجب أن يكون رقمًا موجبًا'),
  body('category').optional({ checkFalsy: true }).isString(),
  body('entity').optional({ checkFalsy: true }).isString(),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const listExpensesValidator = [
  query('from').optional().matches(DATE_REGEX).withMessage('from يجب أن يكون بصيغة YYYY-MM-DD'),
  query('to').optional().matches(DATE_REGEX).withMessage('to يجب أن يكون بصيغة YYYY-MM-DD'),
];
