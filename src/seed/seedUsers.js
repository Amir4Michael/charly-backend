import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * يزرع نفس المستخدمين التجريبيين الموجودين في MOCK_USERS بالفرونت (data/mockData.js)
 * بنفس الأسماء والأدوار وحالة التفعيل، مع إضافة username + كلمة مرور افتراضية
 * (SEED_DEFAULT_PASSWORD من .env، القيمة الافتراضية نفس كلمة المرور التجريبية القديمة).
 *
 * تشغيل: npm run seed:users
 */
const DEMO_USERS = [
  { name: 'مدير المصنع', username: 'admin', role: 'admin', phone: '01012345678', active: true },
  { name: 'المشرف الأول', username: 'supervisor', role: 'viewer', phone: '01098765432', active: true },
  { name: 'محاسب المصنع', username: 'accountant', role: 'viewer', phone: '01055443322', active: false },
];

async function seed() {
  await connectDB();
  const password = process.env.SEED_DEFAULT_PASSWORD || '123456789';
  const passwordHash = await bcrypt.hash(password, 12);

  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ username: demo.username });
    if (existing) {
      console.log(`↷ المستخدم موجود بالفعل، تم تخطيه: ${demo.username}`);
      continue;
    }
    await User.create({ ...demo, passwordHash });
    console.log(`✅ تم إنشاء المستخدم: ${demo.username} (${demo.name}) — كلمة المرور الافتراضية: ${password}`);
  }

  console.log('تمت عملية الزرع بنجاح.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ فشل الزرع:', err);
  process.exit(1);
});
