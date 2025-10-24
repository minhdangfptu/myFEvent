import mongoose, { Schema, Types } from 'mongoose';

const CalendarSchema = new Schema({
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true, unique: true },
  name: { type: String, default: 'Department Calendar' },

  
  events: [{
    title: { type: String, required: true },
    description: String,
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  }]
}, { timestamps: true, versionKey: false });

CalendarSchema.index({ departmentId: 1 }, { unique: true });

module.exports = mongoose.model('Calendar', CalendarSchema);
