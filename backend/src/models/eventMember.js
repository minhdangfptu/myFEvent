import mongoose, {Types, Schema} from "mongoose";
const EventMemberSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    departmentId: { type: Types.ObjectId, ref: 'Department' },
    role: {type: String, enum: ['HoOC', 'HoD', 'Member'], default: 'Member' },
    status: { type: String, enum: ['active', 'deactive'], default: 'active', index: true }
}, { timestamps: true, versionKey: false });

// Compound indexes để tối ưu query tìm membership
EventMemberSchema.index({ userId: 1, eventId: 1 }); // Tìm membership của user trong event
EventMemberSchema.index({ eventId: 1, status: 1 }); // List members trong event (filter active)
EventMemberSchema.index({ eventId: 1, role: 1 }); // List members theo role (HoOC, HoD)
EventMemberSchema.index({ eventId: 1, role: 1, status: 1 }); // Compound cho queries phổ biến
EventMemberSchema.index({ departmentId: 1, status: 1 }); // List members trong department
EventMemberSchema.index({ eventId: 1, departmentId: 1 }); // Count members by department
EventMemberSchema.index({ userId: 1, status: 1 }); // List events của user
EventMemberSchema.index({ createdAt: -1 }); // Sort by created date

export default mongoose.model('EventMember', EventMemberSchema);