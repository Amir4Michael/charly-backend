import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * GeneralSale — "مبيعات عامة" تُضاف من صفحة العملاء الرئيسية (قبل اختيار أي عميل)، وليست
 * خاصة بعميل معين (مثال: مبيعات قديمة غير مسجلة، بيع نقدي عابر بدون عميل محدد).
 *
 * قرار تصميم: Model مستقل بدل استخدام HistoricalTransaction (entityType/entityId) لأن هذه
 * القيمة أصلًا "بلا كيان" — لا customerId ولا أي ربط — فإجبارها على نمط entityType/entityId
 * كان سيحتاج قيمة entityId وهمية. هي تدخل فقط في إجمالي مبيعات المصنع الكلي (accountsService)
 * ولا تُحسب أبدًا ضمن حساب أي عميل — هذا هو الفرق الجوهري عن HistoricalTransaction.
 */
const generalSaleSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

generalSaleSchema.index({ date: -1 }, { name: 'general_sale_date_desc' });

export default mongoose.model('GeneralSale', generalSaleSchema);
