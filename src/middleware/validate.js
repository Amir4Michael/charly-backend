import { validationResult } from 'express-validator';
import { sendError } from '../utils/apiResponse.js';

/**
 * يوضع بعد أي مصفوفة express-validator في الـRoute — لو فيه أخطاء validation
 * يرجّع 400 بنفس الصيغة الموحدة، وإلا يكمل للـController.
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return sendError(res, {
      status: 400,
      message: 'بيانات غير صالحة',
      errors: result.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}
