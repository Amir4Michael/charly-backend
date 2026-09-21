import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

const handler = (req, res) => sendError(res, { status: 429, message: 'طلبات كثيرة جدًا، حاول مرة أخرى بعد قليل' });

/** عام لكل الـAPI — الحد رُفع من 200 إلى 500 (نفس النافذة الزمنية 15 دقيقة) لأن الاستخدام
 * الفعلي لهذا النظام (أكثر من مستخدم من نفس شبكة المصنع، كل صفحة تعمل عدة طلبات دفعة واحدة)
 * كان يقترب من الحد القديم بسهولة في الاستخدام العادي تمامًا، لا في هجوم فعلي. لا تغيير على
 * حد محاولات تسجيل الدخول (loginLimiter أدناه) — تلك حماية أمنية مقصودة يجب أن تبقى صارمة. */
export const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** أشد صرامة على تسجيل الدخول تحديدًا — منع محاولات Brute-force على كلمة المرور */
export const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
