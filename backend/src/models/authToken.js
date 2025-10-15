import mongoose, { Schema } from 'mongoose'

const AuthTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  userAgent: String,
  ipAddress: String,
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
}, { timestamps: true })

export default mongoose.model('AuthToken', AuthTokenSchema)




