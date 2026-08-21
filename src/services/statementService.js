import mongoose from 'mongoose';
import DailyReport from '../models/DailyReport.js';
import * as historicalTransactionService from './historicalTransactionService.js';

/**
 * كل دالة هنا تعيد إنتاج نفس حسابات reportUtils.js بالفرونت بالضبط
 * (computeCustomerStats / computeQuarryStats / computeTruckStats / computeWorkerStats)،
 * لكن عبر MongoDB Aggregation بدل تحميل كل التقارير وحسابها في المتصفح.
 * القرار موثّق في BACKEND_BLUEPRINT.md قسم 5.
 *
 * تحديث: تم دمج المعاملات القديمة (HistoricalTransaction) في كشف حساب العميل والقلاب
 * ضمن نفس مصدر البيانات الحقيقي (وليس نسخة منفصلة للعرض فقط)، مع رصيد متحرك (running
 * balance) محسوب فعليًا من كل العمليات (القديمة من الدفاتر + الجديدة من النظام) مرتبة بالتاريخ.
 * الكسارة (Quarry) ليس لها حاليًا مفهوم "مستحق مالي" في business logic الحالي (raw.weight فقط،
 * بدون paid/remaining) — لذلك لا نخترع رصيدًا ماليًا مدمجًا لها؛ المعاملات القديمة تُعرض
 * كسجل مالي حقيقي مستقل بجانب سجل التوريدات (وزن فقط)، دون خلط الاثنين.
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

/** يبني كشف حساب موحّد مرتب بالتاريخ مع رصيد متحرك من مصفوفتين: عمليات من التقارير + معاملات قديمة */
function buildLedger(reportEntries, historicalEntries) {
  const ledger = [
    ...reportEntries.map((e) => ({ ...e, source: 'report' })),
    ...historicalEntries.map((h) => ({
      source: 'historical',
      date: h.date,
      type: h.type || 'معاملة قديمة',
      description: h.description || '',
      delta: h.direction === 'عليه' ? Number(h.amount) || 0 : -(Number(h.amount) || 0),
      amount: h.amount,
      direction: h.direction,
      id: h.id,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let balance = 0;
  return ledger.map((entry) => {
    balance += entry.delta;
    return { ...entry, balance };
  });
}

/** كشف حساب عميل — مطابق computeCustomerStats + معاملات قديمة (delta موجب = العميل مدين أكثر للمصنع) */
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

  const { items: historical, totalFor, totalAgainst } = await historicalTransactionService.getEntityNet('customer', customerId);

  const ledgerFromSales = sales.map((s) => ({
    date: s.date,
    type: 'بيع',
    description: [s.fineness, s.packaging].filter(Boolean).join(' — '),
    // delta موجب = العميل أصبح مدينًا أكثر (المتبقي فقط، لأن المدفوع نقدًا لا يترك أثرًا في الرصيد)
    delta: Number(s.remaining) || 0,
    reportId: s.reportId,
  }));
  const ledger = buildLedger(ledgerFromSales, historical);

  return {
    sales,
    totalSales,
    totalPaid: cashSales + creditPaid,
    totalRemaining: totalRemaining + totalAgainst - totalFor,
    historical,
    ledger,
  };
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

  // لا يوجد مفهوم "مستحق مالي" حاليًا للكسارة في business logic الموجود (وزن فقط) —
  // لذلك المعاملات القديمة هنا سجل مالي حقيقي مستقل (رصيده الخاص)، وليس مدمجًا مع الوزن.
  const { items: historical, totalFor, totalAgainst } = await historicalTransactionService.getEntityNet('quarry', quarryId);
  const historicalLedger = buildLedger([], historical);

  return { deliveries, totalWeight, historical, historicalLedger, historicalNetBalance: totalAgainst - totalFor };
}

/** كشف حساب قلاب — مطابق computeTruckStats + معاملات قديمة (delta موجب = المصنع مدين للقلاب أكثر) */
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

  // هنا العكس: الاتجاه 'له' معناه المصنع مدين للقلاب أكثر (delta موجب)، 'عليه' يقلّل المستحق له.
  const { items: historical, totalFor, totalAgainst } = await historicalTransactionService.getEntityNet('truck', truckId);
  const ledgerFromTrips = trips.map((t) => ({
    date: t.date,
    type: 'رحلة',
    description: [t.material, t.quarry].filter(Boolean).join(' — '),
    delta: Number(t.remaining) || 0,
    reportId: t.reportId,
  }));
  // نعكس إشارة delta للمعاملات القديمة هنا لأن buildLedger تفترض دائمًا "عليه = +"، بينما
  // بالنسبة للقلاب "له" هي التي تزيد المستحق — لذلك نبني الـledger يدويًا بنفس الترتيب والرصيد المتحرك.
  const ledger = [
    ...ledgerFromTrips.map((e) => ({ ...e, source: 'report' })),
    ...historical.map((h) => ({
      source: 'historical',
      date: h.date,
      type: h.type || 'معاملة قديمة',
      description: h.description || '',
      delta: h.direction === 'له' ? Number(h.amount) || 0 : -(Number(h.amount) || 0),
      amount: h.amount,
      direction: h.direction,
      id: h.id,
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let balance = 0;
  const fullLedger = ledger.map((entry) => { balance += entry.delta; return { ...entry, balance }; });

  return {
    trips,
    totalWeight,
    totalDue,
    totalPaid,
    totalRemaining: totalRemaining + totalFor - totalAgainst,
    historical,
    ledger: fullLedger,
  };
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
