import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * DailyReport — المستند الأهم في النظام. مطابق بالكامل لما يرسله DailyReportFormPage.jsx
 * حاليًا عبر saveReport()، بما فيه دعم أكثر من وردية/مشغل (shiftTeams) وسعر الخامة (raw.price).
 * القرار الكامل (لماذا Embedded وليس References للأقسام الفرعية) موثّق في BACKEND_BLUEPRINT.md قسم 5.
 *
 * ملاحظة تصميم مهمة: raw.type / production.fineness / production.packaging / loading.fineness /
 * loading.packaging نصوص حرة بدون enum ثابت هنا في الـSchema، لأنها مرتبطة بـMaterialOption
 * (قابلة للإضافة من المستخدم عبر صفحة الخامات) — التحقق من صحتها يتم ديناميكيًا في
 * dailyReportService.js وقت الحفظ، وليس عبر enum ثابت كان سيكسر أي قيمة جديدة يضيفها المستخدم.
 */

const SHIFTS = ['وردية 1', 'وردية 2', 'وردية 3'];
const WEIGHT_UNITS = ['طن', 'كيلو'];
const PAYMENT_METHODS = ['نقدي', 'آجل'];
const STOP_REASONS = ['انقطاع كهرباء', 'عطل ميكانيكي', 'صيانة مجدولة', 'نقص خامة', 'انتهاء الطلب', 'أسباب أخرى'];

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

const tipperSchema = new mongoose.Schema(
  {
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Truck' },
    name: { type: String, trim: true, default: '' },
    weight: { type: Number, default: 0, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 }, // مُشتق = weight * rate
    paid: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 }, // مُشتق
  },
  { _id: false },
);

const operatingHoursSchema = new mongoose.Schema(
  {
    runStart: { type: String, trim: true, default: '' },
    runEnd: { type: String, trim: true, default: '' },
    runHours: { type: Number, default: 0, min: 0 }, // مُشتق من runStart/runEnd
    stopHours: { type: Number, default: 0, min: 0 },
    stopReason: { type: String, enum: [...STOP_REASONS, ''], default: '' },
  },
  { _id: false },
);

const productionEntrySchema = new mongoose.Schema(
  {
    fineness: { type: String, trim: true, default: '' }, // يُتحقق ديناميكيًا مقابل MaterialOption
    hours: { type: Number, default: 0, min: 0 },
    packaging: { type: String, trim: true, default: '' }, // يُتحقق ديناميكيًا
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customer: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0, min: 0 }, // ⚠️ الفورم الحالي بالفرونت لا يجمع هذا الحقل بعد (موثّق بالـBlueprint)
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

const rawSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: '' },
    weight: { type: Number, default: 0, min: 0 },
    unit: { type: String, enum: [...WEIGHT_UNITS, ''], default: 'طن' },
    crusher: { type: String, trim: true, default: '' },
    quarryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quarry' },
    price: { type: Number, min: 0 }, // اختياري صراحةً — لا default يفرض قيمة
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

    raw: { type: rawSchema, default: () => ({}) },

    tippers: { type: [tipperSchema], default: [] },
    operatingHours: { type: [operatingHoursSchema], default: [] },
    shiftTeams: { type: [shiftTeamSchema], default: [] },

    // حقول مُشتقة (Flattened) للتوافق مع الصفحات التي تقرأها مباشرة (Dashboard، التقرير الأسبوعي)
    operator: { type: String, trim: true, default: '' },
    workersCount: { type: Number, default: 0, min: 0 },
    workers: { type: [workerEntrySchema], default: [] },

    production: { type: [productionEntrySchema], default: [] },
    loading: { type: [loadingEntrySchema], default: [] },
    expenses: { type: [expenseEntrySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

dailyReportSchema.index({ date: -1 }, { name: 'date_desc' });
dailyReportSchema.index({ 'raw.quarryId': 1 }, { name: 'raw_quarry_idx' });
dailyReportSchema.index({ 'tippers.truckId': 1 }, { name: 'tippers_truck_idx' });
dailyReportSchema.index({ 'production.customerId': 1 }, { name: 'production_customer_idx' });
dailyReportSchema.index({ 'loading.customerId': 1 }, { name: 'loading_customer_idx' });
dailyReportSchema.index({ 'shiftTeams.workers.workerId': 1 }, { name: 'shiftteam_worker_idx' });
dailyReportSchema.index({ 'workers.workerId': 1 }, { name: 'flat_worker_idx' }); // الحقل المجمّع الفعلي المستخدم في الإحصائيات (computeWorkerStats بالفرونت)

export default mongoose.model('DailyReport', dailyReportSchema);
