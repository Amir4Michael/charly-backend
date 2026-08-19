/**
 * أدوات هاتف مطابقة لمنطق src/lib/phone.js في الفرونت — لضمان نفس قواعد التحقق
 * على الجانبين، دون رفض قاطع لأي صيغة غير مألوفة (نفس سلوك الفرونت الحالي).
 */

export function cleanPhoneDigits(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/[^\d+]/g, '');
}

export function isLikelyValidPhone(raw) {
  const digits = cleanPhoneDigits(raw).replace(/\+/g, '');
  return digits.length >= 8;
}
