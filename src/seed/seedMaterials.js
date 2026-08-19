import 'dotenv/config';
import connectDB from '../config/db.js';
import MaterialOption from '../models/MaterialOption.js';
import mongoose from 'mongoose';

/**
 * يزرع القيم الافتراضية لكل فئات MaterialOption — بما فيها "vehicleTypes" الجديدة
 * (جرار/وش/تريلة/جامبو) المطلوبة لقسم التحميل. Idempotent تمامًا مثل seedUsers.js:
 * أي قيمة موجودة بالفعل يتم تخطيها بدون أي تأثير على البيانات الحالية.
 *
 * ملاحظة: هذا السكربت يملأ أيضًا فجوة كانت موجودة من قبل — القوائم الأربعة الأصلية
 * (rawTypes/fineness/packagingProduction/packagingLoading) لم يكن لها أي Seed سابقًا،
 * وكانت ستبدأ فارغة تمامًا في أي قاعدة بيانات جديدة حتى يضيفها المدير يدويًا.
 *
 * تشغيل: npm run seed:materials
 */
const DEFAULTS = {
  rawTypes: ['بودرة', 'مقروش', 'مخلط'],
  fineness: ['45M', '50M', '60M', '80M', '100M'],
  packagingProduction: ['جامبو', 'شكارة', 'سايلو'],
  packagingLoading: ['سايلو', 'شكارة 25', 'شكارة 50', 'جامبو'],
  vehicleTypes: ['جرار', 'وش', 'تريلة', 'جامبو'],
};

async function seed() {
  await connectDB();
  let created = 0;
  let skipped = 0;

  for (const [category, values] of Object.entries(DEFAULTS)) {
    for (const value of values) {
      const existing = await MaterialOption.findOne({ category, value });
      if (existing) {
        console.log(`↷ موجود بالفعل، تم تخطيه: [${category}] ${value}`);
        skipped++;
        continue;
      }
      await MaterialOption.create({ category, value });
      console.log(`✅ تمت الإضافة: [${category}] ${value}`);
      created++;
    }
  }

  console.log(`\nتمت عملية الزرع بنجاح — تم إنشاء ${created} عنصر، وتخطي ${skipped} عنصر موجود مسبقًا.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ فشل الزرع:', err);
  process.exit(1);
});
