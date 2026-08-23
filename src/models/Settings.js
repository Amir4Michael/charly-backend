import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * Settings — مستند Singleton واحد فقط (مطابق DEFAULT_SETTINGS في mockData.js بالفرونت).
 * لا Multi-tenancy حاليًا — يُستعلَم دائمًا بفلتر فارغ {} ويُفترض وجود مستند واحد فقط،
 * يُنشأ تلقائيًا بالقيم الافتراضية أول مرة يُطلب فيها (انظر settingsService.js).
 */
const settingsSchema = new mongoose.Schema(
  {
    factoryName: { type: String, required: true, trim: true, default: 'مصنع شارلي لكربونات الكالسيوم' },
    address: { type: String, trim: true, default: 'المنيا — مصر' },
    phone: { type: String, trim: true, default: '01012345678' },
    email: { type: String, trim: true, default: '' },
    taxNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

export default mongoose.model('Settings', settingsSchema);
