import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * CashAdjustment — تعديل يدوي على صندوق المصنع (رصيد افتتاحي، أو إيداع/سحب مباشر من صاحب
 * المصنع، بدون أي علاقة ببيع أو مصروف أو عميل أو مورد).
 *
 * الفرق الجوهري عن GeneralSale: هذه ليست "مبيعات" إطلاقًا، فلا تدخل في totalSales أو تقارير
 * المبيعات — هدفها الوحيد إضافة/خصم مبلغ من صندوق المصنع مباشرة (accountsService.cashBox)،
 * مع الاحتفاظ بسجل بمن فعل ذلك ومتى ولماذا (note). amount يمكن أن يكون موجبًا (إيداع/رصيد
 * افتتاحي) أو سالبًا (سحب) — بعكس GeneralSale الذي لا يقبل إلا قيمة موجبة (لأنه دائمًا "بيع").
 */
const cashAdjustmentSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },
    amount: { type: Number, required: true }, // بدون min — يجب أن يقبل قيمًا سالبة (سحب)
    note: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

cashAdjustmentSchema.index({ date: -1 }, { name: 'cash_adjustment_date_desc' });

export default mongoose.model('CashAdjustment', cashAdjustmentSchema);
