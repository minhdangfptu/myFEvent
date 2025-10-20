import mongoose, { Schema, Types } from 'mongoose';
const EventSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    description: { type: String },
    eventDate: { type: Date, required: true },
    location: { type: String },
    organizerName: { type: Types.ObjectId, ref: 'User', required: true },
    image: [{ type: String }],
    status: { type: String, enum: ['cancelled', 'completed', 'ongoing', 'scheduled'], default: 'scheduled' },
    joinCode: { type: String, unique: true, index: true },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Event', EventSchema);