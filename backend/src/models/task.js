import mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,

  status: { type: String, enum: ['todo','in_progress','blocked','done','cancelled'], default: 'todo' },
  progressPct: { type: Number, min: 0, max: 100, default: 0 },

  estimate: Number,
  estimateUnit: { type: String, enum: ['h','d','w'], default: 'h' },

  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
  dueDate: Date,

  assigneeId:   { type: Types.ObjectId, ref: 'EventMember' },
  eventId:      { type: Types.ObjectId, ref: 'Event' },       // (O) như ERD
  departmentId: { type: Types.ObjectId, ref: 'Department' },  // (O)
  milestoneId:  { type: Types.ObjectId, ref: 'Milestone' },
  parentId:     { type: Types.ObjectId, ref: 'Task' },
  dependencies: [{ type: Types.ObjectId, ref: 'Task' }]
}, { timestamps: true, versionKey: false });

TaskSchema.index({ eventId: 1, departmentId: 1, dueDate: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });

export default mongoose.model('Task', TaskSchema);
