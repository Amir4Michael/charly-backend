import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as expenseService from '../services/expenseService.js';

export const getExpenses = asyncHandler(async (req, res) => {
  const { from, to, category } = req.query;
  const expenses = await expenseService.listExpenses({ from, to, category });
  sendSuccess(res, { data: expenses });
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user.id);
  sendSuccess(res, { status: 201, data: expense, message: 'تم إضافة المصروف' });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id);
  sendSuccess(res, { message: 'تم حذف المصروف' });
});
