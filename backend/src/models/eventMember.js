import mongoose, {Types, Schema} from "mongoose";
const EventMemberSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    departmentId: { type: Types.ObjectId, ref: 'Department' },
    role: {type: String, enum: ['HoOC', 'HoD', 'Member'], default: 'Member' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true, versionKey: false });

// Compound index để tối ưu query tìm membership
EventMemberSchema.index({ userId: 1, eventId: 1 });

export default mongoose.model('EventMember', EventMemberSchema);