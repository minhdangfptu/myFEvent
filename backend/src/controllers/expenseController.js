import mongoose from 'mongoose';
import EventExpense from '../models/expense.js';
import EventBudgetPlan from '../models/budgetPlanDep.js';
import { ensureEventExists, ensureDepartmentInEvent } from '../services/departmentService.js';
import { getRequesterMembership } from '../services/eventMemberService.js';
import {
  notifyExpenseReported,
  notifyExpenseSubmitted,
} from '../services/notificationService.js';
import {
  normalizeEvidenceArray,
  toDecimal128,
  decimalToNumber,
  toObjectId,
  getItemKey
} from '../services/expenseService.js';

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/report-expense
export const reportExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    const { actualAmount, evidence, memberNote, isPaid } = req.body;

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Cho phép report khi:
    // 1. Budget đã được approved VÀ item đã được assign cho member này
    // 2. Hoặc budget đã được gửi xuống members (sent_to_members)
    if (budget.status !== 'sent_to_members' && budget.status !== 'approved') {
      return res.status(400).json({ message: 'Budget must be approved or sent to members first' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Kiểm tra xem user có phải là member được assign cho item này không
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userIdObj = toObjectId(userId);
    if (!userIdObj) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Kiểm tra xem user có phải là HoD (Head of Department) không
    const userIdStr = userIdObj.toString();
    let leaderId = null;
    if (department.leaderId) {
      if (typeof department.leaderId === 'object' && department.leaderId._id) {
        leaderId = department.leaderId._id.toString();
      } else {
        leaderId = department.leaderId.toString();
      }
    }
    const isHoD = leaderId && leaderId === userIdStr;

    const userMember = await getRequesterMembership(eventId, userIdObj);

    // Nếu không phải HoD, kiểm tra quyền member như bình thường
    if (!isHoD) {
      if (!userMember) {
        console.error('EventMember not found:', { eventId, userId: userIdObj.toString(), userIdType: typeof userId });
        return res.status(403).json({ message: 'You are not a member of this event' });
      }

      // Nếu budget chỉ mới approved (chưa gửi xuống), kiểm tra xem item có được assign cho user này không
      if (budget.status === 'approved') {
        if (!item.assignedTo) {
          return res.status(400).json({ message: 'Item is not assigned to anyone. Please wait for HoD to assign it.' });
        }

        const userDeptId = userMember.departmentId ? getItemKey(userMember.departmentId) : null;
        const reqDeptId = getItemKey(departmentId);
        
        if (userDeptId && userDeptId !== reqDeptId) {
          return res.status(403).json({ message: 'You are not a member of this department' });
        }

        if (getItemKey(item.assignedTo) !== getItemKey(userMember._id)) {
          return res.status(403).json({ message: 'You are not assigned to this item' });
        }
      } else if (budget.status === 'sent_to_members') {
        if (item.assignedTo && getItemKey(item.assignedTo) !== getItemKey(userMember._id)) {
          return res.status(403).json({ message: 'You are not assigned to this item' });
        }
      }
    }

    // Tìm hoặc tạo expense record
    const itemIdObj = toObjectId(itemId);
    const planIdObj = toObjectId(budgetId);
    
    let expense = await EventExpense.findOne({
      planId: planIdObj,
      itemId: itemIdObj
    });

    const estimatedTotal = decimalToNumber(item.total);

    if (!expense) {
      expense = new EventExpense({
        eventId: toObjectId(eventId),
        departmentId: toObjectId(departmentId),
        planId: planIdObj,
        itemId: itemIdObj,
        estimatedTotal: toDecimal128(estimatedTotal, '0')
      });
    }

    // Update expense data
    if (actualAmount !== undefined) {
      expense.actualAmount = toDecimal128(actualAmount, '0');
    }
    if (evidence !== undefined && Array.isArray(evidence)) {
      expense.evidence = normalizeEvidenceArray(evidence);
    }
    if (memberNote !== undefined) {
      expense.memberNote = memberNote;
    }
    if (isPaid !== undefined) {
      expense.isPaid = isPaid;
    }
    
    expense.reportedBy = userIdObj;
    expense.reportedAt = new Date();
    expense.estimatedTotal = toDecimal128(estimatedTotal, '0');

    await expense.save();

    // Send notification to HoD
    try {
      const userMember = await getRequesterMembership(eventId, userIdObj);
      if (userMember) {
        await notifyExpenseReported(eventId, departmentId, budgetId, itemId, userMember._id);
      }
    } catch (notifError) {
      console.error('Error sending expense reported notification:', notifError);
      // Don't fail the request if notification fails
    }

    return res.status(200).json({ data: expense });
  } catch (error) {
    console.error('reportExpense error:', error);
    return res.status(500).json({ message: 'Failed to report expense' });
  }
};

// PATCH /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/toggle-paid
export const togglePaidStatus = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;

    await ensureEventExists(eventId);
    await ensureDepartmentInEvent(eventId, departmentId);

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const itemIdObj = toObjectId(itemId);
    const planIdObj = toObjectId(budgetId);

    let expense = await EventExpense.findOne({
      planId: planIdObj,
      itemId: itemIdObj
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found. Please report expense first.' });
    }

    expense.isPaid = !expense.isPaid;
    await expense.save();

    return res.status(200).json({ data: expense });
  } catch (error) {
    console.error('togglePaidStatus error:', error);
    return res.status(500).json({ message: 'Failed to toggle paid status' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/submit-expense
export const submitExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    // Cho phép submit khi:
    // 1. Budget đã được approved VÀ item đã được assign cho member này
    // 2. Hoặc budget đã được gửi xuống members (sent_to_members)
    if (budget.status !== 'sent_to_members' && budget.status !== 'approved') {
      return res.status(400).json({ message: 'Budget must be approved or sent to members first' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Validate: chỉ member được assign mới nộp được
    if (!item.assignedTo) {
      return res.status(400).json({ message: 'Item is not assigned to anyone' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userIdObj = toObjectId(userId);
    if (!userIdObj) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userMember = await getRequesterMembership(eventId, userIdObj);

    if (!userMember) {
      console.error('EventMember not found:', { eventId, userId: userIdObj.toString(), userIdType: typeof userId });
      return res.status(403).json({ message: 'You are not a member of this event' });
    }

    const userDeptId = userMember.departmentId ? getItemKey(userMember.departmentId) : null;
    const reqDeptId = getItemKey(departmentId);
    
    if (userDeptId && userDeptId !== reqDeptId) {
      return res.status(403).json({ message: 'You are not a member of this department' });
    }

    if (getItemKey(item.assignedTo) !== getItemKey(userMember._id)) {
      return res.status(403).json({ message: 'You are not assigned to this item' });
    }

    const itemIdObj = toObjectId(itemId);
    const planIdObj = toObjectId(budgetId);

    let expense = await EventExpense.findOne({
      planId: planIdObj,
      itemId: itemIdObj
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found. Please report expense first.' });
    }

    // Validate: phải có actualAmount hoặc evidence
    const hasActualAmount = decimalToNumber(expense.actualAmount) > 0;
    const hasEvidence = expense.evidence && expense.evidence.length > 0;

    if (!hasActualAmount && !hasEvidence) {
      return res.status(400).json({ message: 'Please provide actual amount or evidence before submitting' });
    }

    // Update submittedStatus
    expense.submittedStatus = 'submitted';
    await expense.save();

    // Send notification to HoD
    try {
      await notifyExpenseSubmitted(eventId, departmentId, budgetId, itemId, userMember._id);
    } catch (notifError) {
      console.error('Error sending expense submitted notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Kiểm tra xem tất cả items đã được submitted chưa
    const allExpenses = await EventExpense.find({ planId: planIdObj });
    const allItemsSubmitted = budget.items.every(budgetItem => {
      const itemKey = getItemKey(budgetItem.itemId) || getItemKey(budgetItem._id);
      const expense = allExpenses.find(exp => getItemKey(exp.itemId) === itemKey);
      return expense && expense.submittedStatus === 'submitted';
    });

    if (allItemsSubmitted) {
      console.log('All items have been submitted for budget:', budgetId);
    }

    return res.status(200).json({ 
      data: expense,
      allItemsSubmitted: allItemsSubmitted 
    });
  } catch (error) {
    console.error('submitExpense error:', error);
    return res.status(500).json({ message: 'Failed to submit expense' });
  }
};

// POST /api/events/:eventId/departments/:departmentId/budget/:budgetId/items/:itemId/undo-submit
export const undoSubmitExpense = async (req, res) => {
  try {
    const { eventId, departmentId, budgetId, itemId } = req.params;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    await ensureEventExists(eventId);
    const department = await ensureDepartmentInEvent(eventId, departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const budget = await EventBudgetPlan.findOne({
      _id: new mongoose.Types.ObjectId(budgetId),
      eventId: new mongoose.Types.ObjectId(eventId),
      departmentId: new mongoose.Types.ObjectId(departmentId)
    });

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const item = budget.items.find(it => 
      it.itemId?.toString() === itemId || it._id?.toString() === itemId
    );

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userIdObj = toObjectId(userId);
    if (!userIdObj) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userMember = await getRequesterMembership(eventId, userIdObj);

    if (!userMember) {
      return res.status(403).json({ message: 'You are not a member of this event' });
    }

    const itemIdObj = toObjectId(itemId);
    const planIdObj = toObjectId(budgetId);

    const expense = await EventExpense.findOne({
      planId: planIdObj,
      itemId: itemIdObj
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Validate: chỉ member đã nộp mới hoàn tác được
    if (expense.submittedStatus !== 'submitted') {
      return res.status(400).json({ message: 'Expense is not submitted' });
    }

    if (item.assignedTo && getItemKey(item.assignedTo) !== getItemKey(userMember._id)) {
      return res.status(403).json({ message: 'You are not assigned to this item' });
    }

    // Update submittedStatus
    expense.submittedStatus = 'draft';
    await expense.save();

    return res.status(200).json({ data: expense });
  } catch (error) {
    console.error('undoSubmitExpense error:', error);
    return res.status(500).json({ message: 'Failed to undo submit expense' });
  }
};
