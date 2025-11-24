import mongoose from 'mongoose';
import EventBudgetPlan from '../models/budgetPlanDep.js';

const decimalToNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value.toString === 'function') {
    const str = value.toString();
    const parsed = parseFloat(str);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export const getBudgetItemsForExport = async (eventId) => {
  try {
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return [];
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const plans = await EventBudgetPlan.find({
      eventId: eventObjectId,
      status: { $ne: 'draft' },
    })
      .populate('departmentId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const rows = [];

    plans.forEach((plan) => {
      (plan.items || []).forEach((item) => {
        const quantity = decimalToNumber(item.qty);
        const unitCost = decimalToNumber(item.unitCost);
        const estimatedTotal = decimalToNumber(item.total) || quantity * unitCost;
        const actualAmount = decimalToNumber(item.actualAmount);
        const evidenceLink = (item.evidence || []).find((ev) => ev.type === 'link');

        rows.push({
          departmentName: plan.departmentId?.name || 'Chưa phân ban',
          category: item.category || 'Khác',
          name: item.name || '',
          unit: item.unit || '',
          quantity,
          unitCost,
          estimatedTotal,
          purchaseLink: evidenceLink?.url || '',
          plannedNote: item.note || '',
          actualAmount,
          profit: estimatedTotal - actualAmount,
          planStatus: plan.status || 'submitted',
          itemStatus: item.status || 'pending',
          submittedStatus: item.submittedStatus || 'draft',
          comparison: item.comparison || '',
          actualNote: item.memberNote || '',
        });
      });
    });

    return rows;
  } catch (error) {
    console.error('❌ Error fetching budget data for export:', error);
    return [];
  }
};


