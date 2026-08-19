# Backend — نظام إدارة مصنع كربونات الكالسيوم

Node.js + Express + MongoDB + Mongoose. الحالة الحالية: **المرحلة 1 (Scaffold) + المرحلة 2 (Auth/Users)** فقط — باقي الموديولات (Customer, Quarry, Truck, Worker, DailyReport, Expense, WeeklySchedule, MaterialOption, Settings, Accounts) لسه في الطريق حسب `BACKEND_BLUEPRINT.md`.

## التشغيل محليًا

```bash
cd backend
npm install
cp .env.example .env   # ثم عدّل القيم (خصوصًا JWT secrets و MONGO_URI)
npm run seed:users     # يزرع 3 مستخدمين تجريبيين (admin / supervisor / accountant)
npm run dev            # يشغّل السيرفر على PORT من .env (افتراضي 5000)
```

## قرار مهم يخص تسجيل الدخول (Auth)

الفرونت الحالي (`LoginPage.jsx`) يسجّل الدخول بكلمة مرور عامة فقط + زر اختيار Role، بدون هوية مستخدم حقيقية.
هذا لا يكفي لتسجيل دخول حقيقي (JWT مرتبط بمستخدم فعلي)، فتم اختيار **"الخيار أ"** من `BACKEND_BLUEPRINT.md`:

- إضافة `username` + `passwordHash` لموديل `User`.
- Endpoint عام `GET /api/auth/login-users` يرجّع `[{ username, name }]` للمستخدمين النشطين فقط، لتعبئة Dropdown في صفحة الدخول بدل زر اختيار الـRole.
- `POST /api/auth/login` يستقبل `{ username, password }` بدل `{ password, role }`.

**⚠️ هذا يحتاج تعديل صغير في `LoginPage.jsx` بالفرونت لم يُنفَّذ بعد** (إضافة Dropdown لاختيار المستخدم، وحذف زر اختيار الـRole لأن الـRole يصبح تلقائيًا من المستخدم المختار). لم يُلمَس أي ملف Frontend في هذه المرحلة — التنفيذ Backend فقط كما طُلب، وتعديل الفرونت سيُعرض ويُنفَّذ بشكل منفصل وواضح متى أردت.

بيانات الدخول التجريبية بعد `npm run seed:users` (كلمة المرور لكل الحسابات = قيمة `SEED_DEFAULT_PASSWORD` في `.env`، افتراضيًا `123456789`):

| username | الاسم | الصلاحية | نشط |
|---|---|---|---|
| `admin` | مدير المصنع | admin | ✅ |
| `supervisor` | المشرف الأول | viewer | ✅ |
| `accountant` | محاسب المصنع | viewer | ❌ (موقوف — لن يستطيع الدخول، يطابق `active:false` في MOCK_USERS بالفرونت) |

## Endpoints المتاحة الآن (كل موديولات Backend Blueprint اكتملت)

```
GET    /api/health

GET    /api/auth/login-users
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me                    (يحتاج تسجيل دخول)
PATCH  /api/auth/change-password       (يحتاج تسجيل دخول)

GET    /api/users                      (يحتاج تسجيل دخول — admin و viewer)
POST   /api/users                      (admin فقط)
PUT    /api/users/:id                  (admin فقط)
DELETE /api/users/:id                  (admin فقط)
PATCH  /api/users/:id/toggle-status    (admin فقط)

# نفس نمط CRUD + كشف حساب لكل من: customers, quarries, trucks, workers
GET    /api/{customers|quarries|trucks|workers}
GET    /api/{customers|quarries|trucks|workers}/:id
GET    /api/{customers|quarries|trucks|workers}/:id/statement?from=&to=
POST   /api/{customers|quarries|trucks|workers}                (admin)
PUT    /api/{customers|quarries|trucks|workers}/:id             (admin)
DELETE /api/{customers|quarries|trucks|workers}/:id             (admin)

GET    /api/materials
GET    /api/materials/inventory-report?from=&to=
POST   /api/materials                  (admin)
DELETE /api/materials/:category/:value (admin)

GET    /api/settings
PUT    /api/settings                   (admin)

GET    /api/reports/daily?from=&to=&page=&limit=
GET    /api/reports/daily/:id
POST   /api/reports/daily              (admin)
PUT    /api/reports/daily/:id          (admin)
DELETE /api/reports/daily/:id          (admin)

GET    /api/expenses?from=&to=&category=
POST   /api/expenses                   (admin)
DELETE /api/expenses/:id               (admin)

GET    /api/accounts/overview

GET    /api/schedules/weekly?weekStart=
PUT    /api/schedules/weekly           (admin)
```

**كل الموديولات الموصوفة في `BACKEND_BLUEPRINT.md` قسم 1 اكتملت (المراحل 1-8).**
المتبقي فقط: **المرحلة 9 — ربط الفرونت تدريجيًا** باستبدال `services/*.js` الحالية بنداءات API حقيقية.

## ملاحظة تشغيل مهمة

**لم يتم اختبار الاتصال الفعلي بـMongoDB في بيئة التطوير التي كُتب بها هذا الكود** (لا يوجد mongod متاح فيها ولا صلاحية شبكة لتثبيت MongoDB Server). تم التأكد من:
- صحة بنية كل الملفات (syntax, imports).
- صحة منطق JWT signing/verification وbcrypt hashing بشكل منعزل (unit-level).
- صحة تركيب الـRoutes والـMiddleware Chain.

**يجب تشغيل `npm run dev` مع MongoDB حقيقي (محلي أو Atlas) في بيئتك للتأكد الكامل** قبل اعتبار هذه المرحلة "مُختبرة بالكامل".
