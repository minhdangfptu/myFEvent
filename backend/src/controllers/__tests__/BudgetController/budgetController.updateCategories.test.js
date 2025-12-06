import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as budgetController from '../../budgetController.js';

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
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
    },
    _mockFindOne: mockFindOne,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('budgetController.updateCategories', () => {
  it('[Abnormal] TC01 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b404' },
      body: { categories: ['A', 'B'] },
    };
    const res = mockRes();

    await budgetController.updateCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC02 - should return 400 when budget status is locked', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const save = vi.fn();
    const budget = { status: 'locked', save };
    _mockFindOne.mockResolvedValue(budget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      body: { categories: ['A', 'B'] },
    };
    const res = mockRes();

    await budgetController.updateCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Cannot update categories for locked budgets' });
    expect(save).not.toHaveBeenCalled();
  });

  it('[Normal] TC03 - should update categories when budget is editable', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const save = vi.fn();
    const budget = { status: 'draft', categories: [], save };
    _mockFindOne.mockResolvedValue(budget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      body: { categories: ['  A  ', '', 'B', null] },
    };
    const res = mockRes();

    await budgetController.updateCategories(req, res);

    // Controller only filters falsy/empty, does not trim whitespace
    expect(budget.categories).toEqual(['  A  ', 'B']);
    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: budget,
      }),
    );
  });
});


