import { body, param } from 'express-validator';
import { MATERIAL_CATEGORIES } from '../models/MaterialOption.js';

export const addMaterialOptionValidator = [
  body('category').isIn(MATERIAL_CATEGORIES).withMessage(`القسم يجب أن يكون أحد: ${MATERIAL_CATEGORIES.join(', ')}`),
  body('value').trim().notEmpty().withMessage('القيمة مطلوبة'),
];

export const removeMaterialOptionValidator = [
  param('category').isIn(MATERIAL_CATEGORIES).withMessage(`القسم يجب أن يكون أحد: ${MATERIAL_CATEGORIES.join(', ')}`),
  param('value').notEmpty().withMessage('القيمة مطلوبة'),
];
