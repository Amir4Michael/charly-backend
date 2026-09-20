import MaterialOption from '../models/MaterialOption.js';
import { MATERIAL_CATEGORIES } from '../models/MaterialOption.js';
import DailyReport from '../models/DailyReport.js';

/** يُرجع {fineness:[], packagingLoading:[], vehicleTypes:[]} — فقط الفئات الحالية.
 *
 * ⚠️ إصلاح باج حرج: كانت هذه الدالة تجلب كل مستندات MaterialOption بلا استثناء (بما فيها أي
 * مستندات قديمة بفئات أُلغيت زمان مثل rawTypes/packagingProduction، ولا تزال موجودة فعليًا في
 * قاعدة الإنتاج لأنها لم تُحذف عند إلغاء الفئتين، كما هو موثّق أعلاه)، ثم تحاول تجميعها في كائن
 * مبني من MATERIAL_CATEGORIES الحالية فقط — فكانت ترمي خطأ فوري (Cannot read properties of
 * undefined) بمجرد وجود مستند واحد بفئة قديمة، لأن المفتاح المقابل لها لم يعد موجودًا في
 * الكائن. وبما أن هذه الدالة تُستدعى أيضًا من dailyReportService عند إنشاء/تعديل أي تقرير
 * يومي (للتحقق من صحة القيم)، كان هذا يعني فشل حفظ أي تقرير يومي بالكامل، وليس فقط صفحة
 * الخامات — الآن نفلتر على مستوى الاستعلام نفسه فلا نجلب أصلًا إلا الفئات الحالية المعروفة. */
export async function getMaterials() {
  const options = await MaterialOption.find({ isActive: true, category: { $in: MATERIAL_CATEGORIES } }).sort({ value: 1 });
  const grouped = Object.fromEntries(MATERIAL_CATEGORIES.map((c) => [c, []]));
  for (const opt of options) {
    grouped[opt.category].push(opt.value);
  }
  return grouped;
}

/** إضافة قيمة جديدة — Idempotent مثل addToList بالفرونت (لا يُنشئ تكرارًا، يُرجع الموجود إن وُجد) */
export async function addOption(category, value) {
  const trimmed = String(value).trim();
  const existing = await MaterialOption.findOne({ category, value: trimmed });
  if (existing) return { option: existing, created: false };
  const option = await MaterialOption.create({ category, value: trimmed });
  return { option, created: true };
}

export async function removeOption(category, value) {
  return MaterialOption.findOneAndDelete({ category, value });
}

/**
 * الجزء النقي (Pure) من حساب التقرير — يستقبل مصفوفة تقارير جاهزة (materials + loading فقط)
 * بدل استعلام DB مباشرة، فيسهل اختباره بمعزل تمامًا مثل checkDynamicEnums في dailyReportService.js.
 *
 * ⚠️ تغيير بعد إعادة الهيكلة (raw{} → materials[]): "نوع الخامة" (raw.type) حُذف بالكامل من
 * النظام، فلم يعد ممكنًا تصنيف "الداخل" حسب نوع الخامة كما كان سابقًا (incomingByType).
 * تم التصنيف بدلًا من ذلك حسب "الكسارة" (incomingByQuarry) — أقرب تصنيف منطقي متاح الآن،
 * ويدعم أيضًا وجود أكثر من صف/كسارة في نفس التقرير (وهو ما لم يكن ممكنًا في raw{} القديم).
 * أيضًا لم تعد هناك وحدة وزن (طن/كيلو) — الوزن بالطن دائمًا الآن، فحذفت أي تحويل وحدات.
 */
export function computeInventoryFromReports(reports) {
  const incomingByQuarry = {};
  let incomingTotal = 0;
  let incomingValue = 0;
  let hasAnyPrice = false;

  reports.forEach((r) => {
    (r.materials || []).forEach((m) => {
      if (!m.weight) return;
      const tons = Number(m.weight) || 0;
      const label = m.crusher || 'غير محدد';
      incomingTotal += tons;
      if (!incomingByQuarry[label]) incomingByQuarry[label] = { count: 0, tons: 0, value: 0, hasPrice: false };
      incomingByQuarry[label].count += 1;
      incomingByQuarry[label].tons += tons;
      if (Number(m.materialUnitPrice) > 0) {
        const value = tons * Number(m.materialUnitPrice);
        incomingByQuarry[label].value += value;
        incomingByQuarry[label].hasPrice = true;
        incomingValue += value;
        hasAnyPrice = true;
      }
    });
  });

  const outputByFineness = {};
  let outputTotal = 0;
  reports.forEach((r) => {
    (r.loading || []).forEach((l) => {
      if (!l.fineness) return;
      const tons = Number(l.weight) || 0;
      outputTotal += tons;
      if (!outputByFineness[l.fineness]) outputByFineness[l.fineness] = { count: 0, tons: 0 };
      outputByFineness[l.fineness].count += 1;
      outputByFineness[l.fineness].tons += tons;
    });
  });

  return {
    incomingByQuarry,
    incomingTotal,
    incomingValue,
    hasAnyPrice,
    outputByFineness,
    outputTotal,
    remaining: incomingTotal - outputTotal,
  };
}

/**
 * تقرير الخامات (الداخل/المُنتَج/المتبقي) — مطابق تمامًا لمنطق MaterialsPage.jsx بالفرونت
 * (حلقة JS بسيطة على حقلين بعد جلب projection صغيرة، وليس Aggregation Pipeline)، لأن هذا
 * حساب بسيط (Reduce على حقلين) ويُفضَّل هنا ضمان التطابق الحرفي مع الفرونت على تعقيد الـPipeline.
 * التحذير حول دقة "المتبقي" التقديري نفسه المعروض حاليًا في الصفحة موثّق هنا وفي BACKEND_BLUEPRINT.md.
 */
export async function getInventoryReport({ from, to } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const reports = await DailyReport.find(filter).select('date materials loading');
  return computeInventoryFromReports(reports);
}
