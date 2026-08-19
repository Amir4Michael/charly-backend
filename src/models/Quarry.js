import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Quarry (الكسارة) — مطابق لـquarriesService.js في الفرونت بالضبط */
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

quarrySchema.index({ name: 1 }, { unique: true, name: 'quarry_name_unique' });

export default mongoose.model('Quarry', quarrySchema);
