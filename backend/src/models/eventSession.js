import mongoose, { Schema, Types } from 'mongoose';

/**
 * EventSession: các phiên/tiết mục (agenda) BÊN TRONG 1 event.
 * Dùng để hiển thị lịch trình chi tiết: tiêu đề, thời gian, người phụ trách.
 */
const EventSessionSchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  title: { type: String, required: true },
  description: String,
  startAt: { type: Date, required: true },
  endAt:   { type: Date, required: true },
  location: String,
  sortOrder: Number
}, { timestamps: true, versionKey: false });

EventSessionSchema.index({ eventId: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model('EventSession', EventSessionSchema);
