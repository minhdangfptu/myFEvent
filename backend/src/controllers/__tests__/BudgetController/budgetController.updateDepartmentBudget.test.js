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
  const MockBudget = {
    findOne: mockFindOne,
  };
  return {
    __esModule: true,
    default: MockBudget,
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
  normalizeEvidenceArray: vi.fn((e) => e || []),
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

/* -------------------- Tests: updateDepartmentBudget -------------------- */

describe('budgetController.updateDepartmentBudget', () => {
  it('[Abnormal] TC01 - should return 404 when department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep404', budgetId: 'b1' },
      user: { id: 'u1' },
      body: {},
    };
    const res = mockRes();

    await budgetController.updateDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Abnormal] TC02 - should return 404 when budget not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });
    _mockFindOne.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b404' },
      user: { id: 'u1' },
      body: {},
    };
    const res = mockRes();

    await budgetController.updateDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Abnormal] TC03 - should return 400 when budget status is not editable', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const mockBudget = { status: 'approved' };
    _mockFindOne.mockResolvedValue(mockBudget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      user: { id: 'u1' },
      body: { name: 'New name' },
    };
    const res = mockRes();

    await budgetController.updateDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cannot update budget that is not in draft, changes_requested, or submitted status',
    });
  });

  it('[Normal] TC04 - should update name and items when budget is draft', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    const { normalizeEvidenceArray } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const mockSave = vi.fn();
    const mockBudget = {
      status: 'draft',
      items: [],
      save: mockSave,
    };
    _mockFindOne.mockResolvedValue(mockBudget);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1', budgetId: 'b1' },
      user: { id: 'u1' },
      body: {
        name: '  New Budget Name ',
        items: [
          { itemId: 'i1', name: 'Item 1', qty: 2, unitCost: 100, total: 200, status: 'approved', evidence: [] },
        ],
      },
    };
    const res = mockRes();

    await budgetController.updateDepartmentBudget(req, res);

    expect(normalizeEvidenceArray).toHaveBeenCalled();
    expect(mockBudget.name).toBe('New Budget Name');
    expect(Array.isArray(mockBudget.items)).toBe(true);
    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockBudget,
      }),
    );
  });
});


