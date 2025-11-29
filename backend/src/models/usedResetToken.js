import mongoose, { Schema } from 'mongoose';

const UsedResetTokenSchema = new Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  usedAt: {
    type: Date,
    default: Date.now,
    index: true,
    // Auto-delete after 24 hours to keep collection clean
    expires: 86400, // 24 hours in seconds
  }
});

export default mongoose.model('UsedResetToken', UsedResetTokenSchema);
