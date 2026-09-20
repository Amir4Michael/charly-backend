import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';

import { generalLimiter } from './middleware/rateLimiters.js';
import { notFoundMiddleware, errorMiddleware } from './middleware/errorMiddleware.js';
import { sendSuccess } from './utils/apiResponse.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import quarryRoutes from './routes/quarryRoutes.js';
import truckRoutes from './routes/truckRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import materialOptionRoutes from './routes/materialOptionRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import dailyReportRoutes from './routes/dailyReportRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import accountsRoutes from './routes/accountsRoutes.js';
import weeklyScheduleRoutes from './routes/weeklyScheduleRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import generalSaleRoutes from './routes/generalSaleRoutes.js';
import cashAdjustmentRoutes from './routes/cashAdjustmentRoutes.js';

const app = express();

// ——— أمان أساسي ———
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // لازم لإرسال/استقبال httpOnly refresh cookie
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(mongoSanitize()); // يمنع حقن عمليات MongoDB ($gt, $ne...) عبر body/query/params

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/api', generalLimiter);

// ——— فحص صحة الخادم ———
app.get('/api/health', (req, res) => sendSuccess(res, { data: { status: 'ok', time: new Date().toISOString() } }));

// ——— المسارات ———
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quarries', quarryRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/materials', materialOptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports/daily', dailyReportRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/schedules/weekly', weeklyScheduleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/general-sales', generalSaleRoutes);
app.use('/api/cash-adjustments', cashAdjustmentRoutes);
// كل الموديولات المخطط لها في Backend Blueprint (قسم 1) اكتملت الآن.
// المتبقي: ربط الفرونت تدريجيًا بالـAPI الحقيقي (المرحلة 9).

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
