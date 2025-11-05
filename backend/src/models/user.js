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
  phone: {
    type: String,
    unique: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active',
  },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'google' },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
}, { timestamps: true });
UserSchema.index({ phone: 1 },    { unique: true, partialFilterExpression: { phone: { $type: "string" } } });
UserSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });

export default mongoose.model('User', UserSchema);
