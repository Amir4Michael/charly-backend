import WeeklySchedule from '../models/WeeklySchedule.js';
import { WEEK_DAYS } from '../models/WeeklySchedule.js';

const emptySchedule = (weekStart) => ({
  weekStart,
  rows: WEEK_DAYS.map((day) => ({ day, shifts: ['بدون عمل', 'بدون عمل', 'بدون عمل'] })),
});

/** يُرجع جدول الأسبوع المطلوب، أو جدولاً فارغًا افتراضيًا لو لم يُحفظ أي شيء لهذا الأسبوع بعد
 * (يطابق سلوك getWeeklySchedule بالفرونت الذي يرجع MOCK_WEEKLY_SCHEDULE الافتراضي أول مرة). */
export async function getWeeklySchedule(weekStart) {
  const schedule = await WeeklySchedule.findOne({ weekStart });
  return schedule || emptySchedule(weekStart);
}

/** Upsert كامل بمفتاح weekStart — يستبدل الأسبوع بالكامل، يطابق saveWeeklySchedule بالفرونت */
export async function saveWeeklySchedule(weekStart, rows, userId) {
  return WeeklySchedule.findOneAndUpdate(
    { weekStart },
    { weekStart, rows, updatedBy: userId },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}
