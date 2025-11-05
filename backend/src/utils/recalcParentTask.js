import Task from '../models/task.js';

/**
 * Recalculate parent (assigneeId=null) dựa trên các con:
 * - done nếu tất cả con done
 * - in_progress nếu có ít nhất 1 con đã start
 * - todo nếu chưa con nào start
 * - progressPct = trung bình progressPct của con
 * Đệ quy lên ancestor.
 */
export default async function recalcParentsUpward(parentId, eventId) {
    if (!parentId) return;

    const parent = await Task.findOne({ _id: parentId, eventId });
    if (!parent) return;

    // Chỉ auto-calc cho parent giao cho ban
    if (parent.assigneeId) return;

    const children = await Task.find({ eventId, parentId: parent._id }).select('status progressPct');
    const total = children.length;

    if (total === 0) {
        parent.status = 'todo';
        parent.progressPct = 0;
    } else {
        const doneCount = children.filter(c => c.status === 'done').length;
        const startedCount = children.filter(c => c.status !== 'todo').length;
        const avgProgress = Math.round(children.reduce((s, c) => s + (Number(c.progressPct) || 0), 0) / total);

        if (doneCount === total) parent.status = 'done';
        else if (startedCount > 0) parent.status = 'in_progress';
        else parent.status = 'todo';

        parent.progressPct = avgProgress;
    }

    await parent.save();
    return recalcParentsUpward(parent.parentId, eventId);
}
