/**
 * أدوات موحّدة لصيغة الاستجابة — كل الـControllers تستخدم هذه الدوال فقط
 * حتى لا يختلف شكل الـResponse بين Endpoint وآخر.
 */

export function sendSuccess(res, { status = 200, data = null, message = null, meta = null } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== null) body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, { status = 500, message = 'حدث خطأ غير متوقع', errors = null } = {}) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

/**
 * خطأ تطبيقي موحّد يُمرَّر لـ next(err) ليلتقطه errorMiddleware المركزي.
 */
export class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
