import mongoose from 'mongoose';
import HistoricalTransaction from '../models/HistoricalTransaction.js';
import { ApiError } from '../utils/apiResponse.js';

const ENTITY_TYPES = ['customer', 'truck', 'quarry', 'supplier'];

function assertEntityType(entityType) {
  if (!ENTITY_TYPES.includes(entityType)) {
    throw new ApiError(400, 'نوع الكيان غير صالح');
  }
}

export async function listForEntity(entityType, entityId) {
  assertEntityType(entityType);
  return HistoricalTransaction.find({ entityType, entityId }).sort({ date: 1, createdAt: 1 });
}

export async function createTransaction(entityType, entityId, input, userId) {
  assertEntityType(entityType);
  return HistoricalTransaction.create({
    entityType,
    entityId,
    date: input.date,
    type: input.type || '',
    amount: input.amount,
    direction: input.direction,
    unitPrice: input.unitPrice,
    description: input.description || '',
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function updateTransaction(entityType, entityId, id, input, userId) {
  assertEntityType(entityType);
  const tx = await HistoricalTransaction.findOneAndUpdate(
    { _id: id, entityType, entityId },
    {
      date: input.date,
      type: input.type || '',
      amount: input.amount,
      direction: input.direction,
      unitPrice: input.unitPrice,
      description: input.description || '',
      updatedBy: userId,
    },
    { new: true, runValidators: true },
  );
  if (!tx) throw new ApiError(404, 'المعاملة القديمة غير موجودة');
  return tx;
}

export async function deleteTransaction(entityType, entityId, id) {
  assertEntityType(entityType);
  const tx = await HistoricalTransaction.findOneAndDelete({ _id: id, entityType, entityId });
  if (!tx) throw new ApiError(404, 'المعاملة القديمة غير موجودة');
  return tx;
}

/**
 * إجمالي صافي المعاملات القديمة لكيان واحد: 'له' تزيد الرصيد المتاح/المدفوع، 'عليه' تزيد المستحق.
 * تُستخدم من statementService لدمج القديم مع الجديد في كشف حساب واحد حقيقي (وليس نسخة منفصلة للعرض فقط).
 */
export async function getEntityNet(entityType, entityId) {
  const items = await listForEntity(entityType, entityId);
  const totalFor = items.filter((t) => t.direction === 'له').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalAgainst = items.filter((t) => t.direction === 'عليه').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return { items, totalFor, totalAgainst };
}

/**
 * إجمالي صافي المعاملات القديمة لعدة كيانات دفعة واحدة (نفس فكرة accountsService.js —
 * تجميع واحد بدل استعلام منفصل لكل كيان) — يُستخدم في نظرة عامة على الأرصدة.
 */
export async function getNetTotalsForEntities(entityType, entityIds) {
  assertEntityType(entityType);
  const ids = entityIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await HistoricalTransaction.aggregate([
    { $match: { entityType, entityId: { $in: ids } } },
    {
      $group: {
        _id: '$entityId',
        totalFor: { $sum: { $cond: [{ $eq: ['$direction', 'له'] }, '$amount', 0] } },
        totalAgainst: { $sum: { $cond: [{ $eq: ['$direction', 'عليه'] }, '$amount', 0] } },
      },
    },
  ]);
  const map = {};
  rows.forEach((r) => { map[r._id.toString()] = { totalFor: r.totalFor, totalAgainst: r.totalAgainst }; });
  return map;
}
