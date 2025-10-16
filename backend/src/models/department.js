import mongoose, { Schema, Types } from 'mongoose';
const DepartmentSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event' },
    name: { type: String, required: true },
    description: { type: String },
    leaderId: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });
export default mongoose.model('Department', DepartmentSchema);