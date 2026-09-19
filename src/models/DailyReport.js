import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * DailyReport — المستند الأهم في النظام. مطابق بالكامل لما يرسله DailyReportFormPage.jsx
 * حاليًا عبر saveReport()، بما فيه دعم أكثر من وردية/مشغل (shiftTeams) وأكثر من صف خامة (materials).
 * القرار الكامل (لماذا Embedded وليس References للأقسام الفرعية) موثّق في BACKEND_BLUEPRINT.md قسم 5.
 *
 * === إعادة هيكلة (Restructure) — أرشفة القرار ===
 * كان التقرير قديمًا مكوّن من: raw{} (كسارة واحدة/سعر واحد لليوم كله) + tippers[] (قلابات منفصلة
 * عن الكسارة) + operatingHours[] (فترات تشغيل/توقف) + production[] (تعبئة منفصلة عن التحميل).
 * تم استبدال الأربعة بأربع أقسام فقط: التشغيل (managers/shifts/shiftTeams) + الخامة (materials[]،
 * صف واحد = كسارة+قلاب+وزن+سعرين منفصلين) + التحميل (loading[]، بدون تغيير) + المصاريف (بدون تغيير).
 * - operatingHours حُذفت نهائيًا (بلا بديل) — عدد الورديات يُحسب الآن من `shifts.length` مباشرة
 *   في الفرونت، بلا أي اعتماد على ساعات تشغيل فعلية.
 * - production حُذفت نهائيًا (بلا بديل) — لم تكن تجمع أصلًا حقل الكمية المنتجة (موثّق سابقًا هنا)،
 *   وكل ما كان مفيدًا فيها (نعومة/عبوة/عميل) موجود بالفعل في loading.
 *
 * ملاحظة تصميم مهمة: loading.fineness / loading.packaging نصوص حرة بدون enum ثابت هنا في الـSchema،
 * لأنها مرتبطة بـMaterialOption (قابلة للإضافة من المستخدم عبر صفحة الخامات) — التحقق من صحتها
 * يتم ديناميكيًا في dailyReportService.js وقت الحفظ، وليس عبر enum ثابت كان سيكسر أي قيمة جديدة
 * يضيفها المستخدم. حقل "نوع الخامة" (كان raw.type) حُذف بالكامل من التقرير — لم يعد له وجود.
 */

const SHIFTS = ['وردية 1', 'وردية 2', 'وردية 3'];
const PAYMENT_METHODS = ['نقدي', 'آجل'];

const workerEntrySchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    name: { type: String, trim: true, default: '' },
    hours: { type: Number, default: 0, min: 0 },
    dailyAmount: { type: Number, default: 0, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 }, // مُشتق، يُعاد حسابه دائمًا وقت الحفظ
  },
  { _id: false },
);

const shiftTeamSchema = new mongoose.Schema(
  {
    operator: { type: String, trim: true, default: '' },
    workersCount: { type: Number, default: 0, min: 0 },
    workers: { type: [workerEntrySchema], default: [] },
  },
  { _id: false },
);

/**
 * materialEntrySchema — صف "الخامة" الواحد: نقلة كاملة من كسارة معيّنة عبر قلاب معيّن.
 * يحتوي على مصدرين ماليين منفصلين تمامًا ومُخزَّنين في حقول مستقلة، حتى لا تختلط فلوس
 * الخامة (المستحقة منطقيًا للكسارة) بفلوس النقل (المستحقة فعليًا للقلاب/السائق):
 *
 *   - materialTotal = weight × materialUnitPrice  → قيمة الخامة نفسها (عرض فقط حاليًا،
 *     لا تدخل في أي رصيد مالي للكسارة، لأن الكسارة ليس لها "مستحق مالي" في الـbusiness logic
 *     الحالي — وزن فقط، تمامًا كما كان الوضع قبل هذا الـrefactor).
 *   - transportTotal = weight × truckRate → قيمة نقلة القلاب، ومنها paid/remaining.
 *     هذا هو الحقل الوحيد الذي يُستخدم في حساب مستحقات القلاب (accountsService/statementService)
 *     — materialTotal لا يُستخدم هناك إطلاقًا، تفاديًا لأي خلط بين الجهتين.
 *
 * materialUnitPrice اختياري بلا default (تمامًا كما كان raw.price) — لا نفرض قيمة صفرية توهم
 * بسعر حقيقي. باقي الحقول الرقمية (weight/truckRate/paid) اختيارية بـdefault=0 تمامًا كما كانت
 * في tipperSchema القديم؛ paid تحديدًا تأكدنا أنها لم تكن Required في أي مكان بالكود القديم.
 */
const materialEntrySchema = new mongoose.Schema(
  {
    quarryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quarry' },
    crusher: { type: String, trim: true, default: '' },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
    truck: { type: String, trim: true, default: '' },

    weight: { type: Number, default: 0, min: 0 },

    materialUnitPrice: { type: Number, min: 0 }, // اختياري صراحةً — لا default (مطابق raw.price سابقًا)
    materialTotal: { type: Number, default: 0, min: 0 }, // مُشتق = weight × materialUnitPrice

    truckRate: { type: Number, default: 0, min: 0 },
    transportTotal: { type: Number, default: 0, min: 0 }, // مُشتق = weight × truckRate
    paid: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 }, // مُشتق = max(transportTotal - paid, 0)
  },
  { _id: false },
);

const loadingEntrySchema = new mongoose.Schema(
  {
    fineness: { type: String, trim: true, default: '' },
    weight: { type: Number, default: 0, min: 0 },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customer: { type: String, trim: true, default: '' },
    packaging: { type: String, trim: true, default: '' },
    price: { type: Number, default: 0, min: 0 },
    payment: { type: String, enum: [...PAYMENT_METHODS, ''], default: 'نقدي' },
    paid: { type: Number, default: 0, min: 0 }, // مُشتق
    remaining: { type: Number, default: 0, min: 0 }, // مُشتق
    // ——— بيانات القلاب/السيارة والسائق الخاصة بعملية التحميل (خروج البضاعة) ———
    driverName: { type: String, trim: true, default: '' },
    vehiclePlateNumber: { type: String, trim: true, default: '' },
    driverIdNumber: { type: String, trim: true, default: '' },
    vehicleType: { type: String, trim: true, default: '' }, // يُتحقق ديناميكيًا مقابل MaterialOption.vehicleTypes
  },
  { _id: false },
);

const expenseEntrySchema = new mongoose.Schema(
  {
    category: { type: String, trim: true, default: '' },
    type: { type: String, trim: true, default: '' },
    amount: { type: Number, default: 0, min: 0 },
    entity: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const dailyReportSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },
    managers: { type: [String], default: [] },
    shifts: { type: [{ type: String, enum: SHIFTS }], default: [] },

    materials: { type: [materialEntrySchema], default: [] },

    shiftTeams: { type: [shiftTeamSchema], default: [] },

    // حقول مُشتقة (Flattened) للتوافق مع الصفحات التي تقرأها مباشرة (Dashboard، التقرير الأسبوعي)
    operator: { type: String, trim: true, default: '' },
    workersCount: { type: Number, default: 0, min: 0 },
    workers: { type: [workerEntrySchema], default: [] },

    loading: { type: [loadingEntrySchema], default: [] },
    expenses: { type: [expenseEntrySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

dailyReportSchema.index({ date: -1 }, { name: 'date_desc' });
dailyReportSchema.index({ 'materials.quarryId': 1 }, { name: 'materials_quarry_idx' });
dailyReportSchema.index({ 'materials.truckId': 1 }, { name: 'materials_truck_idx' });
dailyReportSchema.index({ 'loading.customerId': 1 }, { name: 'loading_customer_idx' });
dailyReportSchema.index({ 'shiftTeams.workers.workerId': 1 }, { name: 'shiftteam_worker_idx' });
dailyReportSchema.index({ 'workers.workerId': 1 }, { name: 'flat_worker_idx' }); // الحقل المجمّع الفعلي المستخدم في الإحصائيات (computeWorkerStats بالفرونت)

export default mongoose.model('DailyReport', dailyReportSchema);
