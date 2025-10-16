import mongoose, { Schema, Types } from 'mongoose';

const AuthTokenSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, index: true },
  userAgent: String,        
  ipAddress: String,
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
}, { timestamps: true });

AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AuthToken', AuthTokenSchema);
