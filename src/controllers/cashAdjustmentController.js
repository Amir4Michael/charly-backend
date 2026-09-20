import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as cashAdjustmentService from '../services/cashAdjustmentService.js';

export const getCashAdjustments = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const items = await cashAdjustmentService.listCashAdjustments({ from, to });
  sendSuccess(res, { data: items });
});

export const createCashAdjustment = asyncHandler(async (req, res) => {
  const item = await cashAdjustmentService.createCashAdjustment(req.body, req.user.id);
  sendSuccess(res, { status: 201, data: item, message: 'تم تسجيل تعديل الصندوق بنجاح' });
});

export const deleteCashAdjustment = asyncHandler(async (req, res) => {
  await cashAdjustmentService.deleteCashAdjustment(req.params.id);
  sendSuccess(res, { message: 'تم حذف تعديل الصندوق' });
});
