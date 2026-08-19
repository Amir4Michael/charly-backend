import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Customer — مطابق لـcustomersService.js في الفرونت بالضبط */
const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    contactPerson: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

customerSchema.index({ name: 1 }, { unique: true, name: 'customer_name_unique' });

export default mongoose.model('Customer', customerSchema);
