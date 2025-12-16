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
  const mockSave = vi.fn();
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
    },
    _mockFindOne: mockFindOne,
    _mockSave: mockSave,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  buildBudgetWithExpenses: vi.fn((b) => b),
  loadMembership: vi.fn(),
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

describe('budgetController.updateBudgetVisibility', () => {
  it('[Abnormal] TC01 - should return 400 when isPublic is not boolean', async () => {
    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1' },
      body: { isPublic: 'yes' },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.updateBudgetVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'isPublic must be a boolean' });
  });

  it('[Abnormal] TC02 - should return 403 when user is not HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { loadMembership } = await import('../../../services/expenseService.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });
    loadMembership.mockResolvedValue({ role: 'Member' });

    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1' },
      body: { isPublic: true },
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.updateBudgetVisibility(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('[Normal] TC03 - should update visibility to public when user is HoOC', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    const { loadMembership, buildBudgetWithExpenses } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });
    loadMembership.mockResolvedValue({ role: 'HoOC' });

    const save = vi.fn();
    const budget = { isPublic: false, audit: [], save };
    _mockFindOne.mockResolvedValue(budget);

    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1' },
      body: { isPublic: true },
      user: { id: '65f1f1f1f1f1f1f1f1f1f1f1' },
    };
    const res = mockRes();

    await budgetController.updateBudgetVisibility(req, res);

    expect(save).toHaveBeenCalled();
    expect(buildBudgetWithExpenses).toHaveBeenCalled();
    expect(budget.isPublic).toBe(true);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});


