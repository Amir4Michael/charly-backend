import MaterialOption from '../models/MaterialOption.js';
import { MATERIAL_CATEGORIES } from '../models/MaterialOption.js';
import DailyReport from '../models/DailyReport.js';

/** يُرجع نفس شكل getMaterials() بالفرونت بالضبط: { rawTypes:[], fineness:[], packagingProduction:[], packagingLoading:[] } */
export async function getMaterials() {
  const options = await MaterialOption.find({ isActive: true }).sort({ value: 1 });
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

function toTons(weight, unit) {
  const w = Number(weight) || 0;
  return unit === 'كيلو' ? w / 1000 : w;
}

/**
 * الجزء النقي (Pure) من حساب التقرير — يستقبل مصفوفة تقارير جاهزة (raw + loading فقط)
 * بدل استعلام DB مباشرة، فيسهل اختباره بمعزل تمامًا مثل checkDynamicEnums في dailyReportService.js.
 */
export function computeInventoryFromReports(reports) {
  const incomingByType = {};
  let incomingTotal = 0;
  let incomingValue = 0;
  let hasAnyPrice = false;

  reports.forEach((r) => {
    const raw = r.raw;
    if (!raw?.type || !raw?.weight) return;
    const tons = toTons(raw.weight, raw.unit);
    incomingTotal += tons;
    if (!incomingByType[raw.type]) incomingByType[raw.type] = { count: 0, tons: 0, value: 0, hasPrice: false };
    incomingByType[raw.type].count += 1;
    incomingByType[raw.type].tons += tons;
    if (Number(raw.price) > 0) {
      const value = tons * Number(raw.price);
      incomingByType[raw.type].value += value;
      incomingByType[raw.type].hasPrice = true;
      incomingValue += value;
      hasAnyPrice = true;
    }
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
    incomingByType,
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
  const reports = await DailyReport.find(filter).select('date raw loading');
  return computeInventoryFromReports(reports);
}
