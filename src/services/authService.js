import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/apiResponse.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';

/**
 * قائمة المستخدمين النشطين لعرضها في Dropdown صفحة الدخول — بدون بيانات حساسة
 * (اسم الدخول + الاسم فقط، بدون role أو phone حتى لا نُسرّب من هو الأدمن قبل تسجيل الدخول).
 */
export async function listLoginCandidates() {
  const users = await User.find({ active: true }).select('name username').sort({ name: 1 });
  return users.map((u) => ({ username: u.username, name: u.name }));
}

export async function login(username, password) {
  const user = await User.findOne({ username: String(username).toLowerCase() }).select('+passwordHash');
  if (!user || !user.active) {
    throw new ApiError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user._id.toString(), name: user.name, username: user.username, role: user.role },
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(401, 'لا يوجد جلسة دخول صالحة');
  }
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'جلسة الدخول منتهية، يرجى تسجيل الدخول مرة أخرى');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.active) {
    throw new ApiError(401, 'المستخدم غير موجود أو تم إيقافه');
  }

  return {
    accessToken: signAccessToken(user),
    user: { id: user._id.toString(), name: user.name, username: user.username, role: user.role },
  };
}

export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'المستخدم غير موجود');

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new ApiError(400, 'كلمة المرور الحالية غير صحيحة');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
}
