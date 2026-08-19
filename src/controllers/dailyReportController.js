import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as dailyReportService from '../services/dailyReportService.js';

export const listReports = asyncHandler(async (req, res) => {
  const { from, to, page, limit } = req.query;
  const { items, total, page: p, limit: l } = await dailyReportService.listReports({ from, to, page, limit });
  sendSuccess(res, { data: items, meta: { total, page: p, limit: l } });
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await dailyReportService.getReportById(req.params.id);
  sendSuccess(res, { data: report });
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await dailyReportService.createReport(req.body, req.user.id);
  sendSuccess(res, { status: 201, data: report, message: 'تم حفظ التقرير اليومي بنجاح' });
});

export const updateReport = asyncHandler(async (req, res) => {
  const report = await dailyReportService.updateReport(req.params.id, req.body, req.user.id);
  sendSuccess(res, { data: report, message: 'تم تحديث التقرير اليومي بنجاح' });
});

export const deleteReport = asyncHandler(async (req, res) => {
  await dailyReportService.deleteReport(req.params.id);
  sendSuccess(res, { message: 'تم حذف التقرير اليومي بنجاح' });
});
