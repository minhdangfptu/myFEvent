import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: function () { return this.authProvider === 'local'; }
  },
  fullName: { type: String, trim: true },
  avatarUrl: String,
  phone: {
    type: String,
    required: function () { return this.authProvider === 'local'; },
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active',
  },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'google' },
  isFirstLogin: { type: Boolean, default: true },
  role: {
    type: String,
    enum: ['user', 'admin', 'mentor', 'IC-PDP'],
    default: 'user',
  },
}, { timestamps: true });
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('User', UserSchema);
