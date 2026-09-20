import { body, param, query } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createCashAdjustmentValidator = [
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  // بعكس المبيعات العامة: المبلغ هنا يمكن أن يكون سالبًا (سحب من الصندوق)، فقط لا يجوز أن
  // يكون صفرًا (لا معنى لتعديل بقيمة صفر).
  body('amount')
    .isFloat().withMessage('المبلغ يجب أن يكون رقمًا')
    .custom((v) => Number(v) !== 0).withMessage('المبلغ يجب ألا يساوي صفر'),
  body('note').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const listCashAdjustmentsValidator = [
  query('from').optional().matches(DATE_REGEX).withMessage('from يجب أن يكون بصيغة YYYY-MM-DD'),
  query('to').optional().matches(DATE_REGEX).withMessage('to يجب أن يكون بصيغة YYYY-MM-DD'),
];
