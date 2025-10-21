import mongoose, { Schema, Types } from 'mongoose';

const PlanItemSchema = new Schema({
  itemId:   { type: Types.ObjectId, default: () => new Types.ObjectId() },
  category: { type: String, required: true },     // Venue / Catering / Media...
  name:     { type: String, required: true },
  qty:      { type: Schema.Types.Decimal128, default: 1, min: 0 },
  unitCost: { type: Schema.Types.Decimal128, default: 0, min: 0 },
  taxRate:  { type: Schema.Types.Decimal128, default: 0, min: 0 },  // 0.1 = 10%
  discount: { type: Schema.Types.Decimal128, default: 0, min: 0 },
  total:    { type: Schema.Types.Decimal128, default: 0, min: 0 }   // auto-calc nếu =0
}, { _id: false });

/** Kế hoạch ngân sách do 1 department nộp cho 1 event */
const EventBudgetPlanSchema = new Schema({
  eventId:      { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true, index: true },

  status:   { type: String, enum: ['draft','submitted','changes_requested','approved','locked'], default: 'draft' },
  version:  { type: Number, default: 1, min: 1 },      // tăng mỗi lần submit
  currency: { type: String, default: 'VND' },

  submittedAt: Date,
  reviewedBy:  { type: Types.ObjectId, ref: 'User' },  // trưởng BTC
  reviewedAt:  Date,
  notes:       String,

  items:       { type: [PlanItemSchema], validate: v => Array.isArray(v) && v.length > 0 },
  attachments: [{ name: String, url: String }],
  audit: [{
    at: { type: Date, required: true },
    by: { type: Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['submitted','changes_requested','approved','locked','comment'], required: true },
    comment: String
  }]
}, { timestamps: true, versionKey: false });

/** 1 department chỉ được nộp 1 plan cho 1 event */
EventBudgetPlanSchema.index({ eventId: 1, departmentId: 1 }, { unique: true });
EventBudgetPlanSchema.index({ eventId: 1, status: 1 });

/** Tự tính total nếu chưa điền */
EventBudgetPlanSchema.pre('save', function () {
  for (const it of this.items || []) {
    const qty  = Number(it.qty || 0);
    const unit = Number(it.unitCost || 0);
    const tax  = Number(it.taxRate || 0);
    const disc = Number(it.discount || 0);
    const total = Math.max(0, (qty * unit - disc) * (1 + tax));
    if (!it.total || Number(it.total) === 0) it.total = total;
  }
});

export default mongoose.model('EventBudgetPlan', EventBudgetPlanSchema);
