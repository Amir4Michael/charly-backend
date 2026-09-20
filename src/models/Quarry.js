import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Quarry (الكسارة) — مطابق لـquarriesService.js في الفرونت بالضبط.
 * name فريد عبر unique:true على الحقل نفسه (كافٍ وحده). */
const quarrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    owner: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

export default mongoose.model('Quarry', quarrySchema);
