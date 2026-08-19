import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import * as userService from '../services/userService.js';

export const getUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  sendSuccess(res, { data: users });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  sendSuccess(res, { status: 201, data: user, message: 'تم إنشاء المستخدم بنجاح' });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  sendSuccess(res, { data: user, message: 'تم تحديث المستخدم بنجاح' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  sendSuccess(res, { message: 'تم حذف المستخدم بنجاح' });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.toggleUserStatus(req.params.id);
  sendSuccess(res, { data: user, message: 'تم تحديث حالة المستخدم' });
});
