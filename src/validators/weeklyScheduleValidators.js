import { body, query } from 'express-validator';
import { WEEK_DAYS } from '../models/WeeklySchedule.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getWeeklyScheduleValidator = [
  query('weekStart').matches(DATE_REGEX).withMessage('weekStart مطلوب بصيغة YYYY-MM-DD'),
];

export const saveWeeklyScheduleValidator = [
  body('weekStart').matches(DATE_REGEX).withMessage('weekStart مطلوب بصيغة YYYY-MM-DD'),
  body('rows').isArray({ min: 1 }).withMessage('rows يجب أن تكون مصفوفة غير فارغة'),
  body('rows.*.day').isIn(WEEK_DAYS).withMessage('اسم اليوم غير صالح'),
  body('rows.*.shifts').isArray({ min: 3, max: 3 }).withMessage('كل يوم يجب أن يحتوي على 3 خانات وردية بالضبط'),
];
