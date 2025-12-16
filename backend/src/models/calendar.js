import mongoose, { Schema, Types } from 'mongoose';

const CalendarSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['event', 'department'], required: true },
  eventId: {
    type: Types.ObjectId, ref: 'Event',
    required: function () { return this.type === 'event'; },
  },
  departmentId: {
    type: Types.ObjectId, ref: 'Department',
    required: function () { return this.type === 'department'; },
  },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  locationType: { type: String, enum: ['online', 'offline'], required: true },
  location: { type: String, required: true },
  notes: { type: String, default: '' },
  participants: [{
    member: { type: Schema.Types.ObjectId, ref: 'EventMember' },
    participateStatus: { type: String, enum: ['confirmed', 'absent', 'unconfirmed'], default: 'unconfirmed' },
    reasonAbsent: { 
      type: String,
      required: function () { return this.participateStatus === 'absent'; },
  }}],
  attachments: [{ type: String }],
  createdBy: { type: Types.ObjectId, ref: 'EventMember', required: true },
}, { timestamps: true, versionKey: false });

// Indexes để tối ưu query performance
CalendarSchema.index({ eventId: 1, startAt: 1 }); // Compound index cho queries phổ biến
CalendarSchema.index({ departmentId: 1, startAt: 1 }); // Cho department calendars
CalendarSchema.index({ type: 1 }); // Cho filter by type
CalendarSchema.index({ 'participants.member': 1 }); // Cho tìm calendars của một member

export default mongoose.model('Calendar', CalendarSchema);
