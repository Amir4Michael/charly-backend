import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as materialOptionService from '../services/materialOptionService.js';

export const getMaterials = asyncHandler(async (req, res) => {
  const data = await materialOptionService.getMaterials();
  sendSuccess(res, { data });
});

export const addMaterialOption = asyncHandler(async (req, res) => {
  const { category, value } = req.body;
  const { option, created } = await materialOptionService.addOption(category, value);
  sendSuccess(res, {
    status: created ? 201 : 200,
    data: option,
    message: created ? 'تمت الإضافة بنجاح' : 'القيمة موجودة بالفعل',
  });
});

export const removeMaterialOption = asyncHandler(async (req, res) => {
  const { category, value } = req.params;
  await materialOptionService.removeOption(category, decodeURIComponent(value));
  sendSuccess(res, { message: 'تم الحذف بنجاح' });
});

export const getInventoryReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await materialOptionService.getInventoryReport({ from, to });
  sendSuccess(res, { data });
});
