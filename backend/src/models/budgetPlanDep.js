import mongoose, { Schema, Types } from 'mongoose';

// Helper để convert Decimal128 safely
const toDecimal128 = (value, defaultValue = '0') => {
  if (!value && value !== 0) {
    return mongoose.Types.Decimal128.fromString(defaultValue);
  }
  if (typeof value === 'number') {
    return mongoose.Types.Decimal128.fromString(String(value));
  }
  if (typeof value === 'string') {
    return mongoose.Types.Decimal128.fromString(value);
  }
  if (value && typeof value.toString === 'function') {
    try {
      const str = value.toString();
      if (str && !isNaN(parseFloat(str))) {
        // Nếu đã là Decimal128, giữ nguyên
        if (value.constructor && value.constructor.name === 'Decimal128') {
          return value;
        }
        // Nếu có thể parse, convert
        return mongoose.Types.Decimal128.fromString(str);
      }
    } catch (e) {
      // Ignore
    }
  }
  return mongoose.Types.Decimal128.fromString(defaultValue);
};

const PlanItemSchema = new Schema({
  itemId:   { type: Types.ObjectId, default: () => new Types.ObjectId() },
  category: { type: String, required: true, default: 'general' },     
  name:     { type: String, required: true },
  qty:      { type: Schema.Types.Decimal128, default: 1, min: 0 },
  unit:     { type: String, default: 'cái', trim: true, maxlength: 50 },
  unitCost: { type: Schema.Types.Decimal128, default: 0, min: 0 },
  total:    { type: Schema.Types.Decimal128, default: 0, min: 0 },
  note:     { type: String, default: '' },
  feedback: { type: String, default: '' },
  status:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  
  // Evidence field - lưu bằng chứng từ HoD khi tạo budget
  evidence: [{
    type: { type: String, enum: ['image', 'pdf', 'doc', 'link'], default: 'link' },
    url: { type: String, required: true },
    name: { type: String, default: 'Evidence' }
  }],
  
  // Assignment fields
  assignedTo: { type: Types.ObjectId, ref: 'EventMember' },
  assignedAt: Date,
  assignedBy: { type: Types.ObjectId, ref: 'User' },
  submittedStatus: { type: String, enum: ['draft', 'submitted'], default: 'draft' }
}, { _id: false });

/** Kế hoạch ngân sách do 1 department nộp cho 1 event */
const EventBudgetPlanSchema = new Schema({
  eventId:      { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true, index: true },
  name:         { type: String, default: 'Budget Ban', trim: true },

  status:   { type: String, enum: ['draft','submitted','changes_requested','approved','locked','sent_to_members'], default: 'draft' },
  version:  { type: Number, default: 1, min: 1 },      // tăng mỗi lần submit
  currency: { type: String, default: 'VND' },
  
  // Quản lý categories (hạng mục)
  categories: [{ type: String }], // Danh sách hạng mục để chọn trong dropdown

  submittedAt: Date,
  createdBy:   { type: Types.ObjectId, ref: 'User' },

  items:       { type: [PlanItemSchema], validate: v => Array.isArray(v) && v.length > 0 },
  
  // Public/Private visibility
  isPublic: { type: Boolean, default: false },
  
  audit: [{
    at: { type: Date, required: true },
    by: { type: Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['submitted','changes_requested','approved','locked','comment','sent_to_members','public','private'], required: true },
    comment: String
  }]
}, { timestamps: true, versionKey: false });

// Removed unique constraint to allow multiple budgets per department
EventBudgetPlanSchema.index({ eventId: 1, departmentId: 1 });
EventBudgetPlanSchema.index({ eventId: 1, status: 1 });


EventBudgetPlanSchema.pre('save', function () {
  for (const it of this.items || []) {
    // Chỉ tính lại total nếu chưa có hoặc bằng 0
    try {
      const qty  = Number(it.qty?.toString() || 0);
      const unit = Number(it.unitCost?.toString() || 0);
      const calculatedTotal = Math.max(0, qty * unit);
      
      // Chỉ set total nếu chưa có hoặc bằng 0
      const currentTotal = Number(it.total?.toString() || 0);
      if (currentTotal === 0 && calculatedTotal > 0) {
        // Chỉ set nếu it.total chưa được set hoặc là Decimal128 với giá trị 0
        if (!it.total || currentTotal === 0) {
          it.total = mongoose.Types.Decimal128.fromString(String(calculatedTotal));
        }
      }
    } catch (e) {
      // Ignore errors trong pre-save hook để không block save
      console.warn('Error in pre-save hook for item:', e.message);
    }
    
  }
});

export default mongoose.model('EventBudgetPlan', EventBudgetPlanSchema);
