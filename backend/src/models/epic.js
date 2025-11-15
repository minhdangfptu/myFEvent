import mongoose, { Schema, Types } from 'mongoose';

const EpicSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  
  eventId: { type: Types.ObjectId, ref: 'Event', required: true },
  departmentId: { type: Types.ObjectId, ref: 'Department', required: true },
  assignedToId: { type: Types.ObjectId, ref: 'EventMember' }, // HOD assigned to this epic
  
  startDate: Date,
  endDate: Date,
  
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
}, { timestamps: true, versionKey: false });

EpicSchema.index({ eventId: 1, departmentId: 1 });
EpicSchema.index({ assignedToId: 1 });

export default mongoose.model('Epic', EpicSchema);



