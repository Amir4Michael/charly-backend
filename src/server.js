import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ فشل الاتصال الأولي بقاعدة البيانات:', err.message);
    console.error('   السيرفر سيستمر في المحاولة في الخلفية عبر mongoose، لكن أي طلب لقاعدة البيانات سيفشل حتى يتصل.');
  }

  app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل على المنفذ ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
