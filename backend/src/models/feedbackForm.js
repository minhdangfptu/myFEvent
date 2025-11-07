import mongoose, { Schema, Types } from 'mongoose';

const FeedbackFormSchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'Event', required: true },
  createdBy: { type: Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  openTime: { type: Date, required: true },
  closeTime: { type: Date, required: true },
  targetAudience: { 
    type: [String], 
    enum: ['Member', 'HoD', 'HoOC', 'All'],
    default: ['Member', 'HoD'] // Mặc định là Member và HoD
  },
  status: { 
    type: String, 
    enum: ['draft', 'open', 'closed'], 
    default: 'draft' 
  },
  questions: [{
    questionText: { type: String, required: true },
    questionType: { 
      type: String, 
      enum: ['rating', 'multiple-choice', 'text', 'yes-no'],
      required: true 
    },
    options: [{ type: String }], // For multiple-choice questions
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  }],
  tags: [{ type: String }], // For categorizing forms (e.g., "Ban Hậu cần", "Ban Truyền thông")
}, { timestamps: true, versionKey: false });

FeedbackFormSchema.index({ eventId: 1, status: 1 });
FeedbackFormSchema.index({ eventId: 1, createdAt: -1 });

export default mongoose.model('FeedbackForm', FeedbackFormSchema);

