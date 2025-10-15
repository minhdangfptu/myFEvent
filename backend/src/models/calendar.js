import mongoose, { Schema, Types } from 'mongoose';

const CalendarSchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'Event', required: true, unique: true },
  name: { type: String, default: 'Event Calendar' },
  visibility: { type: String, enum: ['private','event','public'], default: 'event' }
}, { timestamps: true, versionKey: false });

CalendarSchema.index({ eventId: 1 }, { unique: true });

module.exports = mongoose.model('Calendar', CalendarSchema);
