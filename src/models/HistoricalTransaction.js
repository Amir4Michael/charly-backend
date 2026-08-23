import mongoose from 'mongoose';

/**
 * HistoricalTransaction — "عملية" مالية واحدة (قديمة من الدفاتر الورقية أو جديدة) خاصة
 * بعميل/قلاب/كسارة/مورد/عامل، مع دفعات متعددة متراكمة عليها لحين تصفية الحساب.
 *
 * === تصميم موحّد (بعد التبسيط) ===
 * لم يعد هناك اختيار "له/عليه" في أي مكان بالواجهة إطلاقًا — الاتجاه ثابت حسب نوع الكيان
 * ومُشتق تلقائيًا في السيرفر (direction لا يزال موجودًا داخليًا فقط لأسباب توافق البيانات
 * القديمة، لكنه لم يعد يُقرأ من الطلب أبدًا):
 *   - customer  → 'عليه' دائمًا (كل عملية هي بيع، العميل مدين لنا بقيمتها)
 *   - truck/quarry/supplier/worker → 'له' دائمًا (كل عملية هي مبلغ مستحق منا لهم، نحن مدينون)
 * لأن هذه الجهات "دائمًا لها أموال طرفنا" كما هو متعارف عليه في العمل الفعلي.
 *
 * === الحقول حسب نوع الكيان ===
 * customer: unitPrice (إجباري) × quantity (اختياري، يُدخَل لاحقًا) = amount المحسوب تلقائيًا.
 *           لو quantity غير معروفة بعد: amount = 0 مؤقتًا (لا تدخل ضمن أي إجمالي حتى تُعرف).
 * truck/quarry/supplier/worker: amount يُدخَل مباشرة (بدون سعر/كمية) — "فقط المبلغ والتاريخ".
 *
 * === الدفعات (payments) ===
 * كل عملية يمكن أن يُضاف عليها أكثر من دفعة على فترات متفرقة (زر + بالفرونت)، وتتراكم حتى
 * تُغطي كامل amount. remaining = amount - sum(payments.amount)، ويُحسب دائمًا في الخدمة
 * (historicalTransactionService)، وليس مخزَّنًا كحقل منفصل لتفادي عدم الاتساق.
 */
const historicalTransactionSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['customer', 'truck', 'quarry', 'supplier', 'worker'],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
    },

    type: { type: String, trim: true, default: '' }, // نوع العملية (نص حر، مثال: "بيع"، "توريد"...)

    // amount = إجمالي العملية (المبلغ الكلي المستحق قبل خصم الدفعات):
    // - للعميل: يُحسب دائمًا = quantity × unitPrice في الخدمة (لا يُقبل مباشرة من الطلب).
    // - لباقي الكيانات: يُدخَل مباشرة من الطلب.
    amount: { type: Number, required: false, default: 0, min: 0 },

    // داخلي فقط — يُشتق تلقائيًا من entityType في الخدمة، لا يُقرأ من الطلب مطلقًا.
    direction: { type: String, required: true, enum: ['له', 'عليه'] },

    // خاص بالعميل فقط
    unitPrice: { type: Number, min: 0 },
    quantity: { type: Number, min: 0 },
    unit: { type: String, enum: ['طن', 'كيلو', ''], default: 'طن' },

    // تاريخ الاستحقاق (اختياري) — منفصل عن date (تاريخ الاستلام/التسجيل، إجباري دائمًا)
    dueDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة تاريخ الاستحقاق يجب أن تكون YYYY-MM-DD'],
    },

    description: { type: String, trim: true, default: '' },

    // دفعات متعددة متراكمة على هذه العملية بعينها — تُضاف عبر زر (+) بالفرونت وتتراكم
    // لحين تصفية الحساب بالكامل، بدل معاملة "دفعة" منفصلة على مستوى الكيان ككل.
    payments: {
      type: [
        new mongoose.Schema(
          {
            date: {
              type: String,
              required: true,
              match: [/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD'],
            },
            amount: { type: Number, required: true, min: 0.01 },
            note: { type: String, trim: true, default: '' },
          },
          { _id: true },
        ),
      ],
      default: [],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (Array.isArray(ret.payments)) {
          ret.payments = ret.payments.map((p) => {
            const { _id, ...rest } = p;
            return { id: _id?.toString?.() || _id, ...rest };
          });
        }
        const paidTotal = (ret.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        ret.paidTotal = Math.round(paidTotal * 100) / 100;
        ret.remaining = Math.round(((Number(ret.amount) || 0) - paidTotal) * 100) / 100;
        return ret;
      },
    },
  },
);

historicalTransactionSchema.index({ entityType: 1, entityId: 1, date: 1 }, { name: 'entity_date_idx' });

export default mongoose.model('HistoricalTransaction', historicalTransactionSchema);