import mongoose, { Schema, Types } from 'mongoose';
const IncomeSchema = new Schema({
  eventId:     { type: Types.ObjectId, ref: 'Event', required: true, index: true },
  sourceType:  { type: String, enum: ['ticket','sponsorship','donation','other'], default: 'other' },
  description: String,

  amount:   { type: Schema.Types.Decimal128, required: true, min: 0 },
  currency: { type: String, default: 'VND' },

  status: { type: String, enum: ['pending','received','refunded'], default: 'pending' }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Income', IncomeSchema);
