import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import { REFRESH_COOKIE_NAME, parseDurationToMs } from '../utils/tokens.js';
import * as authService from '../services/authService.js';
import User from '../models/User.js';

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES || '7d'),
  path: '/api/auth',
});

/** GET /api/auth/login-users — قائمة عامة (بدون تسجيل دخول) لتعبئة Dropdown اختيار المستخدم في LoginPage */
export const getLoginCandidates = asyncHandler(async (req, res) => {
  const users = await authService.listLoginCandidates();
  sendSuccess(res, { data: users });
});

/** POST /api/auth/login */
export const loginController = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const { accessToken, refreshToken, user } = await authService.login(username, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendSuccess(res, { data: { accessToken, user }, message: 'تم تسجيل الدخول بنجاح' });
});

/** POST /api/auth/refresh */
export const refreshController = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, user } = await authService.refreshAccessToken(token);
  sendSuccess(res, { data: { accessToken, user } });
});

/** POST /api/auth/logout */
export const logoutController = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  sendSuccess(res, { message: 'تم تسجيل الخروج' });
});

/** GET /api/auth/me — يحتاج protect فقط */
export const meController = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  sendSuccess(res, { data: { id: user._id, name: user.name, username: user.username, role: user.role, phone: user.phone } });
});

/** PATCH /api/auth/change-password — يحتاج protect فقط (أي مستخدم يغيّر كلمة مروره هو) */
export const changePasswordController = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changeOwnPassword(req.user.id, currentPassword, newPassword);
  sendSuccess(res, { message: 'تم تغيير كلمة المرور بنجاح' });
});
