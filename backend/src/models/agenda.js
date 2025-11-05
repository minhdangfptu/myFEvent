import mongoose, { Schema, Types } from 'mongoose';

const AgendaSchema = new Schema({
    milestoneId: { type: Types.ObjectId, ref: 'Milestone', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    name: { type: String, required: true },
    description: { type: String },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Agenda', AgendaSchema);