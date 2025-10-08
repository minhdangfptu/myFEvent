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
    required: true,
  },
  fullName: { type: String, trim: true },
  avatarUrl: String,
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'banned'],
    default: 'active',
  },
  isFirstLogin: { type: Boolean, default: true },
  roles: [{
    type: String,
    enum: ['user', 'admin', 'mentor','IC-PDP'],
    default: 'user',
  }],
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
