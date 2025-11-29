import mongoose, { Types, Schema } from "mongoose";
const OccurredRiskSchema = new Schema({
    occurred_name: { type: String },
    occurred_location: { type: String },
    occurred_date: { type: Date },
    occurred_status: { type: String, enum: ['resolving', 'resolved'], default: 'resolving' },
    occurred_description: { type: String },
    resolve_action: { type: String },
    resolve_personId: { type: Types.ObjectId, ref: 'EventMember' },
    update_personId: { type: Types.ObjectId, ref: 'EventMember' },
})
const RiskSchema = new Schema({
    eventId: { type: Types.ObjectId, ref: 'Event', required: true }, 
    scope: {
        type: String,
        enum: ["event", "department"],
        default: "department",
    },
    departmentId: {
        type: Types.ObjectId,
        ref: "Department",
        required: function () {
            return this.scope === "department";
        },
    },
    risk_category: {
        type: String,
        required: true
    },
    name: { type: String, required: true },
    impact: { type: String, enum: ['low', 'medium', 'high'], required: true },
    likelihood: {
        type: String,
        enum: ["very_low", "low", "medium", "high", "very_high"],
        required: true,
    },
    risk_mitigation_plan: { type: String, required: true },
    risk_response_plan: { type: String, required: true },
    risk_status: { type: String, enum: ['not_yet', 'resolving', 'resolved'], default: 'not_yet' },
    occurred_risk: [OccurredRiskSchema],
}, { timestamps: true, versionKey: false });
export default mongoose.model('Risk', RiskSchema);