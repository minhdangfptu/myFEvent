import mongoose from "mongoose";
import {Types, Schema} from "mongoose";

const MilestoneSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Milestone', MilestoneSchema);