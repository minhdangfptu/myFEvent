import mongoose, { Schema, Types } from 'mongoose';

const ConversationHistorySchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'Event', required: false, default: null }, // Cho phép null khi ngoài sự kiện
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true, index: true },

  // Phân loại kênh: 'wbs' (AI WBS cũ), 'event_planner_agent' (agent mới), ...
  channel: {
    type: String,
    default: 'wbs',
  },

  // Tiêu đề gọn cho sidebar lịch sử (giống ChatGPT)
  title: {
    type: String,
  },
  
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    intent: String,
    data: Schema.Types.Mixed, // Store any additional data (extracted_info, wbs, etc.)
  }],
  
  currentEvent: {
    event_name: String,
    event_type: String,
    event_date: String,
    venue: String,
    headcount_total: Number,
    departments: [String],
  },
  
  wbsGenerated: {
    type: Boolean,
    default: false,
  },
  
  wbsData: {
    epics: Schema.Types.Mixed,
    tasks: Schema.Types.Mixed,
    risks: Schema.Types.Mixed,
    extracted_info: Schema.Types.Mixed,
  },
  
  applied: {
    type: Boolean,
    default: false,
  },
  
  appliedAt: Date,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  versionKey: false,
  // Map model này sang collection 'conversations' (đang có dữ liệu sẵn)
  collection: 'conversations'
});

// Indexes for efficient queries
ConversationHistorySchema.index({ eventId: 1, userId: 1 });
ConversationHistorySchema.index({ sessionId: 1 });
ConversationHistorySchema.index({ createdAt: -1 });
ConversationHistorySchema.index({ eventId: 1, applied: 1 });
ConversationHistorySchema.index({ userId: 1, channel: 1, updatedAt: -1 });

export default mongoose.model('ConversationHistory', ConversationHistorySchema);



