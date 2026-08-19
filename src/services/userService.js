import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/apiResponse.js';

export async function listUsers() {
  return User.find().sort({ createdAt: 1 });
}

export async function createUser({ name, username, password, role, phone }) {
  const passwordHash = await bcrypt.hash(password || process.env.SEED_DEFAULT_PASSWORD || '123456789', 12);
  return User.create({ name, username: username.toLowerCase(), passwordHash, role, phone });
}

export async function updateUser(id, patch) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'المستخدم غير موجود');

  if (patch.name !== undefined) user.name = patch.name;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.phone !== undefined) user.phone = patch.phone;
  if (patch.active !== undefined) user.active = patch.active;
  if (patch.password) user.passwordHash = await bcrypt.hash(patch.password, 12);

  await user.save();
  return user;
}

export async function deleteUser(id) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new ApiError(404, 'المستخدم غير موجود');
  return user;
}

export async function toggleUserStatus(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'المستخدم غير موجود');
  user.active = !user.active;
  await user.save();
  return user;
}
