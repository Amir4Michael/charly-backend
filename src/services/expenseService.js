import Expense from '../models/Expense.js';
import { ApiError } from '../utils/apiResponse.js';

export async function listExpenses({ from, to, category } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  if (category) filter.category = category;
  return Expense.find(filter).sort({ date: -1, createdAt: -1 });
}

export async function createExpense(data, userId) {
  return Expense.create({ ...data, createdBy: userId });
}

export async function deleteExpense(id) {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) throw new ApiError(404, 'المصروف غير موجود');
  return expense;
}
