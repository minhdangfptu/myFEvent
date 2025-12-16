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

const mockExpenseSave = vi.fn();

vi.mock('../../../models/expense.js', () => {
  const mockFindOne = vi.fn();
  const MockExpense = vi.fn().mockImplementation(() => ({
    save: mockExpenseSave,
  }));
  return {
    __esModule: true,
    default: { findOne: mockFindOne },
    _mockFindOne: mockFindOne,
    _mockCtor: MockExpense,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  // Update mock to be safe against invalid inputs
  toObjectId: vi.fn((v) => {
    try {
      return new mongoose.Types.ObjectId(v);
    } catch {
      return null;
    }
  }),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockExpenseSave.mockReset();
});

describe('expenseController.togglePaidStatus', () => {
  it('[Abnormal] TC01 - should return 404 when budget not found', async () => {
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
    };
    const res = mockRes();

    await expenseController.togglePaidStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC02 - should return 404 when item not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Budget exists but items array is empty or doesn't contain the itemId
    _mockFindOne.mockResolvedValue({ items: [] });

    const req = {
      params: { 
        eventId: mockEventId, 
        departmentId: mockDeptId, 
        budgetId: mockBudgetId, 
        itemId: mockItemId 
      },
    };
    const res = mockRes();

    await expenseController.togglePaidStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Item not found' });
  });

  it('[Abnormal] TC03 - should return 404 when expense not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Budget exists and contains the item
    mockFindBudget.mockResolvedValue({
      items: [{ itemId: new mongoose.Types.ObjectId(mockItemId) }],
    });
    
    // Expense record does not exist
    mockFindExpense.mockResolvedValue(null);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
    };
    const res = mockRes();

    await expenseController.togglePaidStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Expense not found. Please report expense first.' });
  });
  it('[Normal] TC04 - should successfully toggle isPaid status and return 200', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense } = await import('../../../models/expense.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });

    mockFindBudget.mockResolvedValue({
      items: [{ itemId: new mongoose.Types.ObjectId(mockItemId) }],
    });

    const mockExpenseInstance = {
      _id: new mongoose.Types.ObjectId(),
      planId: new mongoose.Types.ObjectId(mockBudgetId),
      itemId: new mongoose.Types.ObjectId(mockItemId),
      isPaid: false,
      save: mockExpenseSave,
    };
    mockFindExpense.mockResolvedValue(mockExpenseInstance);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
    };
    const res = mockRes();

    await expenseController.togglePaidStatus(req, res);

    expect(mockExpenseSave).toHaveBeenCalledTimes(1);
    expect(mockExpenseInstance.isPaid).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: mockExpenseInstance });
  });
});