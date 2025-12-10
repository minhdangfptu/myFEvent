import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import * as expenseController from '../../expenseController.js';

// --- MOCK SETUP ---
vi.mock('../../../models/budgetPlanDep.js', () => {
  const mockFindOne = vi.fn();
  return {
    __esModule: true,
    default: { findOne: mockFindOne },
    _mockFindOne: mockFindOne,
  };
});

vi.mock('../../../models/expense.js', () => {
  const mockFindOne = vi.fn();
  return {
    __esModule: true,
    default: { findOne: mockFindOne },
    _mockFindOne: mockFindOne,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../../services/eventMemberService.js', () => ({
  __esModule: true,
  getRequesterMembership: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  // Update mock to be safe
  toObjectId: vi.fn((v) => {
    try {
      return new mongoose.Types.ObjectId(v);
    } catch {
      return null;
    }
  }),
  getItemKey: vi.fn((v) => (v && v.toString ? v.toString() : String(v))),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

// --- VALID IDs FOR TESTING ---
const mockEventId = new mongoose.Types.ObjectId().toString();
const mockDeptId = new mongoose.Types.ObjectId().toString();
const mockBudgetId = new mongoose.Types.ObjectId().toString();
const mockItemId = new mongoose.Types.ObjectId().toString();
const mockUserId = new mongoose.Types.ObjectId().toString();
const mockMemberId = new mongoose.Types.ObjectId().toString();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('expenseController.undoSubmitExpense', () => {
  it('[Abnormal] TC01 - should return 404 when department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    const req = {
      params: { 
        eventId: mockEventId, 
        departmentId: mockDeptId, 
        budgetId: mockBudgetId, 
        itemId: mockItemId 
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Abnormal] TC02 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Simulate budget not found
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { 
        eventId: mockEventId, 
        departmentId: mockDeptId, 
        budgetId: mockBudgetId, 
        itemId: mockItemId 
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 404 when expense not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');
    const { getRequesterMembership } = await import('../../../services/eventMemberService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Budget exists
    mockFindBudget.mockResolvedValue({
      items: [{ itemId: new mongoose.Types.ObjectId(mockItemId) }],
    });

    // Valid member (Required to pass the authentication check in controller)
    getRequesterMembership.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(mockMemberId),
      departmentId: mockDeptId,
    });

    // Simulate Expense not found
    mockFindExpense.mockResolvedValue(null);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expense not found' });
  });
  it('[Abnormal] TC04 - should return 400 when expense is not in submitted status', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../../services/eventMemberService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });

    mockFindBudget.mockResolvedValue({
      items: [{ itemId: new mongoose.Types.ObjectId(mockItemId) }],
    });

    getRequesterMembership.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(mockMemberId),
      departmentId: mockDeptId,
    });

    // Expense exists but status is already 'draft' (or anything other than 'submitted')
    mockFindExpense.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      submittedStatus: 'draft',
    });

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expense is not submitted' });
  });

  it('[Abnormal] TC05 - should return 403 when user is not assigned to the item', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../../services/eventMemberService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });

    // Item is assigned to someone else
    const otherMemberId = new mongoose.Types.ObjectId();
    mockFindBudget.mockResolvedValue({
      items: [
        { 
          itemId: new mongoose.Types.ObjectId(mockItemId),
          assignedTo: otherMemberId 
        }
      ],
    });

    // Current user member
    getRequesterMembership.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(mockMemberId), // Different from otherMemberId
      departmentId: mockDeptId,
    });

    mockFindExpense.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      submittedStatus: 'submitted',
    });

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'You are not assigned to this item' });
  });

  it('[Normal] TC06 - should successfully undo submit status and return 200', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { getRequesterMembership } = await import('../../../services/eventMemberService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });

    // Item assigned to the current user
    mockFindBudget.mockResolvedValue({
      items: [
        { 
          itemId: new mongoose.Types.ObjectId(mockItemId),
          assignedTo: new mongoose.Types.ObjectId(mockMemberId) 
        }
      ],
    });

    getRequesterMembership.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(mockMemberId),
      departmentId: mockDeptId,
    });

    const mockSave = vi.fn();
    const mockExpenseInstance = {
      _id: new mongoose.Types.ObjectId(),
      submittedStatus: 'submitted',
      save: mockSave,
    };
    mockFindExpense.mockResolvedValue(mockExpenseInstance);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: mockUserId },
    };
    const res = mockRes();

    await expenseController.undoSubmitExpense(req, res);

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockExpenseInstance.submittedStatus).toBe('draft');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockExpenseInstance });
  });
});