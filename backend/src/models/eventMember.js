import mongoose, {Types, Schema} from "mongoose";
const EventMemberSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Types.ObjectId, ref: 'Department' },
    role: {type: String, enum: ['HoOC', 'HoD', 'Member'], default: 'Member' },
}, { timestamps: true, versionKey: false });
export default mongoose.model('EventMember', EventMemberSchema);