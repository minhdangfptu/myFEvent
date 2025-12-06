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
  
  try {
    // Convert budgetIds to ObjectIds for query
    const objectIds = budgetIds
      .map(id => {
        try {
          if (id instanceof mongoose.Types.ObjectId) return id;
          if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
          }
          return null;
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);
    
    if (objectIds.length === 0) return new Map();
    
    const expenses = await EventExpense.find({
      planId: { $in: objectIds }
    }).lean();
    
    const expensesByBudget = new Map();
    
    for (const expense of expenses) {
      try {
        const planId = expense.planId?.toString() || expense.planId;
        const itemId = getItemKey(expense.itemId);
        
        if (!planId || !itemId) continue;
        
        if (!expensesByBudget.has(planId)) {
          expensesByBudget.set(planId, new Map());
        }
        
        const budgetExpenses = expensesByBudget.get(planId);
        budgetExpenses.set(itemId, expense);
      } catch (expenseError) {
        continue; // Skip this expense if processing fails
      }
    }
    
    return expensesByBudget;
  } catch (error) {
    // Return empty Map if fetch fails
    return new Map();
  }
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
  
  // Chỉ merge dữ liệu nếu expense đã được submit (submittedStatus === 'submitted')
  // Nếu expense ở trạng thái draft, không hiển thị dữ liệu cho HoD
  const submittedStatus = expense.submittedStatus || 'draft';
  if (submittedStatus !== 'submitted') {
    return {
      ...item,
      actualAmount: 0,
      evidence: [],
      memberNote: '',
      isPaid: false,
      comparison: null,
      reportedBy: null,
      reportedAt: null,
      submittedStatus: submittedStatus
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
    submittedStatus: submittedStatus
  };
};

// Helper: Populate assigned info for items
export const populateAssignedInfoForItems = async (items) => {
  if (!items || items.length === 0) return items;
  
  try {
    const assignedToIds = items
      .map(item => item.assignedTo)
      .filter(Boolean)
      .map(id => {
        try {
          return toObjectId(id);
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);
    
    if (assignedToIds.length === 0) return items;
    
    const members = await EventMember.find({
      _id: { $in: assignedToIds }
    })
      .populate('userId', 'fullName email')
      .lean();
    
    const memberMap = new Map();
    for (const member of members) {
      if (member && member._id) {
        memberMap.set(member._id.toString(), member);
      }
    }
    
    return items.map(item => {
      if (!item.assignedTo) return item;
      try {
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
      } catch (itemError) {
        return item; // Return item as-is if processing fails
      }
    });
  } catch (error) {
    // Return items as-is if population fails
    return items;
  }
};

// Helper: Build budget with expenses
export const buildBudgetWithExpenses = async (budget) => {
  if (!budget) return null;
  
  try {
    const budgetObj = budget.toObject ? budget.toObject() : budget;
    
    // Validate budget has _id
    if (!budgetObj._id) {
      return budgetObj; // Return as-is if no _id
    }
    
    const expensesByBudget = await fetchExpensesForBudgets([budgetObj._id]);
    const planExpenses = expensesByBudget.get(budgetObj._id.toString()) || new Map();
    
    const itemsWithExpenses = (budgetObj.items || []).map(item => {
      try {
        const key = getItemKey(item.itemId) || getItemKey(item._id);
        const expense = key ? planExpenses.get(key) : null;
        return mergeItemWithExpense(item, expense);
      } catch (itemError) {
        return item; // Return item as-is if merge fails
      }
    });
    
    const itemsWithAssigned = await populateAssignedInfoForItems(itemsWithExpenses);
    
    return {
      ...budgetObj,
      items: itemsWithAssigned
    };
  } catch (error) {
    // Return budget as-is if building fails
    return budget.toObject ? budget.toObject() : budget;
  }
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
