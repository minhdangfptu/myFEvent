import mongoose, { Types, Schema } from "mongoose";

const OccurredRiskSchema= new Schema({
    occurred_name: {type: String},
    occurred_location: {type: String},
    occurred_date: {type: Date},
    resolve_personId: { type: Types.ObjectId, ref: 'EventMember'},
})

const RiskSchema = new Schema({
    departmentId: { type: Types.ObjectId, ref: 'Department', required: true },
    risk_category: {
        type: String,
        enum: [
            'infrastructure',      // Cơ sở vật chất
            'mc-guests',           // MC & Khách mời
            'communication',       // Truyền thông
            'players',             // Người chơi
            'staffing',            // Nhân sự
            'communication_post',  // Tuyến bài
            'attendees',           // Người tham gia
            'weather',             // Thời tiết
            'time',                // Thời gian
            'timeline',            // Timeline
            'tickets',             // Vé
            'collateral',          // Ấn phẩm (design/printing collateral)
            'game',                // Game
            'sponsorship',         // Nhà tài trợ
            'finance',             // Tài chính
            'transportation',      // Vận chuyển
            'decor',                // Đồ trang trí
            'others',               // Khác
        ],
        required: true
    },
    name: { type: String, required: true },
    impact: { type: String, enum: ['low', 'medium', 'high'], required: true },
    risk_mitigation_plan: { type: String, required: true },
    risk_response_plan: { type: String, required: true },
    occurred_risk : [OccurredRiskSchema],
}, { timestamps: true, versionKey: false });

export default mongoose.model('Risk', RiskSchema);