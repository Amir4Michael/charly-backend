import mongoose from 'mongoose';
import HistoricalTransaction from '../models/HistoricalTransaction.js';
import { ApiError } from '../utils/apiResponse.js';

const ENTITY_TYPES = ['customer', 'truck', 'quarry', 'supplier', 'worker'];

// الاتجاه لم يعد يُختار من المستخدم إطلاقًا — ثابت حسب نوع الكيان (راجع تعليق الموديل).
const DIRECTION_BY_ENTITY_TYPE = {
  customer: 'عليه',
  truck: 'له',
  quarry: 'له',
  supplier: 'له',
  worker: 'له',
};

function assertEntityType(entityType) {
  if (!ENTITY_TYPES.includes(entityType)) {
    throw new ApiError(400, 'نوع الكيان غير صالح');
  }
}

function sanitizePayments(paymentsInput) {
  if (!Array.isArray(paymentsInput)) return undefined;
  return paymentsInput.map((p) => {
    if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
      throw new ApiError(400, 'تاريخ الدفعة مطلوب بصيغة صحيحة');
    }
    if (!(Number(p.amount) > 0)) {
      throw new ApiError(400, 'مبلغ الدفعة يجب أن يكون أكبر من صفر');
    }
    return { date: p.date, amount: Number(p.amount), note: p.note || '' };
  });
}

/**
 * يحوّل مُدخلات الطلب لحقول الحفظ الفعلية — نموذج موحّد واحد بدون أي اختيار "له/عليه":
 *
 * - customer: unitPrice إجباري، quantity اختيارية (تُضاف/تُعدَّل لاحقًا لنفس العملية بدون
 *   تكرار). amount = quantity × unitPrice يُحسب هنا دائمًا (أو 0 لحين معرفة الكمية).
 * - truck/quarry/supplier/worker: amount يُدخَل مباشرة من الطلب (لا يوجد سعر/كمية إطلاقًا).
 * - payments: مصفوفة دفعات اختيارية تُستبدل بالكامل بما يُرسَل (الفرونت يرسل القائمة كاملة
 *   في كل تحديث؛ راجع addPayment/removePayment أدناه للإضافة/الحذف الجزئي الآمن).
 */
function resolveTransactionFields(entityType, input) {
  const direction = DIRECTION_BY_ENTITY_TYPE[entityType];
  const base = {
    date: input.date,
    type: input.type || '',
    direction,
    dueDate: input.dueDate || undefined,
    description: input.description || '',
  };

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new ApiError(400, 'تاريخ الاستلام مطلوب بصيغة صحيحة');
  }

  if (entityType === 'customer') {
    const unitPrice = Number(input.unitPrice);
    if (!(unitPrice > 0)) {
      throw new ApiError(400, 'سعر الوحدة مطلوب ويجب أن يكون أكبر من صفر');
    }
    const hasQuantity = input.quantity !== undefined && input.quantity !== null && input.quantity !== '';
    const quantity = hasQuantity ? Number(input.quantity) : undefined;
    const amount = quantity !== undefined ? Math.round(quantity * unitPrice * 100) / 100 : 0;
    return {
      ...base,
      type: input.type || 'بيع',
      amount,
      unitPrice,
      quantity,
      unit: input.unit || 'طن',
    };
  }

  // truck/quarry/supplier/worker: فقط المبلغ والتاريخ (لا سعر ولا كمية)
  if (!(Number(input.amount) > 0)) {
    throw new ApiError(400, 'المبلغ مطلوب ويجب أن يكون أكبر من صفر');
  }
  return {
    ...base,
    amount: Number(input.amount),
    unitPrice: undefined,
    quantity: undefined,
    unit: undefined,
  };
}

export async function listForEntity(entityType, entityId) {
  assertEntityType(entityType);
  return HistoricalTransaction.find({ entityType, entityId }).sort({ date: 1, createdAt: 1 });
}

export async function createTransaction(entityType, entityId, input, userId) {
  assertEntityType(entityType);
  const fields = resolveTransactionFields(entityType, input);
  const payments = sanitizePayments(input.payments) || [];
  return HistoricalTransaction.create({
    entityType,
    entityId,
    ...fields,
    payments,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function updateTransaction(entityType, entityId, id, input, userId) {
  assertEntityType(entityType);
  const fields = resolveTransactionFields(entityType, input);
  const patch = { ...fields, updatedBy: userId };
  const payments = sanitizePayments(input.payments);
  if (payments !== undefined) patch.payments = payments;
  const tx = await HistoricalTransaction.findOneAndUpdate(
    { _id: id, entityType, entityId },
    patch,
    { new: true, runValidators: true },
  );
  if (!tx) throw new ApiError(404, 'العملية غير موجودة');
  return tx;
}

export async function deleteTransaction(entityType, entityId, id) {
  assertEntityType(entityType);
  const tx = await HistoricalTransaction.findOneAndDelete({ _id: id, entityType, entityId });
  if (!tx) throw new ApiError(404, 'العملية غير موجودة');
  return tx;
}

/** إضافة دفعة واحدة جديدة تتراكم على عملية موجودة — زر (+) بالفرونت، بدون التأثير على باقي الدفعات */
export async function addPayment(entityType, entityId, id, payment, userId) {
  assertEntityType(entityType);
  const [sanitized] = sanitizePayments([payment]);
  const tx = await HistoricalTransaction.findOneAndUpdate(
    { _id: id, entityType, entityId },
    { $push: { payments: sanitized }, updatedBy: userId },
    { new: true, runValidators: true },
  );
  if (!tx) throw new ApiError(404, 'العملية غير موجودة');
  return tx;
}

/** حذف دفعة واحدة من عملية (تصحيح خطأ إدخال) */
export async function removePayment(entityType, entityId, id, paymentId, userId) {
  assertEntityType(entityType);
  const tx = await HistoricalTransaction.findOneAndUpdate(
    { _id: id, entityType, entityId },
    { $pull: { payments: { _id: paymentId } }, updatedBy: userId },
    { new: true, runValidators: true },
  );
  if (!tx) throw new ApiError(404, 'العملية غير موجودة');
  return tx;
}

/**
 * إجمالي عمليات كيان واحد: grossTotal = إجمالي كل العمليات (amount)، paidTotal = إجمالي كل
 * الدفعات المُضافة عليها (payments)، netRemaining = ما تبقّى فعليًا (بالاتجاه المناسب لنوع
 * الكيان تلقائيًا، بدون حاجة لأي منطق له/عليه بعد الآن — راجع تعليق الموديل).
 */
export async function getEntityNet(entityType, entityId) {
  const items = await listForEntity(entityType, entityId);
  let grossTotal = 0;
  let paidTotal = 0;
  items.forEach((t) => {
    grossTotal += Number(t.amount) || 0;
    paidTotal += (t.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  });
  return {
    items,
    grossTotal: Math.round(grossTotal * 100) / 100,
    paidTotal: Math.round(paidTotal * 100) / 100,
    netRemaining: Math.round((grossTotal - paidTotal) * 100) / 100,
  };
}

/**
 * نفس getEntityNet لكن لعدة كيانات دفعة واحدة (نظرة عامة على الأرصدة في accountsService).
 */
export async function getNetTotalsForEntities(entityType, entityIds) {
  assertEntityType(entityType);
  const ids = entityIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await HistoricalTransaction.aggregate([
    { $match: { entityType, entityId: { $in: ids } } },
    {
      $project: {
        entityId: 1,
        amount: 1,
        paidTotal: { $sum: '$payments.amount' },
      },
    },
    {
      $group: {
        _id: '$entityId',
        grossTotal: { $sum: '$amount' },
        paidTotal: { $sum: '$paidTotal' },
      },
    },
  ]);
  const map = {};
  rows.forEach((r) => {
    // نفس التقريب المُطبَّق في getEntityNet (لكيان واحد) — بدونه كان ممكن يظهر فرق كسور
    // فلس بسيط بين رقم صفحة الحسابات العامة (تستخدم هذه الدالة المجمّعة) ورقم صفحة تفاصيل
    // نفس العميل/القلاب/العامل (تستخدم getEntityNet)، بسبب أخطاء تقريب الفاصلة العائمة العادية.
    map[r._id.toString()] = {
      grossTotal: Math.round((r.grossTotal || 0) * 100) / 100,
      paidTotal: Math.round((r.paidTotal || 0) * 100) / 100,
    };
  });
  return map;
}