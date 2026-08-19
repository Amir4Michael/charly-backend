import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * Supplier — موردو مواد التعبئة (الشكاير / البالتات الخشب / الجامبو).
 *
 * قرار تصميم: Collection واحدة بحقل "type" مُميّز بدل 3 Collections منفصلة، لأن الثلاثة
 * أنواع متطابقة الحقول تمامًا (اسم، جهة اتصال، هاتف، عنوان، ملاحظات) — بعكس الكسارة/القلاب/
 * العامل/العميل الحاليين اللي كل واحد منهم له حقول مختلفة فعليًا (owner/driver+plateNumber/
 * job+dailyRate/contactPerson). هذا يطابق نفس منطق فصل rawTypes/fineness/... في MaterialOption
 * (فئات متجانسة الشكل، مُميَّزة بحقل category/type بدل تكرار Schema).
 *
 * ملاحظة نطاق: لا يوجد "كشف حساب" لهذه الأنواع (بعكس الكسارة) لأنه لا يوجد حاليًا أي ربط
 * بين هؤلاء الموردين وأي معاملة داخل DailyReport (لا يوجد قسم "شراء مواد تعبئة" بالتقرير
 * اليومي) — إضافة كشف حساب وهمي بدون بيانات حقيقية وراءه كانت ستكون بالضبط الـ"صفحة شكلية"
 * المطلوب تجنّبها. الميزة المُقدَّمة هنا: CRUD حقيقي كامل (إضافة/تعديل/حذف/بحث) مخزَّن في
 * MongoDB فعليًا، تمامًا كبقية صفحات البيانات الأساسية.
 */
export const SUPPLIER_TYPES = ['shukayer', 'woodenPallets', 'jumbo'];

const supplierSchema = new mongoose.Schema(
  {
    type: { type: String, enum: SUPPLIER_TYPES, required: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  withIdTransform({ timestamps: true }),
);

// فريد داخل نفس النوع فقط (يسمح لنفس الاسم أن يتكرر بين نوعين مختلفين من الموردين)
supplierSchema.index({ type: 1, name: 1 }, { unique: true, name: 'supplier_type_name_unique' });

export default mongoose.model('Supplier', supplierSchema);
