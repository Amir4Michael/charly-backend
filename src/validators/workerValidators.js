import { body, param } from 'express-validator';
import { WORKER_JOBS } from '../models/Worker.js';

export const createWorkerValidator = [
  body('name').trim().notEmpty().withMessage('اسم العامل مطلوب'),
  body('job').optional({ checkFalsy: true }).isIn(WORKER_JOBS).withMessage('الوظيفة غير صالحة'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('dailyRate').optional().isFloat({ min: 0 }).withMessage('اليومية يجب أن تكون رقمًا موجبًا'),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const updateWorkerValidator = [
  param('id').isMongoId().withMessage('معرّف غير صالح'),
  body('name').optional().trim().notEmpty().withMessage('اسم العامل لا يمكن أن يكون فارغًا'),
  body('job').optional({ checkFalsy: true }).isIn(WORKER_JOBS).withMessage('الوظيفة غير صالحة'),
  body('phone').optional({ checkFalsy: true }).isString(),
  body('dailyRate').optional().isFloat({ min: 0 }).withMessage('اليومية يجب أن تكون رقمًا موجبًا'),
  body('notes').optional({ checkFalsy: true }).isString(),
];

export const idParamValidator = [param('id').isMongoId().withMessage('معرّف غير صالح')];
