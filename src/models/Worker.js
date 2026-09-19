import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Worker (عامل/مشغل/مدير) — مطابق لـworkersService.js في الفرونت بالضبط.
 * "المشغل" (Operator) و"مدير المصنع" (Manager) ليسا Model منفصل — كل منهما Worker بـ
 * job='مشغل' أو job='مدير' على التوالي (نفس منطق الفرونت). أُضيفت 'مدير' هنا حتى يمكن
 * إدارة مديري المصنع عبر نفس صفحة/CRUD العمال الموجودة أصلًا، بدل إنشاء Entity وBackend
 * منفصلين بالكامل لمفهوم لا يختلف عن Worker في شيء غير التسمية والاستخدام في التقرير اليومي. */
export const WORKER_JOBS = ['مدير', 'مشغل', 'ميكانيكي', 'كهربائي', 'سائق', 'عامل إنتاج', 'عامل تحميل', 'حارس'];

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
