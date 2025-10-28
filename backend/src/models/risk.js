import mongoose, {Types, Schema} from "mongoose";
const RiskSchema = new Schema({
    departmentId: { type: Types.ObjectId, ref: 'Department', required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    impact: { type: String, enum: ['low', 'medium', 'high'], required: true },
    mitigationPlan: { type: String },
    status: { type: String, enum: ['open', 'in progress', 'closed'], default: 'open' },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Risk', RiskSchema);