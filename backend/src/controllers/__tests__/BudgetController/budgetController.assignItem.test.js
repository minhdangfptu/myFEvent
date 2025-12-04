import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
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

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyItemAssigned: vi.fn(),
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

describe('budgetController.assignItem', () => {
  it('[Abnormal] TC01 - should return 401 when user is not authenticated', async () => {
    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1', itemId: 'i1' },
      user: null,
      body: {},
    };
    const res = mockRes();

    await budgetController.assignItem(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
  });

  it('[Abnormal] TC02 - should return 404 when item not found in budget', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1', leaderId: new mongoose.Types.ObjectId('65f1f1f1f1f1f1f1f1f1f1f1') });

    const budget = {
      status: 'approved',
      items: [{ itemId: new mongoose.Types.ObjectId('65f2f2f2f2f2f2f2f2f2f2f2'), name: 'Other' }],
    };
    _mockFindOne.mockResolvedValue(budget);

    const req = {
      params: { eventId: 'e1', departmentId: 'd1', budgetId: 'b1', itemId: '65f3f3f3f3f3f3f3f3f3f3f3' },
      user: { id: '65f1f1f1f1f1f1f1f1f1f1f1' },
      body: { memberId: null },
    };
    const res = mockRes();

    await budgetController.assignItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Item not found in budget',
      }),
    );
  });
});


