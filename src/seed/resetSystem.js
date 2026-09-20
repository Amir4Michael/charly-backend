import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

import DailyReport from '../models/DailyReport.js';
import Customer from '../models/Customer.js';
import Quarry from '../models/Quarry.js';
import Truck from '../models/Truck.js';
import Worker from '../models/Worker.js';
import Supplier from '../models/Supplier.js';
import Expense from '../models/Expense.js';
import GeneralSale from '../models/GeneralSale.js';
import HistoricalTransaction from '../models/HistoricalTransaction.js';
import WeeklySchedule from '../models/WeeklySchedule.js';
import MaterialOption, { MATERIAL_CATEGORIES } from '../models/MaterialOption.js';
import User from '../models/User.js';

/**
 * تصفير كامل للنظام — يمسح كل البيانات التشغيلية (تقارير، عملاء، كسارات، قلابات، عمال،
 * موردين، مصاريف، مبيعات عامة، عمليات قديمة، جدول أسبوعي)، يعيد زرع قوائم الخامات
 * الافتراضية (فارغة بدونها هتلاقي القوائم فاضية في التقرير اليومي)، ويمسح كل المستخدمين
 * القدامى ويعمل حساب أدمن واحد جديد بكلمة المرور اللي هتحددها إنت.
 *
 * ⚠️ الملف مايمسحش: Settings (إعدادات المصنع — لو عايز تصفرها روح صفحة "الإعدادات" في
 * النظام نفسه وعدّلها يدويًا، أسهل من مسحها من هنا).
 *
 * الاستخدام (لازم تحدد كلمة مرور جديدة، وإلا السكريبت هيرفض يشتغل حماية من التنفيذ بالغلط):
 *   node src/seed/resetSystem.js "كلمة-المرور-الجديدة-بتاعتك"
 *
 * أو عن طريق npm:
 *   npm run reset:system -- "كلمة-المرور-الجديدة-بتاعتك"
 */

const newPassword = process.argv[2];

async function reset() {
  if (!newPassword || newPassword.trim().length < 6) {
    console.error('❌ لازم تحدد كلمة مرور جديدة (6 أحرف على الأقل) كـ argument:');
    console.error('   node src/seed/resetSystem.js "كلمة-المرور-الجديدة"');
    process.exit(1);
  }

  await connectDB();
  console.log('🔌 تم الاتصال بقاعدة البيانات.\n');

  console.log('🗑️  جاري مسح كل البيانات التشغيلية...');
  const results = await Promise.all([
    DailyReport.deleteMany({}),
    Customer.deleteMany({}),
    Quarry.deleteMany({}),
    Truck.deleteMany({}),
    Worker.deleteMany({}),
    Supplier.deleteMany({}),
    Expense.deleteMany({}),
    GeneralSale.deleteMany({}),
    HistoricalTransaction.deleteMany({}),
    WeeklySchedule.deleteMany({}),
  ]);
  const labels = ['التقارير اليومية', 'العملاء', 'الكسارات', 'القلابات', 'العمال', 'الموردون', 'المصاريف', 'المبيعات العامة', 'العمليات القديمة', 'الجدول الأسبوعي'];
  results.forEach((r, i) => console.log(`   ✓ ${labels[i]}: ${r.deletedCount} سجل اتمسح`));

  console.log('\n🌱 جاري إعادة زرع قوائم الخامات الافتراضية...');
  await MaterialOption.deleteMany({});
  const DEFAULTS = {
    fineness: ['45M', '50M', '60M', '80M', '100M'],
    packagingLoading: ['سايلو', 'شكارة 25', 'شكارة 50', 'جامبو'],
    vehicleTypes: ['جرار', 'وش', 'تريلة', 'جامبو'],
  };
  for (const category of MATERIAL_CATEGORIES) {
    for (const value of DEFAULTS[category] || []) {
      await MaterialOption.create({ category, value });
    }
  }
  console.log('   ✓ قوائم الخامات رجعت للقيم الافتراضية.');

  console.log('\n👤 جاري مسح كل المستخدمين القدامى وإنشاء حساب أدمن جديد...');
  await User.deleteMany({});
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const admin = await User.create({
    name: 'مدير النظام',
    username: 'admin',
    role: 'admin',
    phone: '',
    active: true,
    passwordHash,
  });
  console.log(`   ✓ تم إنشاء حساب: ${admin.username} — بكلمة المرور اللي حددتها.`);

  console.log('\n✅ تم تصفير النظام بالكامل بنجاح.');
  console.log('   سجّل دخول بـ username: admin وكلمة المرور اللي حددتها دلوقتي.');
  console.log('   ملاحظة: إعدادات المصنع (اسم/عنوان/تليفون) لم تتأثر — عدّلها من صفحة "الإعدادات" لو حابب.');

  await mongoose.disconnect();
  process.exit(0);
}

reset().catch((err) => {
  console.error('❌ حصل خطأ أثناء التصفير:', err);
  process.exit(1);
});
