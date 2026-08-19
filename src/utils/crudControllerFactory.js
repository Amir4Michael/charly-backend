import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * مصنع Controllers عام يبني على createCrudService — نفس منطق الأمان (asyncHandler)
 * ونفس صيغة الاستجابة الموحدة لكل الكيانات المرجعية البسيطة.
 */
export function createCrudController(service, entityLabel) {
  return {
    list: asyncHandler(async (req, res) => {
      const items = await service.list();
      sendSuccess(res, { data: items });
    }),

    getOne: asyncHandler(async (req, res) => {
      const item = await service.getById(req.params.id);
      sendSuccess(res, { data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const item = await service.create(req.body);
      sendSuccess(res, { status: 201, data: item, message: `تمت إضافة ${entityLabel} بنجاح` });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await service.update(req.params.id, req.body);
      sendSuccess(res, { data: item, message: `تم تحديث ${entityLabel} بنجاح` });
    }),

    remove: asyncHandler(async (req, res) => {
      await service.remove(req.params.id);
      sendSuccess(res, { message: `تم حذف ${entityLabel} بنجاح` });
    }),
  };
}
