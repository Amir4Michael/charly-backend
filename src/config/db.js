import mongoose from 'mongoose';

/**
 * الاتصال بقاعدة بيانات MongoDB.
 * لا يوقف تشغيل السيرفر بالكامل عند فشل أول اتصال — يسجّل الخطأ بوضوح،
 * لأن mongoose نفسه يعيد المحاولة تلقائيًا في الخلفية حسب الإعدادات الافتراضية.
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI غير موجود في متغيرات البيئة (.env)');
  }

  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB متصل بنجاح');
  });
  mongoose.connection.on('error', (err) => {
    console.error('❌ خطأ في اتصال MongoDB:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB غير متصل');
  });

  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  return mongoose.connection;
}

export default connectDB;
