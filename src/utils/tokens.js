import jwt from 'jsonwebtoken';

export function signAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, username: user.username, name: user.name },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/** يحوّل مدة نصية مثل "7d" إلى Milliseconds لإعداد صلاحية الكوكيز */
export function parseDurationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(String(duration).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 أيام
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[unit];
}

export const REFRESH_COOKIE_NAME = 'ccf_refresh_token';
