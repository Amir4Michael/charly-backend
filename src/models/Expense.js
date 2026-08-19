import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * Expense — مصاريف مستقلة تُضاف مباشرة من صفحة المصاريف (ExpensesPage.jsx)، منفصلة عن
 * expenses المُضمّنة داخل DailyReport. الصفحة تجمع الاثنين معًا للعرض والإجماليات،
 * لكنهما مصدرا بيانات مختلفان (matching الفرونت الحالي بالضبط — لا دمج بينهما في DB).
 */
const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },
    category: { type: String, trim: true, default: '' },
    type: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    entity: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

expenseSchema.index({ date: -1 }, { name: 'expense_date_desc' });

export default mongoose.model('Expense', expenseSchema);
