import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as generalSaleService from '../services/generalSaleService.js';

export const getGeneralSales = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const sales = await generalSaleService.listGeneralSales({ from, to });
  sendSuccess(res, { data: sales });
});

export const createGeneralSale = asyncHandler(async (req, res) => {
  const sale = await generalSaleService.createGeneralSale(req.body, req.user.id);
  sendSuccess(res, { status: 201, data: sale, message: 'تمت إضافة المبيعات العامة بنجاح' });
});

export const deleteGeneralSale = asyncHandler(async (req, res) => {
  await generalSaleService.deleteGeneralSale(req.params.id);
  sendSuccess(res, { message: 'تم حذف المبيعات العامة' });
});
