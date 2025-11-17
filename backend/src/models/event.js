import mongoose, { Schema } from 'mongoose';
const EventSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    description: { type: String },
    eventStartDate: { type: Date },
    eventEndDate: { type: Date},
    location: { type: String },
    organizerName: { type: String, required: true },
    image: [{ type: String, required: true }],
    status: { type: String, enum: ['cancelled', 'completed', 'ongoing', 'scheduled'], default: 'scheduled' },
    joinCode: { type: String, unique: true, index: true },
    banInfo:{
        isBanned: { type: Boolean, default: false },
        banReason: { type: String },
        bannedAt: { type: Date }
    }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Event', EventSchema);