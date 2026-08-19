import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Truck (القلاب) — مطابق لـtrucksService.js في الفرونت بالضبط */
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

truckSchema.index({ name: 1 }, { unique: true, name: 'truck_name_unique' });

export default mongoose.model('Truck', truckSchema);
