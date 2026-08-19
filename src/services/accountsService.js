import DailyReport from '../models/DailyReport.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import Quarry from '../models/Quarry.js';
import Truck from '../models/Truck.js';
import Worker from '../models/Worker.js';

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
  return DailyReport.aggregate([
    { $match: { 'raw.quarryId': { $ne: null } } },
    { $group: { _id: '$raw.quarryId', totalWeight: { $sum: { $ifNull: ['$raw.weight', 0] } } } },
  ]);
}

async function getTruckBalances() {
  return DailyReport.aggregate([
    { $unwind: '$tippers' },
    { $match: { 'tippers.truckId': { $ne: null } } },
    {
      $group: {
        _id: '$tippers.truckId',
        totalWeight: { $sum: { $ifNull: ['$tippers.weight', 0] } },
        totalDue: { $sum: { $ifNull: ['$tippers.total', 0] } },
        totalPaid: { $sum: { $ifNull: ['$tippers.paid', 0] } },
        totalRemaining: { $sum: { $ifNull: ['$tippers.remaining', 0] } },
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
  const [customerBalances, quarryBalances, truckBalances, workerBalances, { totalSales, embeddedExpenses }, standaloneExpensesAgg] =
    await Promise.all([
      getCustomerBalances(),
      getQuarryBalances(),
      getTruckBalances(),
      getWorkerBalances(),
      getReportTotals(),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
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

  const customerRows = customerBalances
    .map((b) => ({
      id: b._id,
      name: customerNames[b._id.toString()] || 'غير معروف',
      due: b.totalSales,
      paid: b.cashSales + b.creditPaid,
      remaining: b.totalRemaining,
    }))
    .filter((r) => r.due > 0 || r.remaining > 0);

  const quarryRows = quarryBalances
    .map((b) => ({ id: b._id, name: quarryNames[b._id.toString()] || 'غير معروف', due: b.totalWeight }))
    .filter((r) => r.due > 0);

  const truckRows = truckBalances
    .map((b) => ({
      id: b._id,
      name: truckNames[b._id.toString()] || 'غير معروف',
      due: b.totalDue,
      paid: b.totalPaid,
      remaining: b.totalRemaining,
    }))
    .filter((r) => r.due > 0 || r.remaining > 0);

  const workerRows = workerBalances
    .map((b) => ({
      id: b._id,
      name: workerNames[b._id.toString()] || 'غير معروف',
      due: b.totalDue,
      paid: b.totalPaid,
      remaining: b.totalDue - b.totalPaid,
    }))
    .filter((r) => r.due > 0 || r.remaining > 0);

  const receivable = customerRows.reduce((s, r) => s + r.remaining, 0);
  const payableTrucks = truckRows.reduce((s, r) => s + r.remaining, 0);
  const payableWorkers = workerRows.reduce((s, r) => s + r.remaining, 0);

  return {
    totalSales,
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
