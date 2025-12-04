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

// --- FIX MOCK EXPENSE HERE ---
vi.mock('../../../models/expense.js', () => {
  const mockFindOne = vi.fn();
  
  // 1. Tạo Mock Constructor (Class giả)
  const MockExpense = vi.fn().mockImplementation(function() {
    // Return object instance khi gọi new EventExpense()
    return {
      save: mockExpenseSave,
      // Cho phép gán property (actualAmount, evidence...) mà không lỗi
    };
  });

  // 2. Gán static method findOne vào Class giả
  MockExpense.findOne = mockFindOne;

  return {
    __esModule: true,
    default: MockExpense, // Export default phải là Class/Function để dùng được 'new'
    _mockFindOne: mockFindOne,
    _mockCtor: MockExpense,
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
  notifyExpenseReported: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  normalizeEvidenceArray: vi.fn((e) => e || []),
  toDecimal128: vi.fn((v) => v),
  decimalToNumber: vi.fn(() => 100),
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

beforeEach(() => {
  vi.clearAllMocks();
  mockExpenseSave.mockReset();
});

describe('expenseController.reportExpense', () => {
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
      body: {},
    };
    const res = mockRes();

    await expenseController.reportExpense(req, res);

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
      body: {},
    };
    const res = mockRes();

    await expenseController.reportExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 400 when budget status is not approved or sent_to_members', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: mockDeptId });
    
    // Simulate budget in draft status
    _mockFindOne.mockResolvedValue({ 
      status: 'draft', 
      items: [] 
    });

    const req = {
      params: { 
        eventId: mockEventId, 
        departmentId: mockDeptId, 
        budgetId: mockBudgetId, 
        itemId: mockItemId 
      },
      user: { id: mockUserId },
      body: {},
    };
    const res = mockRes();

    await expenseController.reportExpense(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget must be approved or sent to members first' });
  });

  it('[Normal] TC04 - should create expense and return 200 when HoD reports expense', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne: mockFindBudget } = await import('../../../models/budgetPlanDep.js');
    const { _mockFindOne: mockFindExpense, _mockCtor } = await import('../../../models/expense.js');

    const leaderId = mockUserId; // User is the leader (HoD)

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({
      _id: mockDeptId,
      leaderId: new mongoose.Types.ObjectId(leaderId),
    });

    mockFindBudget.mockResolvedValue({
      status: 'approved',
      items: [
        { 
          itemId: new mongoose.Types.ObjectId(mockItemId), 
          total: { toString: () => '100' } 
        }
      ],
    });
    
    // Simulate no existing expense record -> Create new one
    mockFindExpense.mockResolvedValue(null);
    mockExpenseSave.mockResolvedValue(undefined);

    const req = {
      params: {
        eventId: mockEventId,
        departmentId: mockDeptId,
        budgetId: mockBudgetId,
        itemId: mockItemId,
      },
      user: { id: leaderId },
      body: {
        actualAmount: 50,
        evidence: [],
        memberNote: 'note',
        isPaid: true,
      },
    };
    const res = mockRes();

    await expenseController.reportExpense(req, res);

    expect(_mockCtor).toHaveBeenCalled();
    expect(mockExpenseSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
      }),
    );
  });
});