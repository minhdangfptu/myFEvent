import mongoose, { Schema, Types } from 'mongoose';

const EvidenceSchema = new Schema({
  type: { type: String, enum: ['image', 'pdf', 'doc', 'link'], default: 'link' },
  url: { type: String, default: '' },
  name: { type: String, default: '' }
}, { _id: false });

const EventExpenseSchema = new Schema({
  eventId:      { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true, index: true },
  planId:       { type: Types.ObjectId, ref: 'EventBudgetPlan', required: true, index: true },
  itemId:       { type: Types.ObjectId, required: true },

  actualAmount:   { type: Schema.Types.Decimal128, default: 0, min: 0 },
  estimatedTotal: { type: Schema.Types.Decimal128, default: 0, min: 0 },
  evidence:       { type: [EvidenceSchema], default: [] },
  memberNote:     { type: String, default: '' },
  isPaid:         { type: Boolean, default: false },
  comparison:     { type: String, enum: ['greater', 'less', 'equal'], default: null },
  reportedBy:     { type: Types.ObjectId, ref: 'User' },
  reportedAt:     Date,
  submittedStatus: { type: String, enum: ['draft', 'submitted'], default: 'draft' }
}, { timestamps: true, versionKey: false });

EventExpenseSchema.pre('save', function () {
  try {
    const estimated = Number(this.estimatedTotal?.toString() || 0);
    const actual = Number(this.actualAmount?.toString() || 0);
    if (actual > 0) {
      if (actual > estimated) {
        this.comparison = 'greater';
      } else if (actual < estimated) {
        this.comparison = 'less';
      } else {
        this.comparison = 'equal';
      }
    } else {
      this.comparison = null;
    }
  } catch (error) {
    console.warn('EventExpenseSchema comparison error:', error.message);
  }
});

EventExpenseSchema.index({ planId: 1, itemId: 1 }, { unique: true });
EventExpenseSchema.index({ eventId: 1, departmentId: 1 });

export default mongoose.model('EventExpense', EventExpenseSchema);
