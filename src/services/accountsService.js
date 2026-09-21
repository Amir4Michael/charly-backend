import DailyReport from '../models/DailyReport.js';
import Expense from '../models/Expense.js';
import Customer from '../models/Customer.js';
import Quarry from '../models/Quarry.js';
import Truck from '../models/Truck.js';
import Worker from '../models/Worker.js';
import Supplier from '../models/Supplier.js';
import * as historicalTransactionService from './historicalTransactionService.js';
import { getGeneralSalesTotal } from './generalSaleService.js';
import { getCashAdjustmentsTotal } from './cashAdjustmentService.js';

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
        // ملاحظة: عمدًا لا نجمع هنا remaining كل عملية بيع منفردة (كانت هذه قيمة $sum إضافية
        // هنا سابقًا) — المتبقي الفعلي لكل عميل يُحسب أدناه بطرح إجمالي المبيعات من إجمالي
        // المدفوعات على مستوى العميل ككل (customerRows)، وليس بجمع قيم مُقيَّدة بصفر لكل عملية
        // بيع على حدة. الفرق مهم: دفعة زيادة عن المستحق على عملية معيّنة يجب أن تُخصم من
        // المتبقي على عمليات أخرى لنفس العميل، وهذا لا يحدث لو جُمعت القيم المُقيَّدة مسبقًا.
      },
    },
  ]);
}

async function getQuarryBalances() {
  // بعد الانتقال من raw{} (كسارة واحدة لليوم) إلى materials[] (عدة صفوف/كسارات في نفس اليوم)،
  // لازم $unwind قبل التجميع — كسارة واحدة ممكن تتكرر في أكتر من صف بنفس التقرير.
  // materialDue/materialPaid: مستحق الكسارة الفعلي من قيمة الخامة نفسها (وليس الوزن فقط) —
  // منفصلان تمامًا عن حسابات نقل القلاب (getTruckBalances أدناه)، بنفس مبدأ transportTotal.
  return DailyReport.aggregate([
    { $unwind: '$materials' },
    { $match: { 'materials.quarryId': { $ne: null } } },
    {
      $group: {
        _id: '$materials.quarryId',
        totalWeight: { $sum: { $ifNull: ['$materials.weight', 0] } },
        deliveriesCount: { $sum: 1 },
        materialDue: { $sum: { $ifNull: ['$materials.materialTotal', 0] } },
        materialPaid: { $sum: { $ifNull: ['$materials.materialPaid', 0] } },
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
        tripsCount: { $sum: 1 },
        // (نفس ملاحظة getCustomerBalances أعلاه) — لا نجمع remaining كل رحلة منفردة هنا؛
        // المتبقي الفعلي لكل قلاب يُحسب لاحقًا بالطرح الكلي (totalDue - totalPaid) في truckRows.
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
  const [customerBalances, quarryBalances, truckBalances, workerBalances, { totalSales: reportsTotalSales, embeddedExpenses }, standaloneExpensesAgg, generalSalesTotal, cashAdjustmentsTotal] =
    await Promise.all([
      getCustomerBalances(),
      getQuarryBalances(),
      getTruckBalances(),
      getWorkerBalances(),
      getReportTotals(),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      getGeneralSalesTotal(),
      getCashAdjustmentsTotal(),
    ]);

  const standaloneExpenses = standaloneExpensesAgg[0]?.total || 0;
  const totalExpenses = embeddedExpenses + standaloneExpenses;

  const [customers, quarries, trucks, workers, suppliers] = await Promise.all([
    Customer.find().select('name'),
    Quarry.find().select('name'),
    Truck.find().select('name'),
    Worker.find().select('name'),
    Supplier.find().select('name type'),
  ]);

  const nameById = (list) => Object.fromEntries(list.map((doc) => [doc._id.toString(), doc.name]));
  const customerNames = nameById(customers);
  const quarryNames = nameById(quarries);
  const truckNames = nameById(trucks);
  const workerNames = nameById(workers);
  const supplierNames = nameById(suppliers);

  // معاملات العملاء القديمة (بما فيها عمليات "الكمية والسعر") تدخل في إجمالي مبيعات/مدفوعات
  // كل عميل — نفس القاعدة المطبّقة في statementService.getCustomerStatement بالضبط (قسم 13)،
  // لضمان ألا تعرض صفحة الحسابات رقمًا مختلفًا عن صفحة تفاصيل العميل لنفس البيانات.
  const [customerHistoricalTotals, truckHistoricalTotals, workerHistoricalTotals, supplierHistoricalTotals, quarryHistoricalTotals] = await Promise.all([
    historicalTransactionService.getNetTotalsForEntities('customer', customers.map((c) => c._id)),
    historicalTransactionService.getNetTotalsForEntities('truck', trucks.map((t) => t._id)),
    historicalTransactionService.getNetTotalsForEntities('worker', workers.map((w) => w._id)),
    historicalTransactionService.getNetTotalsForEntities('supplier', suppliers.map((s) => s._id)),
    historicalTransactionService.getNetTotalsForEntities('quarry', quarries.map((q) => q._id)),
  ]);

  const balanceByCustomerId = Object.fromEntries(customerBalances.map((b) => [b._id.toString(), b]));
  const allCustomerIds = new Set([
    ...customerBalances.map((b) => b._id.toString()),
    ...Object.keys(customerHistoricalTotals),
  ]);

  let customerHistoricalSalesTotal = 0;
  const customerRows = Array.from(allCustomerIds)
    .map((customerId) => {
      const b = balanceByCustomerId[customerId] || { totalSales: 0, cashSales: 0, creditPaid: 0 };
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

  // due هنا = الوزن بالطن (زي ما كان دائمًا؛ صفحة الحسابات بتعرضه كـ"طن") — لا نخلطه بالمالي.
  // financialDue/financialPaid/financialRemaining حقول جديدة منفصلة تمامًا، من العمليات القديمة
  // فقط (لا يوجد مصدر مالي آخر للكسارة في التقرير اليومي نفسه) — كانت غائبة تمامًا عن هذه
  // الصفحة وعن حساب "صندوق المصنع" قبل هذا الإصلاح، رغم إن كشف حساب الكسارة نفسه (صفحة
  // التفاصيل) كان بالفعل يدعم عمليات قديمة مالية للكسارة.
  // "المستحق المالي" للكسارة دلوقتي مصدرين يُجمعان: قيمة الخامة نفسها من التقارير اليومية
  // (materialDue/materialPaid — الإصلاح الجديد) + أي عمليات قديمة مسجّلة يدويًا (hist).
  // financialDue/financialPaid/financialRemaining = المجموع الكلي من المصدرين معًا.
  const quarryRows = quarryBalances
    .map((b) => {
      const quarryId = b._id.toString();
      const hist = quarryHistoricalTotals[quarryId] || { grossTotal: 0, paidTotal: 0 };
      const financialDue = (b.materialDue || 0) + hist.grossTotal;
      const financialPaid = (b.materialPaid || 0) + hist.paidTotal;
      return {
        id: b._id, name: quarryNames[quarryId] || 'غير معروف', due: b.totalWeight, count: b.deliveriesCount || 0,
        financialDue, financialPaid, financialRemaining: financialDue - financialPaid,
      };
    })
    .filter((r) => r.due > 0 || r.financialDue > 0 || r.financialRemaining > 0);

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

  // موردو مواد التعبئة (شكاير/بالتات خشب/جامبو) — غير مرتبطين بالتقرير اليومي إطلاقًا (قرار
  // مقصود)، فكل رصيدهم يأتي من العمليات القديمة/اليدوية (HistoricalTransaction) فقط. كانوا
  // غائبين تمامًا عن هذه الصفحة قبل هذا الإصلاح — أي مبلغ مستحق لمورد لم يكن يظهر هنا خالص.
  const supplierRows = suppliers
    .map((s) => {
      const hist = supplierHistoricalTotals[s._id.toString()] || { grossTotal: 0, paidTotal: 0 };
      return {
        id: s._id.toString(), name: supplierNames[s._id.toString()] || 'غير معروف', type: s.type,
        due: hist.grossTotal, paid: hist.paidTotal, remaining: hist.grossTotal - hist.paidTotal,
      };
    })
    .filter((r) => r.due > 0 || r.remaining > 0);

  const receivable = customerRows.reduce((s, r) => s + r.remaining, 0);
  const payableTrucks = truckRows.reduce((s, r) => s + r.remaining, 0);
  const payableWorkers = workerRows.reduce((s, r) => s + r.remaining, 0);
  const payableSuppliers = supplierRows.reduce((s, r) => s + r.remaining, 0);
  const payableQuarries = quarryRows.reduce((s, r) => s + r.financialRemaining, 0);

  // ——— صافي الربح التشغيلي ———
  // ⚠️ إصلاح: كان اسمه "الصافي" ويُحسب كـ(المبيعات − المصاريف فقط)، متجاهلًا تمامًا أكبر
  // بنود التكلفة الفعلية (الخامة، النقل، الأجور، الموردين) — رقم مضلل كان يُظهر ربحًا أعلى
  // بكثير من الحقيقة. الحساب الصحيح يطرح كل تكاليف التشغيل الفعلية، باستخدام "المستحق" لكل
  // بند (وليس "المدفوع") تمامًا كما تُحسب المبيعات نفسها بالمستحق — هذا هو المبدأ المحاسبي
  // الصحيح لحساب الربح (يُحتسب وقت استحقاق التكلفة، لا وقت دفعها فعليًا)، ومختلف عمدًا عن
  // "صندوق المصنع" أعلاه (الذي يعتمد على المدفوع الفعلي فقط، رقم نقدية لا ربحية).
  const totalMaterialCost = quarryRows.reduce((s, r) => s + r.financialDue, 0);
  const totalTransportCost = truckRows.reduce((s, r) => s + r.due, 0);
  const totalLaborCost = workerRows.reduce((s, r) => s + r.due, 0);
  const totalSupplierCost = supplierRows.reduce((s, r) => s + r.due, 0);
  const netOperatingProfit = totalSales - (totalMaterialCost + totalTransportCost + totalLaborCost + totalSupplierCost + totalExpenses);

  // ——— صندوق المصنع (الرصيد النقدي الفعلي) ———
  // مختلف جوهريًا عن "صافي الربح التشغيلي" أعلاه: هذا الأخير رقم رِبحية محاسبي (بالمستحق)،
  // بينما صندوق المصنع هنا هو "الفلوس اللي فعليًا دخلت إيد المصنع وخرجت منها حتى الآن":
  // بيجمع بس اللي اتحصّل فعليًا من العملاء (paid، مش due) والمبيعات العامة (نقدية دايمًا)
  // وأي تعديل يدوي (رصيد افتتاحي أو إيداع/سحب من صاحب المصنع، cashAdjustmentsTotal — موجب
  // أو سالب)، ويطرح منه بس اللي اتصرف/اتدفع فعليًا (مصاريف + paid فعليًا للقلابات والعمال
  // والموردين والكسارات) — بغض النظر عن أي مبلغ لسه مستحق ولسه ما اتحصّلش/ما اتدفعش.
  const totalCollectedFromCustomers = customerRows.reduce((s, r) => s + r.paid, 0);
  const totalPaidToTrucks = truckRows.reduce((s, r) => s + r.paid, 0);
  const totalPaidToWorkers = workerRows.reduce((s, r) => s + r.paid, 0);
  const totalPaidToSuppliers = supplierRows.reduce((s, r) => s + r.paid, 0);
  const totalPaidToQuarries = quarryRows.reduce((s, r) => s + r.financialPaid, 0);
  const cashBox = totalCollectedFromCustomers + generalSalesTotal + cashAdjustmentsTotal - totalExpenses
    - totalPaidToTrucks - totalPaidToWorkers - totalPaidToSuppliers - totalPaidToQuarries;

  return {
    totalSales,
    generalSalesTotal,
    totalExpenses,
    netOperatingProfit,
    totalMaterialCost,
    totalTransportCost,
    totalLaborCost,
    totalSupplierCost,
    cashBox,
    cashAdjustmentsTotal,
    receivable,
    payableTrucks,
    payableWorkers,
    payableSuppliers,
    payableQuarries,
    customerRows,
    quarryRows,
    truckRows,
    workerRows,
    supplierRows,
  };
}