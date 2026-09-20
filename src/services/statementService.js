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
 * الكسارة (Quarry) ليس لها حاليًا مفهوم "مستحق مالي" في business logic الحالي (materials[].weight فقط،
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

/** يبني كشف حساب موحّد مرتب بالتاريخ مع رصيد متحرك من مصفوفتين: عمليات من التقارير + معاملات قديمة.
 * بعد التبسيط: الاتجاه ثابت حسب نوع الكيان (راجع historicalTransactionService)، فكل عملية
 * تاريخية تُحسب بمقدار (amount - paidTotal) بنفس إشارة delta الخاصة بعمليات التقارير — بدون
 * أي فرع على direction بعد الآن.
 */
function buildLedger(reportEntries, historicalEntries) {
  const ledger = [
    ...reportEntries.map((e) => ({ ...e, source: 'report' })),
    ...historicalEntries.map((h) => {
      const paidTotal = (h.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return {
        source: 'historical',
        date: h.date,
        type: h.type || 'عملية',
        description: h.description || '',
        delta: (Number(h.amount) || 0) - paidTotal,
        amount: h.amount,
        paidTotal,
        quantity: h.quantity,
        unit: h.unit,
        unitPrice: h.unitPrice,
        dueDate: h.dueDate,
        payments: h.payments,
        id: h.id,
      };
    }),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let balance = 0;
  const withBalance = ledger.map((entry) => {
    balance += entry.delta;
    return { ...entry, balance };
  });
  // الرصيد المتحرك (balance) لازم يُحسب بالترتيب التصاعدي (الأقدم أولًا) عشان يبقى له معنى،
  // لكن الجدول المعروض للمستخدم (الأحدث أولًا) لازم يطابق ترتيب جدول العمليات فوقه في نفس
  // الصفحة (sales/trips/workDays، مُرتَّب تنازليًا) — وإلا كان جدولين في نفس الصفحة بترتيبين
  // متعاكسين، وهو ما كان يحصل فعليًا قبل هذا الإصلاح.
  return withBalance.reverse();
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
  // ملاحظة مهمة: "المتبقي" الفعلي بالأسفل (totalRemaining في الـreturn) يُحسب كـ"إجمالي المبيعات
  // - إجمالي المدفوعات" (طرح على المستوى الكلي)، وليس مجموع remaining كل عملية بيع منفردة —
  // لو حسبناه بجمع remaining كل عملية (كل واحدة مُقيَّدة بحد أدنى صفر وقت الحفظ)، أي دفعة زيادة
  // عن المستحق في عملية معيّنة كانت ستُفقد بدل ما تُخصم من المتبقي على عمليات أخرى لنفس العميل.

  const { items: historical, grossTotal, paidTotal } = await historicalTransactionService.getEntityNet('customer', customerId);

  const ledgerFromSales = sales.map((s) => ({
    date: s.date,
    type: 'بيع',
    description: [s.fineness, s.packaging].filter(Boolean).join(' — '),
    // delta موجب = العميل أصبح مدينًا أكثر (المتبقي فقط، لأن المدفوع نقدًا لا يترك أثرًا في الرصيد)
    delta: Number(s.remaining) || 0,
    reportId: s.reportId,
  }));
  const ledger = buildLedger(ledgerFromSales, historical);

  // القاعدة الأساسية (قسم 13): إجمالي مبيعات العميل = مجموع عمليات البيع الخاصة به،
  // وهذا يشمل كل عمليات "إضافة عملية قديمة" (grossTotal) — فهي أصلًا عمليات بيع حسب
  // تعريف النموذج نفسه، وليست مجرد رقم للرصيد فقط. الدفعات المضافة عليها (paidTotal) تُحسب
  // كدفعات، حتى تبقى المعادلة: المتبقي = المبيعات - الدفعات.
  const totalSalesWithHistorical = totalSales + grossTotal;
  const totalPaidWithHistorical = cashSales + creditPaid + paidTotal;

  return {
    sales,
    totalSales: totalSalesWithHistorical,
    totalPaid: totalPaidWithHistorical,
    totalRemaining: totalSalesWithHistorical - totalPaidWithHistorical,
    historical,
    ledger,
  };
}

/**
 * كشف حساب كسارة — بعد الانتقال إلى materials[] (عدة صفوف/كسارات بنفس التقرير) بقى لازم
 * Aggregation بـ$unwind بدل find مباشر (كانت raw كائن واحد فقط، فمكنش محتاج $unwind قديمًا).
 * ميزة إضافية طبيعية من التصميم الجديد: كل نقلة (delivery) هنا مرتبطة بقلاب واحد محدد
 * (نفس صف الخامة)، بدل كل قلابات اليوم مجمّعين مع بعض كما كان الحال سابقًا.
 */
export async function getQuarryStatement(quarryId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(quarryId);
  const pipeline = [
    { $match: dateMatch(from, to) },
    { $unwind: '$materials' },
    { $match: { 'materials.quarryId': id } },
    {
      $project: {
        _id: 0,
        reportId: '$_id',
        date: '$date',
        weight: '$materials.weight',
        truck: '$materials.truck',
        materialUnitPrice: '$materials.materialUnitPrice',
        materialTotal: '$materials.materialTotal',
      },
    },
    { $sort: { date: -1 } },
  ];

  const rows = await DailyReport.aggregate(pipeline);

  const deliveries = rows.map((r) => ({
    date: r.date,
    weight: r.weight,
    truck: r.truck,
    materialUnitPrice: r.materialUnitPrice,
    materialTotal: r.materialTotal,
    reportId: r.reportId,
  }));

  const totalWeight = deliveries.reduce((s, d) => s + (Number(d.weight) || 0), 0);

  // لا يوجد مفهوم "مستحق مالي" حاليًا للكسارة في business logic الموجود (وزن فقط) —
  // لذلك المعاملات القديمة هنا سجل مالي حقيقي مستقل (رصيده الخاص)، وليس مدمجًا مع الوزن.
  const { items: historical, grossTotal, paidTotal } = await historicalTransactionService.getEntityNet('quarry', quarryId);
  const historicalLedger = buildLedger([], historical);

  return {
    deliveries,
    totalWeight,
    historical,
    historicalLedger,
    historicalGrossTotal: grossTotal,
    historicalPaidTotal: paidTotal,
    historicalNetBalance: grossTotal - paidTotal,
  };
}

/**
 * كشف حساب قلاب — بعد الانتقال إلى materials[] بقى كل رحلة مرتبطة مباشرة بصف خامة واحد،
 * فمعلومات الكسارة (quarry/quarryId) بقت أدق (خاصة بنفس الرحلة، مش كل كسارات اليوم).
 * totalDue يُبنى من transportTotal فقط (مصاريف النقل) — لا علاقة له بـmaterialTotal
 * (قيمة الخامة نفسها، المستحقة للكسارة منطقيًا لا للقلاب) — تفاديًا لأي خلط بين الجهتين.
 */
export async function getTruckStatement(truckId, { from, to } = {}) {
  const id = new mongoose.Types.ObjectId(truckId);
  const pipeline = [
    { $match: dateMatch(from, to) },
    { $unwind: '$materials' },
    { $match: { 'materials.truckId': id } },
    {
      $project: {
        _id: 0,
        reportId: '$_id',
        date: '$date',
        weight: '$materials.weight',
        rate: '$materials.truckRate',
        total: '$materials.transportTotal',
        paid: '$materials.paid',
        remaining: '$materials.remaining',
        quarry: '$materials.crusher',
        quarryId: '$materials.quarryId',
      },
    },
    { $sort: { date: -1 } },
  ];

  const trips = await DailyReport.aggregate(pipeline);
  const totalWeight = trips.reduce((s, t) => s + (Number(t.weight) || 0), 0);
  const totalDue = trips.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const totalPaid = trips.reduce((s, t) => s + (Number(t.paid) || 0), 0);
  // "المتبقي" الفعلي بالأسفل يُحسب بالطرح على المستوى الكلي (totalDue - totalPaid)، وليس بجمع
  // remaining كل رحلة منفردة — نفس السبب الموثّق في getCustomerStatement أعلاه: لو قلاب اتدفعله
  // زيادة في رحلة معيّنة (مثلًا دفعة مقدّمة)، الطرح الكلي بيخصمها صح من المستحق على رحلات تانية،
  // بينما جمع remaining كل رحلة (مُقيَّد بحد أدنى صفر لكل رحلة على حدة) كان سيُفقد هذا الخصم.

  // 'له' كانت تزيد المستحق للقلاب — الآن كل عملية للقلاب دائمًا بهذا الاتجاه (راجع الموديل)،
  // فلم يعد هناك حاجة لفرع على direction: delta لكل عملية = amount - paidTotal مباشرة (نفس
  // الدالة العامة buildLedger المستخدمة لكل الكيانات الأخرى).
  const { items: historical, grossTotal, paidTotal } = await historicalTransactionService.getEntityNet('truck', truckId);
  const ledgerFromTrips = trips.map((t) => ({
    date: t.date,
    type: 'رحلة',
    description: t.quarry || '',
    delta: Number(t.remaining) || 0,
    reportId: t.reportId,
  }));
  const fullLedger = buildLedger(ledgerFromTrips, historical);

  return {
    trips,
    totalWeight,
    totalDue: totalDue + grossTotal,
    totalPaid: totalPaid + paidTotal,
    totalRemaining: (totalDue + grossTotal) - (totalPaid + paidTotal),
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

  // عمليات قديمة إضافية للعامل (نفس نموذج القلاب/الكسارة/المورد الموحّد: مبلغ وتاريخ فقط + دفعات)
  const { items: historical, grossTotal, paidTotal } = await historicalTransactionService.getEntityNet('worker', workerId);
  const ledgerFromDays = workDays.map((w) => ({
    date: w.date,
    type: 'يومية',
    description: w.shift || '',
    delta: Number(w.remaining ?? ((Number(w.dailyAmount) || 0) - (Number(w.paid) || 0))) || 0,
    reportId: w.reportId,
  }));
  const ledger = buildLedger(ledgerFromDays, historical);

  return {
    workDays,
    totalDays,
    totalHours,
    totalDue: totalDue + grossTotal,
    totalPaid: totalPaid + paidTotal,
    totalRemaining: (totalDue + grossTotal) - (totalPaid + paidTotal),
    historical,
    ledger,
  };
}