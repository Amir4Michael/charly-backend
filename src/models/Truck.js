import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Truck (القلاب) — مطابق لـtrucksService.js في الفرونت بالضبط.
 * name فريد عبر unique:true على الحقل نفسه (كافٍ وحده). */
const truckSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    driver: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    plateNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

export default mongoose.model('Truck', truckSchema);
