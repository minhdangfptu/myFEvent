import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as budgetController from '../../budgetController.js';

/* -------------------- Mocks -------------------- */

// Mock mongoose to avoid BSON ObjectId errors with test IDs
vi.mock('mongoose', () => {
  class ObjectId {
    constructor(value) {
      this.value = String(value);
    }
    toString() {
      return this.value;
    }
    static isValid(id) {
      // Fix for TC01: Return false for specific invalid test ID
      if (id === 'invalid-id') return false;
      return true;
    }
  }
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
  const mockFindById = vi.fn(); // Fix for TC04: Mock findById
  const mockSave = vi.fn();
  const MockModel = {
    findOne: mockFindOne,
    findById: mockFindById,
  };
  return {
    __esModule: true,
    default: MockModel,
    _mockFindOne: mockFindOne,
    _mockFindById: mockFindById,
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
  notifyBudgetSubmitted: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(async () => {
  const { _mockSave, _mockFindById } = await import('../../../models/budgetPlanDep.js');
  vi.clearAllMocks();
  _mockSave.mockReset();
  if (_mockFindById) _mockFindById.mockReset();
});

/* -------------------- Tests: submitBudget -------------------- */

describe('budgetController.submitBudget', () => {
  it('[Abnormal] TC01 - should return 400 when budgetId is invalid ObjectId', async () => {
    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'invalid-id' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.submitBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid budget ID format' });
  });

  it('[Abnormal] TC02 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: '65f1f1f1f1f1f1f1f1f1f1f1' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.submitBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 400 when budget status is not allowed to submit', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const mockBudget = { status: 'approved' };
    _mockFindOne.mockResolvedValue(mockBudget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: '65f1f1f1f1f1f1f1f1f1f1f1' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.submitBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Only draft, changes_requested, or submitted budgets can be submitted'),
      }),
    );
  });

  it('[Normal] TC04 - should submit budget successfully and call notifyBudgetSubmitted', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne, _mockSave, _mockFindById } = await import('../../../models/budgetPlanDep.js');
    const { notifyBudgetSubmitted } = await import('../../../services/notificationService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const mockBudget = {
      _id: '65f1f1f1f1f1f1f1f1f1f1f1',
      status: 'draft',
      items: [{ name: 'Item', total: { toString: () => '100' } }],
      save: _mockSave.mockResolvedValue(undefined),
      audit: [],
    };
    _mockFindOne.mockResolvedValue(mockBudget);

    // Fix for TC04: Setup the findById -> populate -> lean chain
    const mockLean = vi.fn().mockResolvedValue({
      _id: '65f1f1f1f1f1f1f1f1f1f1f1',
      status: 'submitted',
      departmentId: { name: 'Department 1' },
      items: []
    });
    const mockPopulate = vi.fn().mockReturnValue({ lean: mockLean });
    _mockFindById.mockReturnValue({ populate: mockPopulate });

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: '65f1f1f1f1f1f1f1f1f1f1f1' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.submitBudget(req, res);

    expect(_mockSave).toHaveBeenCalled();
    expect(notifyBudgetSubmitted).toHaveBeenCalledWith('evt1', 'dep1', '65f1f1f1f1f1f1f1f1f1f1f1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        message: 'Budget submitted successfully',
      }),
    );
  });
});