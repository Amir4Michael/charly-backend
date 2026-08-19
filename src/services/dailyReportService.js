import DailyReport from '../models/DailyReport.js';
import quarryService from './quarryService.js';
import truckService from './truckService.js';
import workerService from './workerService.js';
import customerService from './customerService.js';
import { getMaterials } from './materialOptionService.js';
import { hoursBetween } from '../utils/time.js';
import { ApiError } from '../utils/apiResponse.js';

/**
 * يتحقق أن كل القيم الديناميكية (نوع الخامة، درجة النعومة، نوع العبوة) موجودة فعليًا
 * ضمن قوائم MaterialOption الحالية — تمامًا كما يعرضها الفرونت في القوائم المنسدلة،
 * بدلاً من enum ثابت كان سيرفض أي قيمة جديدة يضيفها المستخدم عبر صفحة الخامات.
 * لا يرفض القيمة الفارغة (الحقل اختياري في أغلب الأحيان)، فقط يرفض قيمة غير فارغة وغير معروفة.
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

  checkValue(payload.raw?.type, materials.rawTypes, 'نوع الخامة');
  (payload.production || []).forEach((p, i) => {
    checkValue(p.fineness, materials.fineness, `درجة نعومة الإنتاج #${i + 1}`);
    checkValue(p.packaging, materials.packagingProduction, `عبوة الإنتاج #${i + 1}`);
  });
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
 * ثم يعيد حساب كل الحقول المُشتقة (totals, remaining, runHours, operator/workersCount/workers).
 */
async function prepareReportPayload(input) {
  const payload = { ...input };

  // ——— الخامة والكسارة ———
  if (payload.raw?.crusher?.trim()) {
    const quarry = await quarryService.findOrCreateByName(payload.raw.crusher);
    payload.raw.quarryId = quarry._id;
  }

  // ——— القلابات ———
  payload.tippers = await Promise.all(
    (payload.tippers || [])
      .filter((t) => t.name?.trim())
      .map(async (t) => {
        const truck = await truckService.findOrCreateByName(t.name);
        const weight = Number(t.weight) || 0;
        const rate = Number(t.rate) || 0;
        const paid = Number(t.paid) || 0;
        const total = weight * rate;
        return { ...t, truckId: truck._id, weight, rate, paid, total, remaining: Math.max(total - paid, 0) };
      }),
  );

  // ——— ساعات التشغيل ———
  payload.operatingHours = (payload.operatingHours || [])
    .filter((h) => h.runStart || h.runEnd || h.stopHours)
    .map((h) => ({ ...h, runHours: hoursBetween(h.runStart, h.runEnd), stopHours: Number(h.stopHours) || 0 }));

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

  // ——— الإنتاج والتعبئة ———
  payload.production = await Promise.all(
    (payload.production || [])
      .filter((p) => p.fineness || p.customer)
      .map(async (p) => {
        const customerId = p.customer?.trim() ? (await customerService.findOrCreateByName(p.customer))._id : undefined;
        return { ...p, customerId };
      }),
  );

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
