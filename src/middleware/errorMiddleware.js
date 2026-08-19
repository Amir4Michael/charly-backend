import { sendError } from '../utils/apiResponse.js';

/**
 * أي Route غير موجود أصلاً — يُمرَّر لـerrorMiddleware بنفس الصيغة الموحدة.
 */
export function notFoundMiddleware(req, res, next) {
  const error = new Error(`المسار غير موجود — ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Middleware مركزي واحد لكل الأخطاء في التطبيق — كل الأخطاء (مهما كان مصدرها:
 * Validation، Mongoose، JWT، أو ApiError مخصص) تمر من هنا وتخرج بنفس الشكل:
 * { success: false, message, errors? }
 */
export function errorMiddleware(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let message = err.message || 'حدث خطأ غير متوقع';
  let errors = err.errors || null;

  // أخطاء Mongoose الشائعة — تُترجم لرسائل عربية واضحة بدل رسالة Mongoose التقنية
  if (err.name === 'ValidationError') {
    status = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = 'بيانات غير صالحة';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'معرّف غير صالح';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `القيمة مستخدمة بالفعل لحقل: ${field}` : 'قيمة مكررة';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'جلسة الدخول غير صالحة أو منتهية';
  }

  if (status === 500) {
    // نسجّل الخطأ الحقيقي في الـServer logs فقط، ولا نُسرّب تفاصيله للعميل
    console.error('خطأ داخلي:', err);
    message = process.env.NODE_ENV === 'production' ? 'حدث خطأ في الخادم' : message;
  }

  sendError(res, { status, message, errors });
}
