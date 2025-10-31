import mongoose, { Schema, Types } from 'mongoose';

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

export default mongoose.model('EventSession', EventSessionSchema);
