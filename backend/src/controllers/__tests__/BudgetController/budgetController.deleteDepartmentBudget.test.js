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
  const mockDeleteOne = vi.fn();
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
      deleteOne: mockDeleteOne,
    },
    _mockFindOne: mockFindOne,
    _mockDeleteOne: mockDeleteOne,
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

describe('budgetController.deleteDepartmentBudget', () => {
  it('[Abnormal] TC01 - should return 404 when department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    const req = {
      params: { eventId: 'e1', departmentId: 'd404', budgetId: 'b1' },
    };
    const res = mockRes();

    await budgetController.deleteDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Abnormal] TC02 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b404' },
    };
    const res = mockRes();

    await budgetController.deleteDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 400 when budget is submitted/approved/sent_to_members/locked', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });

    const statuses = ['submitted', 'approved', 'sent_to_members', 'locked'];

    for (const status of statuses) {
      const req = {
        params: { eventId: 'e1', departmentId: 'd1', budgetId: `b-${status}` },
      };
      const res = mockRes();
      _mockFindOne.mockResolvedValueOnce({ status });

      await budgetController.deleteDepartmentBudget(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  it('[Normal] TC04 - should delete draft budget successfully', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne, _mockDeleteOne } = await import('../../../models/budgetPlanDep.js');
    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });

    _mockFindOne.mockResolvedValue({ _id: 'b1', status: 'draft' });
    _mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1' },
    };
    const res = mockRes();

    await budgetController.deleteDepartmentBudget(req, res);

    expect(_mockDeleteOne).toHaveBeenCalledWith({ _id: 'b1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget deleted successfully' });
  });
});


