import Settings from '../models/Settings.js';

/** يُرجع المستند الوحيد، وينشئه بالقيم الافتراضية تلقائيًا إن لم يوجد بعد (أول تشغيل للنظام) */
export async function getSettings() {
  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

/** Upsert — يُنشئ المستند لو غير موجود، أو يُحدّثه لو موجود. يبقى مستندًا واحدًا دائمًا. */
export async function updateSettings(patch) {
  const settings = await Settings.findOneAndUpdate({}, patch, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  return settings;
}
