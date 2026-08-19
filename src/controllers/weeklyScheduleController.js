import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as weeklyScheduleService from '../services/weeklyScheduleService.js';

export const getWeeklySchedule = asyncHandler(async (req, res) => {
  const schedule = await weeklyScheduleService.getWeeklySchedule(req.query.weekStart);
  sendSuccess(res, { data: schedule });
});

export const saveWeeklySchedule = asyncHandler(async (req, res) => {
  const { weekStart, rows } = req.body;
  const schedule = await weeklyScheduleService.saveWeeklySchedule(weekStart, rows, req.user.id);
  sendSuccess(res, { data: schedule, message: 'تم حفظ الجدول الأسبوعي بنجاح' });
});
