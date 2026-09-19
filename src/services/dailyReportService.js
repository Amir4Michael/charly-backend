import DailyReport from '../models/DailyReport.js';
import quarryService from './quarryService.js';
import truckService from './truckService.js';
import workerService from './workerService.js';
import customerService from './customerService.js';
import { getMaterials } from './materialOptionService.js';
import { ApiError } from '../utils/apiResponse.js';

/**
 * يتحقق أن كل القيم الديناميكية (درجة النعومة، نوع العبوة، نوع السيارة) موجودة فعليًا
 * ضمن قوائم MaterialOption الحالية — تمامًا كما يعرضها الفرونت في القوائم المنسدلة،
 * بدلاً من enum ثابت كان سيرفض أي قيمة جديدة يضيفها المستخدم عبر صفحة الخامات.
 * لا يرفض القيمة الفارغة (الحقل اختياري في أغلب الأحيان)، فقط يرفض قيمة غير فارغة وغير معروفة.
 *
 * ملاحظة بعد إعادة الهيكلة: لم يعد هناك تحقق على "نوع الخامة" (raw.type حُذف بالكامل من
 * التقرير) ولا على حقول production (القسم حُذف بالكامل) — بقي فقط تحقق حقول loading.
 */
/**
 * الجزء النقي (Pure) من التحقق — يستقبل قوائم المواد جاهزة بدل استعلام DB مباشرة،
 * فيسهل اختباره بمعزل، ويظل reused من الدالة التي تجلب القوائم فعليًا من MaterialOption.
 */
export function checkDynamicEnums(payload, materials) {
  const errors = [];

  const checkValue = (value, list, fieldLabel) => {
    if (value && !list.includes(value)) {
      errors.push(`${fieldLabel}: "${value}" غير موجود ضمن القوائم الحالية`);
    }
  };

  (payload.loading || []).forEach((l, i) => {
    checkValue(l.fineness, materials.fineness, `درجة نعومة التحميل #${i + 1}`);
    checkValue(l.packaging, materials.packagingLoading, `عبوة التحميل #${i + 1}`);
    checkValue(l.vehicleType, materials.vehicleTypes, `نوع سيارة التحميل #${i + 1}`);
  });

  return errors;
}

async function validateDynamicEnums(payload) {
  const materials = await getMaterials();
  const errors = checkDynamicEnums(payload, materials);
  if (errors.length) {
    throw new ApiError(400, 'بعض القيم غير موجودة ضمن قوائم الخامات الحالية', errors);
  }
}

/**
 * يربط كل الأسماء النصية (كسارة/قلاب/عميل/عامل) بمعرّفاتها الحقيقية عبر findOrCreateByName
 * (يُنشئ السجل تلقائيًا لو لم يوجد بعد) — نفس المنطق الذي كان يُنفَّذ من DailyReportFormPage.jsx
 * بالفرونت، لكن الآن في الـBackend كمصدر ثقة وحيد (Defense in depth).
 * ثم يعيد حساب كل الحقول المُشتقة (totals, remaining, operator/workersCount/workers).
 */
async function prepareReportPayload(input) {
  const payload = { ...input };

  // ——— الخامة: صفوف متعددة، كل صف = كسارة + قلاب + وزن + سعرين منفصلين ———
  // مصدرين ماليين منفصلين تمامًا لكل صف:
  //   materialTotal  = weight × materialUnitPrice  (قيمة الخامة — عرض فقط، لا تُستخدم في أي رصيد)
  //   transportTotal = weight × truckRate           (قيمة نقلة القلاب — مصدر paid/remaining القلاب)
  // الصف يُحفظ فقط لو فيه كسارة أو قلاب محدد (تمامًا كما كانت tippers تُفلتر بوجود اسم).
  payload.materials = await Promise.all(
    (payload.materials || [])
      .filter((m) => m.crusher?.trim() || m.truck?.trim())
      .map(async (m) => {
        const quarryId = m.crusher?.trim() ? (await quarryService.findOrCreateByName(m.crusher))._id : undefined;
        const truckId = m.truck?.trim() ? (await truckService.findOrCreateByName(m.truck))._id : undefined;

        const weight = Number(m.weight) || 0;

        // materialUnitPrice اختياري صراحةً بلا قيمة افتراضية (مطابق raw.price سابقًا) — لا نفرض
        // صفرًا يوهم بسعر حقيقي؛ لو لم يُدخَل، يبقى undefined ولا يدخل ضمن materialTotal.
        const hasPrice = m.materialUnitPrice !== undefined && m.materialUnitPrice !== null && m.materialUnitPrice !== '';
        const materialUnitPrice = hasPrice ? Number(m.materialUnitPrice) : undefined;
        const materialTotal = hasPrice ? weight * materialUnitPrice : 0;

        const truckRate = Number(m.truckRate) || 0;
        const paid = Number(m.paid) || 0;
        const transportTotal = weight * truckRate;

        return {
          ...m,
          quarryId,
          truckId,
          weight,
          materialUnitPrice,
          materialTotal,
          truckRate,
          transportTotal,
          paid,
          remaining: Math.max(transportTotal - paid, 0),
        };
      }),
  );

  // ——— فرق التشغيل (مشغل + عمال) لكل وردية ———
  const shiftTeams = await Promise.all(
    (payload.shiftTeams || []).map(async (team) => {
      const workers = await Promise.all(
        (team.workers || [])
          .filter((w) => w.name?.trim())
          .map(async (w) => {
            const worker = await workerService.findOrCreateByName(w.name);
            const dailyAmount = Number(w.dailyAmount) || 0;
            const paid = Number(w.paid) || 0;
            return { ...w, workerId: worker._id, dailyAmount, paid, remaining: Math.max(dailyAmount - paid, 0) };
          }),
      );
      return { ...team, workers };
    }),
  );
  payload.shiftTeams = shiftTeams.filter((t) => t.operator?.trim() || t.workers.length > 0);

  // ——— حقول مجمّعة متوافقة مع الصفحات القديمة (Dashboard، التقرير الأسبوعي) ———
  payload.operator = payload.shiftTeams[0]?.operator || '';
  payload.workersCount = payload.shiftTeams.reduce((s, t) => s + (Number(t.workersCount) || t.workers.length || 0), 0);
  payload.workers = payload.shiftTeams.flatMap((t) => t.workers);

  // ——— التحميل ———
  payload.loading = await Promise.all(
    (payload.loading || [])
      .filter((l) => l.fineness || l.customer)
      .map(async (l) => {
        const customerId = l.customer?.trim() ? (await customerService.findOrCreateByName(l.customer))._id : undefined;
        const weight = Number(l.weight) || 0;
        const price = Number(l.price) || 0;
        const total = weight * price;
        if (l.payment === 'نقدي') {
          return { ...l, customerId, weight, price, paid: total, remaining: 0 };
        }
        const paid = Number(l.paid) || 0;
        return { ...l, customerId, weight, price, paid, remaining: Math.max(total - paid, 0) };
      }),
  );

  // ——— المصاريف ———
  payload.expenses = (payload.expenses || []).filter((x) => x.type || x.amount || x.category);

  return payload;
}

export async function listReports({ from, to, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    DailyReport.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
    DailyReport.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

export async function getReportById(id) {
  const report = await DailyReport.findById(id);
  if (!report) throw new ApiError(404, 'التقرير اليومي غير موجود');
  return report;
}

export async function createReport(input, userId) {
  await validateDynamicEnums(input);
  const payload = await prepareReportPayload(input);
  return DailyReport.create({ ...payload, createdBy: userId, updatedBy: userId });
}

export async function updateReport(id, input, userId) {
  await validateDynamicEnums(input);
  const payload = await prepareReportPayload(input);
  const report = await DailyReport.findByIdAndUpdate(
    id,
    { ...payload, updatedBy: userId },
    { new: true, runValidators: true },
  );
  if (!report) throw new ApiError(404, 'التقرير اليومي غير موجود');
  return report;
}

export async function deleteReport(id) {
  const report = await DailyReport.findByIdAndDelete(id);
  if (!report) throw new ApiError(404, 'التقرير اليومي غير موجود');
  return report;
}
