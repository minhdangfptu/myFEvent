import mongoose from 'mongoose';
import EventExpense from '../models/expense.js';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import { getRequesterMembership } from './eventMemberService.js';

// Helper: Normalize evidence array
export const normalizeEvidenceArray = (evidence = []) => {
  if (!Array.isArray(evidence)) return [];
  const allowedTypes = new Set(['image', 'pdf', 'doc', 'link']);
  return evidence
    .filter(ev => ev && (ev.url || ev.name))
    .map(ev => ({
      type: allowedTypes.has(ev.type) ? ev.type : 'link',
      url: ev.url || '',
      name: ev.name || ''
    }));
};

// Helper: Convert Decimal128 to number
export const decimalToNumber = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value.toString && typeof value.toString === 'function') {
    return parseFloat(value.toString()) || 0;
  }
  return 0;
};

// Helper: Convert to Decimal128
export const toDecimal128 = (value, defaultValue = '0') => {
  if (value === null || value === undefined) {
    return mongoose.Types.Decimal128.fromString(defaultValue);
  }
  if (typeof value === 'number') {
    return mongoose.Types.Decimal128.fromString(String(value));
  }
  if (typeof value === 'string') {
    if (!value || value.trim() === '') {
      return mongoose.Types.Decimal128.fromString(defaultValue);
    }
    return mongoose.Types.Decimal128.fromString(value);
  }
  if (value && typeof value.toString === 'function') {
    try {
      const str = value.toString();
      if (str && !isNaN(parseFloat(str))) {
        if (value.constructor && value.constructor.name === 'Decimal128') {
          return value;
        }
        return mongoose.Types.Decimal128.fromString(str);
      }
    } catch (e) {
      // Ignore
    }
  }
  return mongoose.Types.Decimal128.fromString(defaultValue);
};

// Helper: Convert to ObjectId
export const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === 'string') {
    if (mongoose.Types.ObjectId.isValid(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    return null;
  }
  if (value._id) return toObjectId(value._id);
  if (value.id) return toObjectId(value.id);
  return null;
};

// Helper: Get item key for expense lookup
export const getItemKey = (itemId) => {
  if (!itemId) return null;
  if (itemId instanceof mongoose.Types.ObjectId) return itemId.toString();
  if (typeof itemId === 'string') return itemId;
  if (itemId.toString && typeof itemId.toString === 'function') {
    return itemId.toString();
  }
  return null;
};

// Helper: Fetch expenses for budgets
export const fetchExpensesForBudgets = async (budgetIds) => {
  if (!budgetIds || budgetIds.length === 0) return new Map();
  
  const expenses = await EventExpense.find({
    planId: { $in: budgetIds }
  }).lean();
  
  const expensesByBudget = new Map();
  const expensesByItem = new Map();
  
  for (const expense of expenses) {
    const planId = expense.planId?.toString() || expense.planId;
    const itemId = getItemKey(expense.itemId);
    
    if (!planId || !itemId) continue;
    
    if (!expensesByBudget.has(planId)) {
      expensesByBudget.set(planId, new Map());
    }
    
    const budgetExpenses = expensesByBudget.get(planId);
    budgetExpenses.set(itemId, expense);
  }
  
  return expensesByBudget;
};

// Helper: Merge item with expense data
export const mergeItemWithExpense = (item, expense) => {
  if (!expense) {
    return {
      ...item,
      actualAmount: 0,
      evidence: [],
      memberNote: '',
      isPaid: false,
      comparison: null,
      reportedBy: null,
      reportedAt: null,
      submittedStatus: 'draft'
    };
  }
  
  return {
    ...item,
    actualAmount: decimalToNumber(expense.actualAmount),
    evidence: normalizeEvidenceArray(expense.evidence || []),
    memberNote: expense.memberNote || '',
    isPaid: expense.isPaid || false,
    comparison: expense.comparison || null,
    reportedBy: expense.reportedBy,
    reportedAt: expense.reportedAt,
    submittedStatus: expense.submittedStatus || 'draft'
  };
};

// Helper: Populate assigned info for items
export const populateAssignedInfoForItems = async (items) => {
  if (!items || items.length === 0) return items;
  
  const assignedToIds = items
    .map(item => item.assignedTo)
    .filter(Boolean)
    .map(id => toObjectId(id))
    .filter(Boolean);
  
  if (assignedToIds.length === 0) return items;
  
  const members = await EventMember.find({
    _id: { $in: assignedToIds }
  })
    .populate('userId', 'fullName email')
    .lean();
  
  const memberMap = new Map();
  for (const member of members) {
    memberMap.set(member._id.toString(), member);
  }
  
  return items.map(item => {
    if (!item.assignedTo) return item;
    const memberId = getItemKey(item.assignedTo);
    const member = memberId ? memberMap.get(memberId) : null;
    
    return {
      ...item,
      assignedToInfo: member ? {
        _id: member._id,
        userId: member.userId?._id || member.userId,
        fullName: member.userId?.fullName || '',
        email: member.userId?.email || ''
      } : null
    };
  });
};

// Helper: Build budget with expenses
export const buildBudgetWithExpenses = async (budget) => {
  if (!budget) return null;
  
  const budgetObj = budget.toObject ? budget.toObject() : budget;
  const expensesByBudget = await fetchExpensesForBudgets([budgetObj._id]);
  const planExpenses = expensesByBudget.get(budgetObj._id.toString()) || new Map();
  
  const itemsWithExpenses = (budgetObj.items || []).map(item => {
    const key = getItemKey(item.itemId) || getItemKey(item._id);
    const expense = key ? planExpenses.get(key) : null;
    return mergeItemWithExpense(item, expense);
  });
  
  const itemsWithAssigned = await populateAssignedInfoForItems(itemsWithExpenses);
  
  return {
    ...budgetObj,
    items: itemsWithAssigned
  };
};

// Helper: Load membership
export const loadMembership = async (eventId, userId, context = 'expense') => {
  if (!userId) return null;
  try {
    return await getRequesterMembership(eventId, userId);
  } catch (error) {
    console.warn(`${context}: unable to load membership`, error?.message);
    return null;
  }
};

// Helper: Get ID as string
export const getIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value._id) return getIdString(value._id);
  if (value.id) return getIdString(value.id);
  if (value.toString && typeof value.toString === 'function') {
    return value.toString();
  }
  return null;
};
