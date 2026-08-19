import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Worker (عامل/مشغل) — مطابق لـworkersService.js في الفرونت بالضبط.
 * "المشغل" (Operator) ليس Model منفصل — هو Worker بـ job = 'مشغل' (نفس منطق الفرونت). */
export const WORKER_JOBS = ['مشغل', 'ميكانيكي', 'كهربائي', 'سائق', 'عامل إنتاج', 'عامل تحميل', 'حارس'];

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    job: { type: String, enum: [...WORKER_JOBS, ''], default: '' },
    phone: { type: String, trim: true, default: '' },
    dailyRate: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

workerSchema.index({ name: 1 }, { unique: true, name: 'worker_name_unique' });

export default mongoose.model('Worker', workerSchema);
