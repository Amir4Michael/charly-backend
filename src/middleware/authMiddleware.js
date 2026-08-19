import asyncHandler from 'express-async-handler';
import { ApiError } from '../utils/apiResponse.js';
import { verifyAccessToken } from '../utils/tokens.js';
import User from '../models/User.js';

/**
 * protect — يتحقق من صلاحية الـAccess Token في Authorization: Bearer <token>
 * ويرفض الطلب (401) لو غير موجود أو منتهي أو غير صالح، أو لو المستخدم أصبح موقوفًا (active=false).
 */
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'يجب تسجيل الدخول أولاً');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'جلسة الدخول غير صالحة أو منتهية');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.active) {
    throw new ApiError(401, 'المستخدم غير موجود أو تم إيقافه');
  }

  req.user = { id: user._id.toString(), role: user.role, username: user.username, name: user.name };
  next();
});

/**
 * authorize('admin') — يُستخدم بعد protect مباشرة على أي Route يحتاج صلاحية أعلى من مجرد تسجيل دخول.
 * viewer دائمًا مرفوض هنا (403) لأنه Read-only بطبيعته في كل النظام.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'لا تملك صلاحية القيام بهذا الإجراء'));
    }
    next();
  };
}
