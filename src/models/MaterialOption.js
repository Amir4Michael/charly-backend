import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * MaterialOption — بديل مُطبَّع (Normalized) للأربع مصفوفات في materialsService.js بالفرونت
 * (rawTypes, fineness, packagingProduction, packagingLoading). القرار والسبب موثّقان في
 * BACKEND_BLUEPRINT.md قسم 1.2. أسماء الـcategory هنا مطابقة حرفيًا لمفاتيح
 * DEFAULTS في materialsService.js حتى يكون تجميع الاستجابة في الـController مباشرًا.
 */
export const MATERIAL_CATEGORIES = ['rawTypes', 'fineness', 'packagingProduction', 'packagingLoading', 'vehicleTypes'];

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
