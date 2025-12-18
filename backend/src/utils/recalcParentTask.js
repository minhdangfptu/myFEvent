import Task from '../models/task.js';

/**
 * Recalculate epic task dựa trên các normal tasks con:
 * - hoan_thanh nếu tất cả con hoan_thanh
 * - da_bat_dau nếu có ít nhất 1 con đã bắt đầu
 * - chua_bat_dau nếu chưa con nào bắt đầu
 * - progressPct = trung bình progressPct của con
 * Epic task không cho phép chỉnh sửa thủ công status
 */
export default async function recalcParentsUpward(parentId, eventId) {
    if (!parentId) return;

    const parent = await Task.findOne({ _id: parentId, eventId });
    if (!parent) return;

    // Chỉ auto-calc cho epic task (taskType = 'epic')
    if (parent.taskType !== 'epic') return;

    // Lấy tất cả normal tasks con (taskType = 'normal' và parentId = parent._id)
    const children = await Task.find({ 
        eventId, 
        parentId: parent._id,
        taskType: 'normal'
    }).select('status progressPct');
    
    const total = children.length;

    if (total === 0) {
        parent.status = 'chua_bat_dau';
        parent.progressPct = 0;
    } else {
        const completedCount = children.filter(c => c.status === 'hoan_thanh').length;
        const startedCount = children.filter(c => c.status === 'da_bat_dau' || c.status === 'hoan_thanh').length;
        const avgProgress = Math.round(children.reduce((s, c) => s + (Number(c.progressPct) || 0), 0) / total);

        // Epic task tự động chuyển sang hoan_thanh khi tất cả normal tasks hoàn thành
        if (completedCount === total) {
            parent.status = 'hoan_thanh';
            parent.progressPct = 100;
        } else if (startedCount > 0) {
            parent.status = 'da_bat_dau';
            parent.progressPct = avgProgress;
        } else {
            parent.status = 'chua_bat_dau';
            parent.progressPct = avgProgress;
        }
    }

    await parent.save();

    // Không đệ quy lên nữa vì chỉ có 1 cấp epic -> normal
}