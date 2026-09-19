import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * MaterialOption — بديل مُطبَّع (Normalized) لمصفوفات materialsService.js بالفرونت.
 * أسماء الـcategory هنا مطابقة حرفيًا لمفاتيح DEFAULTS في materialsService.js حتى يكون
 * تجميع الاستجابة في الـController مباشرًا.
 *
 * ملاحظة بعد إعادة الهيكلة: فئتا rawTypes (كانت لـ"نوع الخامة") وpackagingProduction (كانت
 * لقسم "الإنتاج والتعبئة") حُذفتا نهائيًا من هنا — الحقل الأول أُلغي بالكامل من التقرير اليومي،
 * والقسم الثاني أُلغي بالكامل هو نفسه. أي قيم كانت مخزّنة سابقًا تحت الفئتين دول في قاعدة
 * البيانات تظل موجودة كسجلات (لم تُحذف بيانات)، لكنها لن تظهر في getMaterials() بعد الآن
 * لأنها لم تعد ضمن MATERIAL_CATEGORIES، ولن تُقرأ أو تُستخدم من أي مكان في الكود.
 */
export const MATERIAL_CATEGORIES = ['fineness', 'packagingLoading', 'vehicleTypes'];

const materialOptionSchema = new mongoose.Schema(
  {
    category: { type: String, enum: MATERIAL_CATEGORIES, required: true },
    value: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  withIdTransform({ timestamps: true }),
);

materialOptionSchema.index({ category: 1, value: 1 }, { unique: true, name: 'category_value_unique' });

export default mongoose.model('MaterialOption', materialOptionSchema);
