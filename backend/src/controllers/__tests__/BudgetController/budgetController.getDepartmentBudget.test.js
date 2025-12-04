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
  const MockModel = {
    findOne: mockFindOne,
  };
  return {
    __esModule: true,
    default: MockModel,
    _mockFindOne: mockFindOne,
  };
});

vi.mock('../../../services/departmentService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  ensureDepartmentInEvent: vi.fn(),
}));

vi.mock('../../../services/expenseService.js', () => ({
  __esModule: true,
  buildBudgetWithExpenses: vi.fn(),
  loadMembership: vi.fn(),
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

/* -------------------- Tests: getDepartmentBudget -------------------- */

describe('budgetController.getDepartmentBudget', () => {
  it('[Abnormal] TC01 - should return 404 when department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);
    _mockFindOne.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep404' },
      query: {},
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getDepartmentBudget(req, res);

    expect(ensureDepartmentInEvent).toHaveBeenCalledWith('evt1', 'dep404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Abnormal] TC02 - should return 404 when no budget found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const chain = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    };
    _mockFindOne.mockReturnValue(chain);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      query: {},
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Budget not found' });
  });

  it('[Normal] TC03 - should return formatted budget when buildBudgetWithExpenses succeeds', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    const { loadMembership, buildBudgetWithExpenses } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const rawBudget = { _id: 'b1', isPublic: true };
    const chain = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(rawBudget),
    };
    _mockFindOne.mockReturnValue(chain);

    loadMembership.mockResolvedValue({ role: 'HoOC' });
    buildBudgetWithExpenses.mockResolvedValue({ id: 'b1', totalCost: 500 });

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      query: {},
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getDepartmentBudget(req, res);

    expect(buildBudgetWithExpenses).toHaveBeenCalledWith(rawBudget);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: { id: 'b1', totalCost: 500 },
    });
  });

  it('[Abnormal] TC04 - should return 200 with warning when buildBudgetWithExpenses throws', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockFindOne } = await import('../../../models/budgetPlanDep.js');
    const { loadMembership, buildBudgetWithExpenses } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });

    const rawBudget = { _id: 'b1', isPublic: true };
    const chain = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(rawBudget),
    };
    _mockFindOne.mockReturnValue(chain);

    loadMembership.mockResolvedValue({ role: 'HoOC' });
    buildBudgetWithExpenses.mockRejectedValue(new Error('Build error'));

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      query: {},
      user: { id: 'u1' },
    };
    const res = mockRes();

    await budgetController.getDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: rawBudget,
        warning: 'Could not load expense data, showing budget only',
      }),
    );
  });
});


