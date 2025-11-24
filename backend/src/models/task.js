import mongoose from 'mongoose';
import { Schema, Types } from 'mongoose';

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,

  taskType: { type: String, enum: ['epic', 'normal'], default: 'normal' }, // epic = epic task, normal = task thường
  status: { type: String, enum: ['chua_bat_dau', 'da_bat_dau', 'hoan_thanh', 'huy'], default: 'chua_bat_dau' },
  progressPct: { type: Number, min: 0, max: 100, default: 0 },

  estimate: Number,
  estimateUnit: { type: String, enum: ['h','d','w'], default: 'h' },

  suggestedTeamSize: { type: Number, min: 1, max: 5 },

  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
  startDate: Date,
  dueDate: Date,

  assigneeId:   { type: Types.ObjectId, ref: 'EventMember' },
  eventId:      { type: Types.ObjectId, ref: 'Event' },       // (O) như ERD
  departmentId: { type: Types.ObjectId, ref: 'Department' },  // (O)
  milestoneId:  { type: Types.ObjectId, ref: 'Milestone' },
  parentId:     { type: Types.ObjectId, ref: 'Task' }, // Cho normal task: parentId = epicTaskId
  dependencies: [{ type: Types.ObjectId, ref: 'Task' }],
  createdBy:    { type: Types.ObjectId, ref: 'User' } // Người tạo task (để kiểm tra quyền chỉnh sửa)
}, { timestamps: true, versionKey: false });

TaskSchema.index({ eventId: 1, departmentId: 1, dueDate: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ startDate: 1, status: 1 }); // Index để query task cần auto-update

export default mongoose.model('Task', TaskSchema);
