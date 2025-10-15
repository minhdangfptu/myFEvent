import mongoose from "mongoose";
import {Types, Schema} from "mongoose";

const MilestoneSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'completed', 'overdue'], default: 'pending' },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Milestone', MilestoneSchema);