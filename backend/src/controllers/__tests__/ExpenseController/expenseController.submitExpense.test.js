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
  const mockFind = vi.fn();
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
      find: mockFind,
    },
    _mockFindOne: mockFindOne,
    _mockFind: mockFind,
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

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyExpenseSubmitted: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  decimalToNumber: vi.fn((v) => (typeof v === 'number' ? v : 0)),
  // Update mock to be safe like reportExpense test
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

describe('expenseController.submitExpense', () => {
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

    await expenseController.submitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Abnormal] TC02 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
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

    await expenseController.submitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 400 when item is not assigned', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Budget exists but item has no assignedTo
    _mockFindOne.mockResolvedValue({
      status: 'approved',
      items: [
        { itemId: new mongoose.Types.ObjectId(mockItemId) } // Missing assignedTo
      ],
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

    await expenseController.submitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Item is not assigned to anyone' });
  });

  it('[Abnormal] TC04 - should return 404 when expense not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');
    const { getRequesterMembership } = await import('../../../services/eventMemberService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Budget exists, item assigned to user (memberId)
    mockFindBudget.mockResolvedValue({
      status: 'approved',
      items: [
        {
          itemId: new mongoose.Types.ObjectId(mockItemId),
          assignedTo: new mongoose.Types.ObjectId(mockMemberId),
        },
      ],
    });

    // User is the valid member
    getRequesterMembership.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(mockMemberId),
      departmentId: mockDeptId, // Assuming string matching in controller
    });

    // But expense record is missing
    mockFindExpense.mockResolvedValue(null);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: mockUserId }, // Controller converts this to userIdObj
    };
    const res = mockRes();

    await expenseController.submitExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expense not found. Please report expense first.' });
  });
});