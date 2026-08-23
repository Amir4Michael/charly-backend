import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as historicalTransactionService from '../services/historicalTransactionService.js';

/**
 * كونترولر واحد يُركَّب على كل كيان (عميل/قلاب/كسارة/مورد) بتمرير entityType،
 * بدل تكرار نفس منطق الـCRUD أربع مرات — راجع routes/customerRoutes.js إلخ لكيفية التركيب.
 */
export function createHistoricalTransactionController(entityType) {
  return {
    list: asyncHandler(async (req, res) => {
      const items = await historicalTransactionService.listForEntity(entityType, req.params.id);
      sendSuccess(res, { data: items });
    }),

    create: asyncHandler(async (req, res) => {
      const item = await historicalTransactionService.createTransaction(entityType, req.params.id, req.body, req.user.id);
      sendSuccess(res, { status: 201, data: item, message: 'تمت إضافة العملية بنجاح' });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await historicalTransactionService.updateTransaction(entityType, req.params.id, req.params.txId, req.body, req.user.id);
      sendSuccess(res, { data: item, message: 'تم تحديث العملية بنجاح' });
    }),

    remove: asyncHandler(async (req, res) => {
      await historicalTransactionService.deleteTransaction(entityType, req.params.id, req.params.txId);
      sendSuccess(res, { message: 'تم حذف العملية بنجاح' });
    }),

    addPayment: asyncHandler(async (req, res) => {
      const item = await historicalTransactionService.addPayment(entityType, req.params.id, req.params.txId, req.body, req.user.id);
      sendSuccess(res, { status: 201, data: item, message: 'تمت إضافة الدفعة بنجاح' });
    }),

    removePayment: asyncHandler(async (req, res) => {
      const item = await historicalTransactionService.removePayment(entityType, req.params.id, req.params.txId, req.params.paymentId, req.user.id);
      sendSuccess(res, { data: item, message: 'تم حذف الدفعة' });
    }),
  };
}