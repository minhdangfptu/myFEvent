import mongoose from "mongoose";
import {Types, Schema} from "mongoose";

const MilestoneSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true },
    name: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

// Indexes để tối ưu query performance
MilestoneSchema.index({ eventId: 1, targetDate: 1 }); // Compound index cho queries và sort
MilestoneSchema.index({ eventId: 1, isDeleted: 1 }); // Filter milestones theo event và deleted status
MilestoneSchema.index({ targetDate: 1 }); // Sort theo targetDate
// Unique index to prevent duplicate milestone names in the same event (only for non-deleted milestones)
MilestoneSchema.index({ eventId: 1, name: 1, isDeleted: 1 }, { 
  unique: true, 
  partialFilterExpression: { isDeleted: false } 
});

export default mongoose.model('Milestone', MilestoneSchema);