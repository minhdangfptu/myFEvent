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
  const mockFind = vi.fn();
  const mockFindItems = vi.fn();
  const mockCount = vi.fn().mockResolvedValue(1);
  return {
    __esModule: true,
    default: {
      find: mockFind,
      countDocuments: mockCount,
    },
    _mockFind: mockFind,
    _mockFindItems: mockFindItems,
    _mockCount: mockCount,
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

describe('budgetController.getAllBudgetsForDepartment', () => {
  it('[Normal] TC01 - should return paginated budgets with totals', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFind } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'd1' });

    const listLean = vi.fn().mockResolvedValue([
      {
        _id: 'b1',
        name: 'Budget 1',
        status: 'submitted',
        departmentId: { _id: 'd1', name: 'Ban 1' },
        createdBy: { fullName: 'User 1' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const itemsLean = vi.fn().mockResolvedValue([
      {
        _id: 'b1',
        items: [{ total: { toString: () => '100' } }],
      },
    ]);

    // First find: list, Second find: items
    _mockFind
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: listLean,
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        lean: itemsLean,
      });

    const req = {
      params: { eventId: 'e1', departmentId: 'd1' },
      query: { page: '1', limit: '10' },
    };
    const res = mockRes();

    await budgetController.getAllBudgetsForDepartment(req, res);

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


