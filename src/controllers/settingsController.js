import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as settingsService from '../services/settingsService.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, { data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  sendSuccess(res, { data: settings, message: 'تم حفظ الإعدادات بنجاح' });
});
