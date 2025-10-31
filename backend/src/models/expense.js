import mongoose, { Schema, Types } from 'mongoose';

/** Chi phí thực tế phát sinh trong 1 event */
const EventExpenseSchema = new Schema({
  eventId:      { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true, index: true },
  planId:       { type: Types.ObjectId, ref: 'EventBudgetPlan' }, // optional: liên kết nếu chi phí này thuộc mục nào trong plan
  itemId:       { type: Types.ObjectId },                         // optional: tham chiếu PlanItem cụ thể
  category:     { type: String, required: true },                 // giống PlanItem.category để tổng hợp được
  name:         { type: String, required: true },                
  description:  { type: String },

  qty:          { type: Schema.Types.Decimal128, default: 1, min: 0 },
  unitCost:     { type: Schema.Types.Decimal128, default: 0, min: 0 },
  total:        { type: Schema.Types.Decimal128, required: true, min: 0 }, // tổng tiền thực tế

  currency:     { type: String, default: 'VND' },
  paidAt:       { type: Date, required: true },                  // ngày chi
  paidBy:       { type: Types.ObjectId, ref: 'EventMember' },           // người thực hiện chi
  approvedBy:   { type: Types.ObjectId, ref: 'EventMember' },           // người duyệt chi
  attachment:   [{ name: String, url: String }],                   // hóa đơn / chứng từ
  status:       { type: String, enum: ['pending','approved','rejected','paid'], default: 'pending' },

  notes:        { type: String }
}, { timestamps: true, versionKey: false });

EventExpenseSchema.pre('save', function() {
  const qty  = Number(this.qty || 0);
  const unit = Number(this.unitCost || 0);
  const tax  = Number(this.taxRate || 0);
  const disc = Number(this.discount || 0);
  if (!this.total || Number(this.total) === 0) {
    this.total = Math.max(0, (qty * unit - disc) * (1 + tax));
  }
});

EventExpenseSchema.index({ eventId: 1, departmentId: 1 });
EventExpenseSchema.index({ eventId: 1, category: 1 });
EventExpenseSchema.index({ planId: 1 });

export default mongoose.model('EventExpense', EventExpenseSchema);
