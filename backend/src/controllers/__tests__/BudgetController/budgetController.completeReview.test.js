import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as budgetController from '../../budgetController.js';

/* -------------------- Mocks -------------------- */

// Mock mongoose to avoid BSON ObjectId errors with test IDs
vi.mock('mongoose', () => {
  const ObjectId = class {
    constructor(value) {
      this.value = String(value);
    }
    toString() {
      return this.value;
    }
  };
  const Decimal128 = {
    fromString: (v) => ({ toString: () => String(v) }),
  };
  const Types = { ObjectId, Decimal128 };
  const Schema = vi.fn().mockImplementation(() => ({
    virtual: vi.fn().mockReturnThis(),
    index: vi.fn().mockReturnThis(),
    pre: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    method: vi.fn().mockReturnThis(),
    statics: vi.fn().mockReturnThis(),
  }));
  Schema.Types = Types;
  return {
    __esModule: true,
    default: { Types, Schema, model: vi.fn(() => ({ findOne: vi.fn().mockResolvedValue(null) })) },
    Types,
    Schema,
  };
});

vi.mock('../../../models/budgetPlanDep.js', () => {
  const mockFindOne = vi.fn();
  const mockSave = vi.fn();
  const MockModel = {
    findOne: mockFindOne,
  };
  return {
    __esModule: true,
    default: MockModel,
    _mockFindOne: mockFindOne,
    _mockSave: mockSave,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyBudgetApproved: vi.fn(),
  notifyBudgetRejected: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(async () => {
  const { _mockSave } = await import('../../../models/budgetPlanDep.js');
  vi.clearAllMocks();
  _mockSave.mockReset();
});

/* -------------------- Tests: completeReview -------------------- */

describe('budgetController.completeReview', () => {
  it('[Abnormal] TC01 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b404' },
      user: { id: 'u1' },
      body: { items: [] },
    };
    const res = mockRes();

    await budgetController.completeReview(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC02 - should return 400 when budget is not submitted', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const mockBudget = { status: 'draft' };
    _mockFindOne.mockResolvedValue(mockBudget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      user: { id: 'u1' },
      body: { items: [] },
    };
    const res = mockRes();

    await budgetController.completeReview(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Only submitted budgets can be reviewed' });
  });

  it('[Normal] TC03 - should set status to approved when all items approved and notifyBudgetApproved called', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne, _mockSave } = await import('../../../models/budgetPlanDep.js');
    // eslint-disable-next-line no-unused-vars
    const { notifyBudgetApproved, notifyBudgetRejected } = await import('../../../services/notificationService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    // FIX: mockSave should return the updated object, NOT undefined
    // This simulates the behavior of mongoose .save() returning the saved document
    const mockSavedReturn = {
      _id: 'b1',
      status: 'approved',
      departmentId: 'dep1',
      items: [
        { itemId: 'i1', status: 'approved' },
        { itemId: 'i2', status: 'approved' },
      ]
    };

    const mockBudget = {
      _id: 'b1',
      departmentId: 'dep1',
      status: 'submitted',
      items: [
        { itemId: 'i1', status: 'pending' },
        { itemId: 'i2', status: 'pending' },
      ],
      audit: [],
      // The save function on the object instance calls the mocked global save
      save: _mockSave.mockResolvedValue(mockSavedReturn),
    };
    
    _mockFindOne.mockResolvedValue(mockBudget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      user: { id: 'u1' },
      body: {
        items: [
          { itemId: 'i1', status: 'approved' },
          { itemId: 'i2', status: 'approved' },
        ],
      },
    };
    const res = mockRes();

    await budgetController.completeReview(req, res);

    // Assertions
    expect(mockBudget.status).toBe('approved'); // Verify the object in memory was updated
    expect(_mockSave).toHaveBeenCalled(); // Verify save was called
    
    // Notification check
    expect(notifyBudgetApproved).toHaveBeenCalledWith('evt1', 'dep1', 'b1');
    
    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'approved'
      })
    }));
  });
});