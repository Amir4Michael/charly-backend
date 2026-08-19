import asyncHandler from 'express-async-handler';
import { sendSuccess, ApiError } from '../utils/apiResponse.js';
import Supplier, { SUPPLIER_TYPES } from '../models/Supplier.js';

function assertValidType(type) {
  if (!SUPPLIER_TYPES.includes(type)) {
    throw new ApiError(400, `نوع المورد غير صالح — يجب أن يكون أحد: ${SUPPLIER_TYPES.join(', ')}`);
  }
}

export const listSuppliers = asyncHandler(async (req, res) => {
  const { type } = req.params;
  assertValidType(type);
  const items = await Supplier.find({ type }).sort({ name: 1 });
  sendSuccess(res, { data: items });
});

export const getSupplier = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  assertValidType(type);
  const item = await Supplier.findOne({ _id: id, type });
  if (!item) throw new ApiError(404, 'المورد غير موجود');
  sendSuccess(res, { data: item });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const { type } = req.params;
  assertValidType(type);
  const item = await Supplier.create({ ...req.body, type });
  sendSuccess(res, { status: 201, data: item, message: 'تمت إضافة المورد بنجاح' });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  assertValidType(type);
  const patch = { ...req.body };
  delete patch.type; // لا يُسمح بتغيير نوع المورد بعد إنشائه
  const item = await Supplier.findOneAndUpdate({ _id: id, type }, patch, { new: true, runValidators: true });
  if (!item) throw new ApiError(404, 'المورد غير موجود');
  sendSuccess(res, { data: item, message: 'تم تحديث المورد بنجاح' });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  assertValidType(type);
  const item = await Supplier.findOneAndDelete({ _id: id, type });
  if (!item) throw new ApiError(404, 'المورد غير موجود');
  sendSuccess(res, { message: 'تم حذف المورد بنجاح' });
});
