import CashAdjustment from '../models/CashAdjustment.js';
import { ApiError } from '../utils/apiResponse.js';

export async function listCashAdjustments({ from, to } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return CashAdjustment.find(filter).sort({ date: -1, createdAt: -1 });
}

export async function createCashAdjustment(data, userId) {
  return CashAdjustment.create({
    date: data.date,
    amount: data.amount,
    note: data.note || '',
    createdBy: userId,
  });
}

export async function deleteCashAdjustment(id) {
  const doc = await CashAdjustment.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'تعديل الصندوق غير موجود');
  return doc;
}

/** إجمالي كل التعديلات اليدوية — يُستخدم من accountsService لدمجه في صندوق المصنع مباشرة */
export async function getCashAdjustmentsTotal() {
  const [result] = await CashAdjustment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  return result?.total || 0;
}
