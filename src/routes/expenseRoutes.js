import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createExpenseValidator, idParamValidator, listExpensesValidator } from '../validators/expenseValidators.js';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';

const router = Router();

router.use(protect);

router.get('/', listExpensesValidator, validate, getExpenses);
router.post('/', authorize('admin'), createExpenseValidator, validate, createExpense);
router.delete('/:id', authorize('admin'), idParamValidator, validate, deleteExpense);

export default router;
