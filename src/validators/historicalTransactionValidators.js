import { body, param } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const entityIdParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const txIdParamValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  param('txId').isMongoId().withMessage('معرّف المعاملة غير صالح'),
];

// ملاحظة: لم يعد هناك حقل "direction" — الاتجاه (له/عليه) أصبح ثابتًا حسب نوع الكيان
// ويُشتق تلقائيًا في historicalTransactionService، ولا يُقرأ من الطلب مطلقًا بعد الآن.
// amount اختياري هنا لأن العميل يُحسَب تلقائيًا (quantity × unitPrice) في الخدمة.
const sharedHistoricalTransactionFields = [
  body('date').matches(DATE_REGEX).withMessage('تاريخ الاستلام مطلوب بصيغة YYYY-MM-DD'),
  body('amount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('المبلغ يجب أن يكون رقمًا موجبًا'),
  body('type').optional({ checkFalsy: true }).isString(),
  body('unitPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('السعر يجب أن يكون رقمًا موجبًا'),
  body('quantity').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('الكمية يجب أن تكون رقمًا موجبًا'),
  body('unit').optional({ checkFalsy: true }).isIn(['طن', 'كيلو']).withMessage('الوحدة يجب أن تكون طن أو كيلو'),
  body('dueDate').optional({ checkFalsy: true }).matches(DATE_REGEX).withMessage('تاريخ الاستحقاق يجب أن يكون بصيغة YYYY-MM-DD'),
  body('description').optional({ checkFalsy: true }).isString(),
  body('payments').optional().isArray().withMessage('الدفعات يجب أن تكون قائمة'),
  body('payments.*.date').optional().matches(DATE_REGEX).withMessage('تاريخ الدفعة يجب أن يكون بصيغة YYYY-MM-DD'),
  body('payments.*.amount').optional().isFloat({ min: 0.01 }).withMessage('مبلغ الدفعة يجب أن يكون رقمًا أكبر من صفر'),
  body('payments.*.note').optional({ checkFalsy: true }).isString(),
];

export const createHistoricalTransactionValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  ...sharedHistoricalTransactionFields,
];

export const updateHistoricalTransactionValidator = [
  ...txIdParamValidator,
  ...sharedHistoricalTransactionFields,
];

export const addPaymentValidator = [
  ...txIdParamValidator,
  body('date').matches(DATE_REGEX).withMessage('تاريخ الدفعة مطلوب بصيغة YYYY-MM-DD'),
  body('amount').isFloat({ min: 0.01 }).withMessage('مبلغ الدفعة يجب أن يكون رقمًا أكبر من صفر'),
  body('note').optional({ checkFalsy: true }).isString(),
];

export const paymentIdParamValidator = [
  ...txIdParamValidator,
  param('paymentId').isMongoId().withMessage('معرّف الدفعة غير صالح'),
];