import 'dotenv/config';
import mongoose from 'mongoose';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';

/**
 * نقطة الدخول الخاصة بـ Vercel Serverless Functions.
 *
 * السبب: `src/server.js` يعتمد على `app.listen()` وهو أسلوب Server تقليدي (Long-running process)
 * غير مدعوم في بيئة Vercel Serverless. هذا الملف بديل مخصص للنشر على Vercel فقط،
 * ولا يُستخدم في التشغيل المحلي (`npm run dev` / `npm start` لسه بتستخدم src/server.js زي ما هي بدون أي تغيير).
 *
 * لا يوجد أي تغيير في src/app.js أو الـ routes أو الـ business logic — فقط طريقة تشغيل نفس الـ app.
 */

// إعادة استخدام نفس الاتصال بقاعدة البيانات بين الاستدعاءات المتتالية على نفس الـ Serverless
// Instance (Warm Invocation) بدل ما نفتح اتصال جديد في كل مرة، وده تحسين ضروري لتفادي
// استهلاك عدد اتصالات Atlas المسموح بيه بسرعة.
let connectionPromise = null;

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return; // متصل بالفعل
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((err) => {
      connectionPromise = null; // نسمح بمحاولة الاتصال تاني في الطلب اللي بعده لو فشلت المحاولة دي
      throw err;
    });
  }
  await connectionPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDbConnected();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    // نسيب الطلب يكمل لـ app نفسه — الـ routes اللي بتحتاج DB هتفشل برسالة خطأ واضحة
    // بدل ما نوقف كل الـ API بسبب فشل عابر في الاتصال.
  }
  return app(req, res);
}