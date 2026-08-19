import { ApiError } from './apiResponse.js';

/**
 * مصنع خدمات CRUD عام — يُستخدم للكيانات المرجعية البسيطة المتطابقة في النمط
 * (Customer, Quarry, Truck, Worker): كلها CRUD قياسي + بحث بالاسم + findOrCreate بالاسم
 * (سيُستخدم findOrCreateByName لاحقًا داخليًا من خدمة DailyReport في المرحلة 5،
 * تمامًا مثل findOrCreateCustomer/findOrCreateQuarry/... في الفرونت الحالي).
 *
 * هذا ليس Overengineering — فقط لمنع تكرار نفس 20 سطر أربع مرات لأربعة موديلات متطابقة الشكل.
 */
export function createCrudService(Model, entityLabel) {
  return {
    async list(filter = {}) {
      return Model.find(filter).sort({ name: 1 });
    },

    async getById(id) {
      const doc = await Model.findById(id);
      if (!doc) throw new ApiError(404, `${entityLabel} غير موجود`);
      return doc;
    },

    async create(data) {
      return Model.create(data);
    },

    async update(id, patch) {
      const doc = await Model.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
      if (!doc) throw new ApiError(404, `${entityLabel} غير موجود`);
      return doc;
    },

    async remove(id) {
      const doc = await Model.findByIdAndDelete(id);
      if (!doc) throw new ApiError(404, `${entityLabel} غير موجود`);
      return doc;
    },

    /**
     * يبحث عن سجل بنفس الاسم بالضبط، وإن لم يوجد يُنشئه — يطابق منطق
     * findOrCreateCustomer/findOrCreateQuarry/findOrCreateTruck/findOrCreateWorker بالفرونت.
     * يُستخدم من داخل خدمة DailyReport وليس Endpoint عام مباشر.
     */
    async findOrCreateByName(name, extra = {}) {
      const trimmed = String(name).trim();
      const existing = await Model.findOne({ name: trimmed });
      if (existing) return existing;
      return Model.create({ name: trimmed, ...extra });
    },
  };
}
