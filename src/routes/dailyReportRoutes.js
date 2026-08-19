import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createReportValidator, updateReportValidator, idParamValidator, listReportsValidator,
} from '../validators/dailyReportValidators.js';
import {
  listReports, getReport, createReport, updateReport, deleteReport,
} from '../controllers/dailyReportController.js';

const router = Router();

router.use(protect);

router.get('/', listReportsValidator, validate, listReports);
router.get('/:id', idParamValidator, validate, getReport);
router.post('/', authorize('admin'), createReportValidator, validate, createReport);
router.put('/:id', authorize('admin'), updateReportValidator, validate, updateReport);
router.delete('/:id', authorize('admin'), idParamValidator, validate, deleteReport);

export default router;
