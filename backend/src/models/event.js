import mongoose, { Schema } from 'mongoose';
const EventSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['public', 'private'], required: true },
    description: { type: String },
    eventStartDate: { type: Date },
    eventEndDate: { type: Date },
    location: { type: String },
    organizerName: { type: String, required: true },
    image: { type: String, required: true },
    status: { type: String, enum: ['cancelled', 'completed', 'ongoing', 'scheduled'], default: 'scheduled' },
    joinCode: { type: String, unique: true, index: true },
    banInfo: {
        isBanned: { type: Boolean, default: false },
        banReason: { type: String },
        bannedAt: { type: Date }
    }
}, {
    timestamps: true, versionKey: false, toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
EventSchema.virtual("members", {
    ref: "EventMember",
    localField: "_id",
    foreignField: "eventId"
});

// Indexes để tối ưu query performance
EventSchema.index({ type: 1 }); // Filter by public/private
EventSchema.index({ status: 1 }); // Filter by status
EventSchema.index({ type: 1, status: 1 }); // Compound cho listPublicEvents
EventSchema.index({ eventStartDate: 1 }); // Sort theo startDate
EventSchema.index({ eventStartDate: 1, createdAt: -1 }); // Compound sort cho listPublicEvents
EventSchema.index({ 'banInfo.isBanned': 1 }); // Admin queries
EventSchema.index({ name: 'text', description: 'text', organizerName: 'text' }); // Text search
EventSchema.index({ createdAt: -1 }); // Sort by created date

export default mongoose.model('Event', EventSchema);