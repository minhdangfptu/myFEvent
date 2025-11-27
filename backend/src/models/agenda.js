import mongoose, { Schema, Types } from 'mongoose';

const AgendaItemSchema = new Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    content: { type: String, required: true },
}); 

const AgendaSchema = new Schema({
    date: { type: Date, required: true },
    items: [AgendaItemSchema],
}); 

const AgendaAndMileStoneSchema = new Schema({
    milestoneId: { type: Types.ObjectId, ref: 'Milestone', required: true },
    agenda: [AgendaSchema], 
}, { timestamps: true, versionKey: false, collection: 'agendas' });

export default mongoose.model('Agenda', AgendaAndMileStoneSchema);