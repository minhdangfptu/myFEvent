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
  const mockFind = vi.fn();
  const mockCount = vi.fn();
  const MockModel = {
    find: mockFind,
    countDocuments: mockCount,
  };
  return {
    __esModule: true,
    default: MockModel,
    _mockFind: mockFind,
    _mockCount: mockCount,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  fetchExpensesForBudgets: vi.fn(async () => new Map()),
  loadMembership: vi.fn(),
  getItemKey: vi.fn(),
  mergeItemWithExpense: vi.fn((item) => item),
  decimalToNumber: vi.fn((v) => (typeof v === 'number' ? v : 0)),
  getIdString: vi.fn((v) => (typeof v === 'string' ? v : v?._id?.toString() || v?.toString() || null)),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------- Tests: getAllBudgetsForEvent -------------------- */

describe('budgetController.getAllBudgetsForEvent', () => {
  it('[Abnormal] TC01 - should return 404 when event not found', async () => {
    const { ensureEventExists } = await import('../../../services/departmentService.js');

    ensureEventExists.mockRejectedValue(new Error('Event not found'));

    const req = {
      params: { eventId: 'evt404' },
      query: {},
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getAllBudgetsForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('[Normal] TC02 - HoOC should get all budgets with pagination', async () => {
    const { ensureEventExists } = await import('../../../services/departmentService.js');
    const { _mockFind, _mockCount } = await import('../../../models/budgetPlanDep.js');
    const { loadMembership } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    loadMembership.mockResolvedValue({ role: 'HoOC' });

    const mockLean = vi.fn().mockResolvedValue([
      {
        _id: 'b1',
        name: 'Budget 1',
        status: 'submitted',
        submittedAt: new Date(),
        createdAt: new Date(),
        departmentId: { _id: 'dep1', name: 'Ban 1' },
        createdBy: { fullName: 'User 1' },
      },
    ]);

    _mockFind.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: mockLean,
    });
    _mockCount.mockResolvedValue(1);

    const req = {
      params: { eventId: 'evt1' },
      query: { page: '1', limit: '10' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getAllBudgetsForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      }),
    );
  });
});


