/**
 * يحسب فرق الساعات بين وقتين HH:MM، مع مراعاة العبور لليوم التالي.
 * مطابق تمامًا لدالة hoursBetween في DailyReportFormPage.jsx بالفرونت،
 * حتى تكون نفس القيمة المعروضة في الفورم هي نفسها التي يعيد الـBackend حسابها والتحقق منها.
 */
export function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(end).split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}
