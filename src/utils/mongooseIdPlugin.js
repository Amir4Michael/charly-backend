/**
 * كل نماذج الفرونت الحالية (customersService, quarriesService, ...) تستخدم `id` وليس `_id`
 * (مثال: customer.id, c.id === id). بدون هذا التحويل، أي استجابة JSON من MongoDB كانت
 * سترجع `_id` فيكسر كل شرط مقارنة ومنطق موجود بالفرونت دون أي داعٍ لتغييره.
 * هذا إصلاح على مستوى الـBackend فقط — لا يغيّر أي سطر Frontend.
 *
 * الاستخدام: new mongoose.Schema({...fields}, withIdTransform({ timestamps: true }))
 */
export function withIdTransform(schemaOptions = {}) {
  return {
    ...schemaOptions,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  };
}
