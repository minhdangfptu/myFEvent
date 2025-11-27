import mongoose, { Schema, Types } from 'mongoose';
const DepartmentSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    description: { type: String },
    leaderId: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });

// Indexes để tối ưu query performance
DepartmentSchema.index({ eventId: 1 }); // Tìm departments theo event
DepartmentSchema.index({ eventId: 1, name: 1 }); // Search departments trong event
DepartmentSchema.index({ leaderId: 1 }); // Tìm departments của một leader

export default mongoose.model('Department', DepartmentSchema);