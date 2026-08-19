import mongoose from 'mongoose';
import DailyReport from '../models/DailyReport.js';

/**
 * كل دالة هنا تعيد إنتاج نفس حسابات reportUtils.js بالفرونت بالضبط
 * (computeCustomerStats / computeQuarryStats / computeTruckStats / computeWorkerStats)،
 * لكن عبر MongoDB Aggregation بدل تحميل كل التقارير وحسابها في المتصفح.
 * القرار موثّق في BACKEND_BLUEPRINT.md قسم 5.
 */

function dateMatch(from, to) {
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }
  return match;
}

/** كشف حساب عميل — مطابق computeCustomerStats */
export async function getCustomerStatement(customerId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(customerId);
  const pipeline = [
    { $match: dateMatch(from, to) },
    { $unwind: '$loading' },
    { $match: { 'loading.customerId': id } },
    {
      $project: {
        _id: 0,
        reportId: '$_id',
        date: '$date',
        fineness: '$loading.fineness',
        weight: '$loading.weight',
        packaging: '$loading.packaging',
        price: '$loading.price',
        payment: '$loading.payment',
        paid: '$loading.paid',
        remaining: '$loading.remaining',
      },
    },
    { $sort: { date: -1 } },
  ];

  const sales = await DailyReport.aggregate(pipeline);

  const totalSales = sales.reduce((s, l) => s + (Number(l.weight) || 0) * (Number(l.price) || 0), 0);
  const cashSales = sales
    .filter((l) => l.payment === 'نقدي')
    .reduce((s, l) => s + (Number(l.weight) || 0) * (Number(l.price) || 0), 0);
  const creditPaid = sales.filter((l) => l.payment === 'آجل').reduce((s, l) => s + (Number(l.paid) || 0), 0);
  const totalRemaining = sales.filter((l) => l.payment === 'آجل').reduce((s, l) => s + (Number(l.remaining) || 0), 0);

  return { sales, totalSales, totalPaid: cashSales + creditPaid, totalRemaining };
}

/** كشف حساب كسارة — مطابق computeQuarryStats (raw ليست مصفوفة، فلا حاجة لـ$unwind) */
export async function getQuarryStatement(quarryId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(quarryId);
  const reports = await DailyReport.find({ ...dateMatch(from, to), 'raw.quarryId': id })
    .select('date raw tippers')
    .sort({ date: -1 });

  const deliveries = reports.map((r) => ({
    date: r.date,
    material: r.raw?.type,
    weight: r.raw?.weight,
    unit: r.raw?.unit || 'طن',
    trucks: (r.tippers || []).map((t) => t.name),
    reportId: r._id,
  }));

  const totalWeight = deliveries.reduce((s, d) => s + (Number(d.weight) || 0), 0);
  return { deliveries, totalWeight };
}

/** كشف حساب قلاب — مطابق computeTruckStats */
export async function getTruckStatement(truckId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(truckId);
  const pipeline = [
    { $match: dateMatch(from, to) },
    { $unwind: '$tippers' },
    { $match: { 'tippers.truckId': id } },
    {
      $project: {
        _id: 0,
        reportId: '$_id',
        date: '$date',
        weight: '$tippers.weight',
        rate: '$tippers.rate',
        total: '$tippers.total',
        paid: '$tippers.paid',
        remaining: '$tippers.remaining',
        material: '$raw.type',
        quarry: '$raw.crusher',
        quarryId: '$raw.quarryId',
      },
    },
    { $sort: { date: -1 } },
  ];

  const trips = await DailyReport.aggregate(pipeline);
  const totalWeight = trips.reduce((s, t) => s + (Number(t.weight) || 0), 0);
  const totalDue = trips.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const totalPaid = trips.reduce((s, t) => s + (Number(t.paid) || 0), 0);
  const totalRemaining = trips.reduce((s, t) => s + (Number(t.remaining) || 0), 0);

  return { trips, totalWeight, totalDue, totalPaid, totalRemaining };
}

/** كشف حساب عامل — مطابق computeWorkerStats (يستخدم المصفوفة المجمّعة "workers" وليس shiftTeams، لأن هذا ما يقرأه الفرونت فعليًا) */
export async function getWorkerStatement(workerId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(workerId);
  const pipeline = [
    { $match: dateMatch(from, to) },
    { $unwind: '$workers' },
    { $match: { 'workers.workerId': id } },
    {
      $project: {
        _id: 0,
        reportId: '$_id',
        date: '$date',
        hours: '$workers.hours',
        dailyAmount: '$workers.dailyAmount',
        paid: '$workers.paid',
        remaining: '$workers.remaining',
        shifts: '$shifts',
      },
    },
    { $sort: { date: -1 } },
  ];

  const raw = await DailyReport.aggregate(pipeline);
  const workDays = raw.map((w) => ({ ...w, shift: (w.shifts || []).join('، ') }));

  const totalDays = workDays.length;
  const totalHours = workDays.reduce((s, w) => s + (Number(w.hours) || 0), 0);
  const totalDue = workDays.reduce((s, w) => s + (Number(w.dailyAmount) || 0), 0);
  const totalPaid = workDays.reduce((s, w) => s + (Number(w.paid) || 0), 0);

  return { workDays, totalDays, totalHours, totalDue, totalPaid, totalRemaining: totalDue - totalPaid };
}
