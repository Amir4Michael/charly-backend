import mongoose from 'mongoose';
import { withIdTransform } from '../utils/mongooseIdPlugin.js';

/**
 * WeeklySchedule — مطابق لـMOCK_WEEKLY_SCHEDULE و getWeeklySchedule/saveWeeklySchedule
 * بالفرونت: مستند واحد لكل أسبوع (مفتاحه weekStart)، كل يوم فيه 3 خانات وردية،
 * وقيمة كل خانة إما درجة نعومة (مثل "45M") أو النص الثابت "بدون عمل".
 * هذا خطة تشغيل (Plan) وليس تنفيذًا فعليًا — لا علاقة له بـDailyReport (لا Refs بينهما، يطابق الفرونت).
 */
const WEEK_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const scheduleRowSchema = new mongoose.Schema(
  {
    day: { type: String, enum: WEEK_DAYS, required: true },
    // 3 خانات وردية بالضبط (SHIFTS بالفرونت ثابتة عند 3) — نص حر لأن القيمة درجة نعومة ديناميكية أو "بدون عمل"
    shifts: {
      type: [String],
      default: ['بدون عمل', 'بدون عمل', 'بدون عمل'],
      validate: {
        validator: (arr) => arr.length === 3,
        message: 'كل يوم يجب أن يحتوي على 3 خانات وردية بالضبط',
      },
    },
  },
  { _id: false },
);

const weeklyScheduleSchema = new mongoose.Schema(
  {
    weekStart: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },
    rows: { type: [scheduleRowSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  withIdTransform({ timestamps: true }),
);

weeklyScheduleSchema.index({ weekStart: 1 }, { unique: true, name: 'week_start_unique' });

export { WEEK_DAYS };
export default mongoose.model('WeeklySchedule', weeklyScheduleSchema);
