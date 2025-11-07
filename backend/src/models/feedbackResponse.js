import mongoose, { Schema, Types } from 'mongoose';

const FeedbackResponseSchema = new Schema({
  formId: { type: Types.ObjectId, ref: 'FeedbackForm', required: true },
  eventId: { type: Types.ObjectId, ref: 'Event', required: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  responses: [{
    questionId: { type: String, required: true }, // Index of question in form
    questionText: { type: String, required: true },
    questionType: { type: String, required: true },
    answer: { 
      type: Schema.Types.Mixed, 
      required: true 
    }, // Can be number (rating), string (text), array (multiple-choice), boolean (yes-no)
  }],
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });

FeedbackResponseSchema.index({ formId: 1, userId: 1 }, { unique: true }); // One response per user per form
FeedbackResponseSchema.index({ eventId: 1, submittedAt: -1 });
FeedbackResponseSchema.index({ formId: 1 });

export default mongoose.model('FeedbackResponse', FeedbackResponseSchema);


