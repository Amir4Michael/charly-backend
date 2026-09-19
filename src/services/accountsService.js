import DailyReport from '../models/DailyReport.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import Quarry from '../models/Quarry.js';
import Truck from '../models/Truck.js';
import Worker from '../models/Worker.js';
import * as historicalTransactionService from './historicalTransactionService.js';
import { getGeneralSalesTotal } from './generalSaleService.js';

/**
 * كل هذه الدوال تجمع أرصدة كل الكيانات دفعة واحدة (Single-pass $group)
 * بدل حلقة N+1 استعلام لكل عميل/كسارة/قلاب/عامل على حدة — أهم من ناحية الأداء
 * على عكس statementService.js الذي يُستدعى لكيان واحد محدد فقط.
 */

async function getCustomerBalances() {
  return DailyReport.aggregate([
    { $unwind: '$loading' },
    { $match: { 'loading.customerId': { $ne: null } } },
    {
      $group: {
        _id: '$loading.customerId',
        totalSales: { $sum: { $multiply: [{ $ifNull: ['$loading.weight', 0] }, { $ifNull: ['$loading.price', 0] }] } },
        cashSales: {
          $sum: {
            $cond: [
              { $eq: ['$loading.payment', 'نقدي'] },
              { $multiply: [{ $ifNull: ['$loading.weight', 0] }, { $ifNull: ['$loading.price', 0] }] },
              0,
            ],
          },
        },
        creditPaid: { $sum: { $cond: [{ $eq: ['$loading.payment', 'آجل'] }, { $ifNull: ['$loading.paid', 0] }, 0] } },
        totalRemaining: { $sum: { $cond: [{ $eq: ['$loading.payment', 'آجل'] }, { $ifNull: ['$loading.remaining', 0] }, 0] } },
      },
    },
  ]);
}

async function getQuarryBalances() {
  // بعد الانتقال من raw{} (كسارة واحدة لليوم) إلى materials[] (عدة صفوف/كسارات في نفس اليوم)،
  // لازم $unwind قبل التجميع — كسارة واحدة ممكن تتكرر في أكتر من صف بنفس التقرير.
  return DailyReport.aggregate([
    { $unwind: '$materials' },
    { $match: { 'materials.quarryId': { $ne: null } } },
    {
      $group: {
        _id: '$materials.quarryId',
        totalWeight: { $sum: { $ifNull: ['$materials.weight', 0] } },
        deliveriesCount: { $sum: 1 },
      },
    },
  ]);
}

async function getTruckBalances() {
  // totalDue يُجمَّع من transportTotal فقط (قيمة نقلة القلاب) — مش materialTotal (قيمة الخامة)،
  // حتى لا تختلط مستحقات القلاب بفلوس الخامة المستحقة للكسارة (الكسارة ليس لها مستحق مالي هنا أصلًا).
  return DailyReport.aggregate([
    { $unwind: '$materials' },
    { $match: { 'materials.truckId': { $ne: null } } },
    {
      $group: {
        _id: '$materials.truckId',
        totalWeight: { $sum: { $ifNull: ['$materials.weight', 0] } },
        totalDue: { $sum: { $ifNull: ['$materials.transportTotal', 0] } },
        totalPaid: { $sum: { $ifNull: ['$materials.paid', 0] } },
        totalRemaining: { $sum: { $ifNull: ['$materials.remaining', 0] } },
        tripsCount: { $sum: 1 },
      },
    },
  ]);
}

async function getWorkerBalances() {
  return DailyReport.aggregate([
    { $unwind: '$workers' },
    { $match: { 'workers.workerId': { $ne: null } } },
    {
      $group: {
        _id: '$workers.workerId',
        totalDays: { $sum: 1 },
        totalHours: { $sum: { $ifNull: ['$workers.hours', 0] } },
        totalDue: { $sum: { $ifNull: ['$workers.dailyAmount', 0] } },
        totalPaid: { $sum: { $ifNull: ['$workers.paid', 0] } },
      },
    },
  ]);
}

async function getReportTotals() {
  const [result] = await DailyReport.aggregate([
    { $unwind: { path: '$loading', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $multiply: [{ $ifNull: ['$loading.weight', 0] }, { $ifNull: ['$loading.price', 0] }] } },
      },
    },
  ]);
  const [expensesResult] = await DailyReport.aggregate([
    { $unwind: { path: '$expenses', preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, embeddedExpenses: { $sum: { $ifNull: ['$expenses.amount', 0] } } } },
  ]);
  return {
    totalSales: result?.totalSales || 0,
    embeddedExpenses: expensesResult?.embeddedExpenses || 0,
  };
}

/** يطابق منطق AccountsPage.jsx بالفرونت بالكامل: المبيعات، المصاريف، والمستحقات لكل جهة */
export async function getAccountsOverview() {
  const [customerBalances, quarryBalances, truckBalances, workerBalances, { totalSales: reportsTotalSales, embeddedExpenses }, standaloneExpensesAgg, generalSalesTotal] =
    await Promise.all([
      getCustomerBalances(),
      getQuarryBalances(),
      getTruckBalances(),
      getWorkerBalances(),
      getReportTotals(),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      getGeneralSalesTotal(),
    ]);

  const standaloneExpenses = standaloneExpensesAgg[0]?.total || 0;
  const totalExpenses = embeddedExpenses + standaloneExpenses;

  const [customers, quarries, trucks, workers] = await Promise.all([
    Customer.find().select('name'),
    Quarry.find().select('name'),
    Truck.find().select('name'),
    Worker.find().select('name'),
  ]);

  const nameById = (list) => Object.fromEntries(list.map((doc) => [doc._id.toString(), doc.name]));
  const customerNames = nameById(customers);
  const quarryNames = nameById(quarries);
  const truckNames = nameById(trucks);
  const workerNames = nameById(workers);

  // معاملات العملاء القديمة (بما فيها عمليات "الكمية والسعر") تدخل في إجمالي مبيعات/مدفوعات
  // كل عميل — نفس القاعدة المطبّقة في statementService.getCustomerStatement بالضبط (قسم 13)،
  // لضمان ألا تعرض صفحة الحسابات رقمًا مختلفًا عن صفحة تفاصيل العميل لنفس البيانات.
  const [customerHistoricalTotals, truckHistoricalTotals, workerHistoricalTotals] = await Promise.all([
    historicalTransactionService.getNetTotalsForEntities('customer', customers.map((c) => c._id)),
    historicalTransactionService.getNetTotalsForEntities('truck', trucks.map((t) => t._id)),
    historicalTransactionService.getNetTotalsForEntities('worker', workers.map((w) => w._id)),
  ]);

  const balanceByCustomerId = Object.fromEntries(customerBalances.map((b) => [b._id.toString(), b]));
  const allCustomerIds = new Set([
    ...customerBalances.map((b) => b._id.toString()),
    ...Object.keys(customerHistoricalTotals),
  ]);

  let customerHistoricalSalesTotal = 0;
  const customerRows = Array.from(allCustomerIds)
    .map((customerId) => {
      const b = balanceByCustomerId[customerId] || { totalSales: 0, cashSales: 0, creditPaid: 0, totalRemaining: 0 };
      const hist = customerHistoricalTotals[customerId] || { grossTotal: 0, paidTotal: 0 };
      customerHistoricalSalesTotal += hist.grossTotal;
      const due = b.totalSales + hist.grossTotal;
      const paid = b.cashSales + b.creditPaid + hist.paidTotal;
      return {
        id: customerId,
        name: customerNames[customerId] || 'غير معروف',
        due,
        paid,
        remaining: due - paid,
      };
    })
    .filter((r) => r.due > 0 || r.remaining > 0);

  // إجمالي مبيعات المصنع الكلي = مبيعات عمليات التقارير اليومية + المبيعات "القديمة/بالكمية
  // والسعر" الخاصة بالعملاء + المبيعات العامة غير المرتبطة بأي عميل (قسم 2 و11 من الطلب).
  const totalSales = reportsTotalSales + customerHistoricalSalesTotal + generalSalesTotal;

  const quarryRows = quarryBalances
    .map((b) => ({ id: b._id, name: quarryNames[b._id.toString()] || 'غير معروف', due: b.totalWeight, count: b.deliveriesCount || 0 }))
    .filter((r) => r.due > 0);

  const balanceByTruckId = Object.fromEntries(truckBalances.map((b) => [b._id.toString(), b]));
  const allTruckIds = new Set([
    ...truckBalances.map((b) => b._id.toString()),
    ...Object.keys(truckHistoricalTotals),
  ]);
  const truckRows = Array.from(allTruckIds)
    .map((truckId) => {
      const b = balanceByTruckId[truckId] || { totalDue: 0, totalPaid: 0, totalWeight: 0, tripsCount: 0 };
      const hist = truckHistoricalTotals[truckId] || { grossTotal: 0, paidTotal: 0 };
      const due = b.totalDue + hist.grossTotal;
      const paid = b.totalPaid + hist.paidTotal;
      return {
        id: truckId, name: truckNames[truckId] || 'غير معروف', due, paid, remaining: due - paid,
        totalWeight: b.totalWeight || 0, tripsCount: b.tripsCount || 0,
      };
    })
    // نعرض القلاب لو عليه مستحق/متبقي، أو لو نقل وزن فعلي حتى بدون سعر نقلة مُسجَّل
    // (بدل الاقتصار على "عنده فلوس مستحقة" فقط، اللي كان بيُخفي قلابات نقلت فعليًا).
    .filter((r) => r.due > 0 || r.remaining > 0 || r.totalWeight > 0);

  const balanceByWorkerId = Object.fromEntries(workerBalances.map((b) => [b._id.toString(), b]));
  const allWorkerIds = new Set([
    ...workerBalances.map((b) => b._id.toString()),
    ...Object.keys(workerHistoricalTotals),
  ]);
  const workerRows = Array.from(allWorkerIds)
    .map((workerId) => {
      const b = balanceByWorkerId[workerId] || { totalDue: 0, totalPaid: 0, totalDays: 0 };
      const hist = workerHistoricalTotals[workerId] || { grossTotal: 0, paidTotal: 0 };
      const due = b.totalDue + hist.grossTotal;
      const paid = b.totalPaid + hist.paidTotal;
      return {
        id: workerId, name: workerNames[workerId] || 'غير معروف', due, paid, remaining: due - paid,
        totalDays: b.totalDays || 0,
      };
    })
    .filter((r) => r.due > 0 || r.remaining > 0);

  const receivable = customerRows.reduce((s, r) => s + r.remaining, 0);
  const payableTrucks = truckRows.reduce((s, r) => s + r.remaining, 0);
  const payableWorkers = workerRows.reduce((s, r) => s + r.remaining, 0);

  return {
    totalSales,
    generalSalesTotal,
    totalExpenses,
    net: totalSales - totalExpenses,
    receivable,
    payableTrucks,
    payableWorkers,
    customerRows,
    quarryRows,
    truckRows,
    workerRows,
  };
}