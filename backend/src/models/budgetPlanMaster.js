import mongoose, { Schema, Types } from 'mongoose';

const MasterSourceSchema = new Schema({
  planId:       { type: Types.ObjectId, ref: 'EventBudgetPlan', required: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true },
  version:      { type: Number, required: true, min: 1 }
}, { _id: false });

const MasterCategorySchema = new Schema({
  category: { type: String, required: true },
  total:    { type: Schema.Types.Decimal128, required: true, min: 0 }
}, { _id: false });

/** Bản chốt tổng hợp (snapshot) cho 1 event */
const EventBudgetMasterSchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'Event', required: true },
  version: { type: Number, required: true, min: 1 },       // tăng mỗi lần chốt
  takenAt: { type: Date, default: () => new Date() },
  currency:{ type: String, default: 'VND' },

  sources:    { type: [MasterSourceSchema], validate: v => Array.isArray(v) && v.length > 0 },
  byCategory: [MasterCategorySchema],
  grandTotal: { type: Schema.Types.Decimal128, required: true, min: 0 }
}, { timestamps: true, versionKey: false });

EventBudgetMasterSchema.index({ eventId: 1, version: -1 }, { unique: true });

/** Tạo snapshot từ các plan đã duyệt/đóng (approved/locked) */
EventBudgetMasterSchema.statics.fromApprovedPlans = async function (eventId, currency = 'VND', version = 1) {
  const Plan = mongoose.model('EventBudgetPlan');
  const plans = await Plan.find({
    eventId,
    status: { $in: ['approved','locked'] }
  }).lean();

  const byCat = new Map();
  const sources = [];

  for (const p of plans) {
    const acc = new Map();
    for (const it of (p.items || [])) {
      const cat = it.category || 'Other';
      const val = Number(it.total || 0);
      acc.set(cat, (acc.get(cat) || 0) + val);
    }
    for (const [cat, sum] of acc) byCat.set(cat, (byCat.get(cat) || 0) + sum);
    sources.push({ planId: p._id, departmentId: p.departmentId, version: p.version });
  }

  const byCategory = [...byCat.entries()].map(([category, total]) => ({ category, total }));
  const grandTotal = byCategory.reduce((s, x) => s + Number(x.total), 0);

  return this.create({ eventId, version, currency, sources, byCategory, grandTotal });
};

export default mongoose.model('EventBudgetMaster', EventBudgetMasterSchema);
