import GeneralSale from '../models/GeneralSale.js';
import { ApiError } from '../utils/apiResponse.js';

export async function listGeneralSales({ from, to } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return GeneralSale.find(filter).sort({ date: -1, createdAt: -1 });
}

export async function createGeneralSale(data, userId) {
  return GeneralSale.create({
    date: data.date,
    amount: data.amount,
    description: data.description || '',
    createdBy: userId,
  });
}

export async function deleteGeneralSale(id) {
  const doc = await GeneralSale.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'المبيعات العامة غير موجودة');
  return doc;
}

/** إجمالي المبيعات العامة — يُستخدم من accountsService لدمجه في إجمالي مبيعات المصنع الكلي */
export async function getGeneralSalesTotal() {
  const [result] = await GeneralSale.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
  return result?.total || 0;
}
