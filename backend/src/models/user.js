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
  fullName: { 
    type: String, 
    trim: true,
    required: true
  },
  avatarUrl: String,
  bio: { type: String, default: '' },
  highlight: { type: String, default: '' },
  tags: { type: [String], default: [] },
  totalEvents: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
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
    enum: ['user', 'admin'],
    default: 'user',
  },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
