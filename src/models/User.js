import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * User — مطابق لـ usersService.js في الفرونت (name, role, phone, active, lastLogin)
 * بالإضافة إلى username + passwordHash اللازمين لتسجيل دخول حقيقي
 * (غير موجودين في الفرونت الحالي — أُضيفا حسب "الخيار أ" في Backend Blueprint).
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'viewer'], required: true, default: 'viewer' },
    phone: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  withIdTransform({ timestamps: true }),
);

const User = mongoose.model('User', userSchema);
export default User;
