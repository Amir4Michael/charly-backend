import { body, param, query } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createReportValidator = [
  body('date').matches(DATE_REGEX).withMessage('التاريخ مطلوب بصيغة YYYY-MM-DD'),
  body('managers').optional().isArray().withMessage('المديرون يجب أن تكون مصفوفة'),
  body('shifts').optional().isArray().withMessage('الورديات يجب أن تكون مصفوفة'),

  // ——— الخامة (صفوف متعددة: كسارة + قلاب لكل صف) ———
  body('materials').optional().isArray(),
  body('materials.*.weight').optional().isFloat({ min: 0 }).withMessage('وزن الخامة يجب أن يكون رقمًا موجبًا'),
  body('materials.*.materialUnitPrice')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('سعر الخامة يجب أن يكون رقمًا موجبًا'),
  body('materials.*.truckRate').optional().isFloat({ min: 0 }).withMessage('سعر النقلة يجب أن يكون رقمًا موجبًا'),
  body('materials.*.paid').optional().isFloat({ min: 0 }).withMessage('المدفوع للقلاب يجب أن يكون رقمًا موجبًا'),

  body('shiftTeams').optional().isArray(),
  body('shiftTeams.*.workers').optional().isArray(),
  body('shiftTeams.*.workers.*.hours').optional().isFloat({ min: 0 }).withMessage('ساعات العامل يجب أن تكون رقمًا موجبًا'),
  body('shiftTeams.*.workers.*.dailyAmount').optional().isFloat({ min: 0 }).withMessage('يومية العامل يجب أن تكون رقمًا موجبًا'),
  body('shiftTeams.*.workers.*.paid').optional().isFloat({ min: 0 }).withMessage('المدفوع للعامل يجب أن يكون رقمًا موجبًا'),

  body('loading').optional().isArray(),
  body('loading.*.weight').optional().isFloat({ min: 0 }).withMessage('وزن التحميل يجب أن يكون رقمًا موجبًا'),
  body('loading.*.price').optional().isFloat({ min: 0 }).withMessage('سعر التحميل يجب أن يكون رقمًا موجبًا'),
  body('loading.*.payment').optional().isIn(['نقدي', 'آجل', '']).withMessage('طريقة الدفع غير صالحة'),
  body('loading.*.driverName').optional({ checkFalsy: true }).isString(),
  body('loading.*.vehiclePlateNumber').optional({ checkFalsy: true }).isString(),
  body('loading.*.driverIdNumber').optional({ checkFalsy: true }).isString(),
  body('loading.*.vehicleType').optional({ checkFalsy: true }).isString(),

  body('expenses').optional().isArray(),
  body('expenses.*.amount').optional().isFloat({ min: 0 }).withMessage('مبلغ المصروف يجب أن يكون رقمًا موجبًا'),
];

export const updateReportValidator = [param('id').isMongoId().withMessage('معرّف غير صالح'), ...createReportValidator];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];

export const listReportsValidator = [
  query('from').optional().matches(DATE_REGEX).withMessage('from يجب أن يكون بصيغة YYYY-MM-DD'),
  query('to').optional().matches(DATE_REGEX).withMessage('to يجب أن يكون بصيغة YYYY-MM-DD'),
  query('page').optional().isInt({ min: 1 }).withMessage('page يجب أن يكون رقمًا صحيحًا موجبًا'),
  // الحد الأقصى 1000 (وليس 200) لأن صفحات الفرونت الحالية (Dashboard، التقارير، الحسابات...)
  // كلها تجلب كل التقارير دفعة واحدة وتُصفّي/تُجمّع محليًا (سلوك موروث من localStorage القديم،
  // ولا توجد صفحة تدعم Pagination فعليًا بعد) — رفع الحد هنا يحافظ على نفس السلوك دون كسره.
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit يجب أن يكون بين 1 و1000'),
];
