import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/** Customer — مطابق لـcustomersService.js في الفرونت بالضبط.
 * name فريد عبر unique:true على الحقل نفسه (كافٍ وحده — لا نضيف .index({name:1}) منفصل
 * فوقه، لأن ده كان بيبني فهرسين متطابقين بالضبط على نفس الحقل بلا أي فائدة إضافية). */
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

export default mongoose.model('Customer', customerSchema);
