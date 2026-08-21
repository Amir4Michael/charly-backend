import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * HistoricalTransaction — معاملات/حسابات قديمة كانت مسجّلة في الدفاتر الورقية قبل استخدام
 * النظام، ويتم إدخالها الآن يدويًا مرة واحدة من صفحة تفاصيل العميل/القلاب/الكسارة.
 *
 * هذا النموذج مختلف تمامًا عن Price History: هو ليس سعرًا فقط، بل عملية مالية كاملة
 * (تاريخ + مبلغ + نوع + اتجاه "له/عليه" + وصف)، ويدخل فعليًا في حساب الرصيد النهائي
 * لهذا العميل/القلاب/الكسارة عبر statementService.js (وليس مجرد نص منفصل للعرض).
 *
 * entityType/entityId: نفس نمط الربط بمعرّف حقيقي المستخدم في باقي النظام (customerId,
 * truckId, quarryId...)، بدل موديل منفصل لكل كيان — لتفادي تكرار نفس الحقول 3 أو 4 مرات.
 *
 * direction:
 *  - 'له'   → المبلغ لصالح العميل/القلاب/الكسارة (مثال: دفعة دفعها العميل، أو مستحق للقلاب)
 *  - 'عليه' → المبلغ مستحق على العميل/القلاب/الكسارة (مثال: عملية بيع/توريد قديمة لم تُسدَّد)
 * هذا يطابق حساب المستحقات/المدفوعات الموجود بالفعل في النظام (loading.payment/remaining،
 * tippers.paid/remaining) لكن بصيغة عامة تصلح لأي قيد قديم من الدفتر.
 */
const historicalTransactionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['customer', 'truck', 'quarry', 'supplier'],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },

    type: { type: String, trim: true, default: '' }, // نوع العملية (نص حر، مثال: "بيع"، "دفعة"، "رصيد افتتاحي"...)
    amount: { type: Number, required: true, min: 0 },
    direction: { type: String, required: true, enum: ['له', 'عليه'] },

    // لو مرتبط بسعر معيّن وقت العملية (مطلوب رقم 10 في الطلب) — اختياري تمامًا
    unitPrice: { type: Number, min: 0 },

    description: { type: String, trim: true, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

historicalTransactionSchema.index({ entityType: 1, entityId: 1, date: 1 }, { name: 'entity_date_idx' });

export default mongoose.model('HistoricalTransaction', historicalTransactionSchema);
