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
  const mockSave = vi.fn();
  // Mock constructor function logic
  const MockBudget = vi.fn().mockImplementation(() => ({
    save: mockSave,
  }));
  return {
    __esModule: true,
    default: MockBudget,
    _mockSave: mockSave,
    _mockCtor: MockBudget,
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

beforeEach(async () => {
  const { _mockSave } = await import('../../../models/budgetPlanDep.js');
  vi.clearAllMocks();
  _mockSave.mockReset();
});

/* -------------------- Tests: createDepartmentBudget -------------------- */

describe('budgetController.createDepartmentBudget', () => {
  it('[Abnormal] TC01 - should return 400 when items is missing or empty', async () => {
    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      user: { id: 'u1' },
      body: { name: 'Budget 1', items: [] },
    };
    const res = mockRes();

    await budgetController.createDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Items are required and must be a non-empty array',
    });
  });

  it('[Abnormal] TC02 - should return 400 when name is missing', async () => {
    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      user: { id: 'u1' },
      body: {
        items: [{ name: 'Item 1', qty: 1, unitCost: 100 }],
      },
    };
    const res = mockRes();

    await budgetController.createDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tên đơn ngân sách là bắt buộc',
    });
  });

  it('[Abnormal] TC03 - should return 404 when department not found', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue(null);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep404' },
      user: { id: 'u1' },
      body: {
        name: 'Budget 1',
        items: [{ name: 'Item 1', qty: 1, unitCost: 100 }],
      },
    };
    const res = mockRes();

    await budgetController.createDepartmentBudget(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' });
  });

  it('[Normal] TC04 - should create budget successfully with formatted items', async () => {
    const { ensureEventExists, ensureDepartmentInEvent } = await import('../../../services/departmentService.js');
    const { _mockCtor, _mockSave } = await import('../../../models/budgetPlanDep.js');
    const { normalizeEvidenceArray } = await import('../../../services/expenseService.js');

    ensureEventExists.mockResolvedValue(true);
    ensureDepartmentInEvent.mockResolvedValue({ _id: 'dep1' });
    _mockSave.mockResolvedValue(undefined);

    const req = {
      params: { eventId: 'evt1', departmentId: 'dep1' },
      user: { id: 'u1' },
      body: {
        name: '  Budget 1  ',
        status: 'draft',
        items: [
          { name: 'Item 1', qty: 2, unitCost: 100, total: 200, unit: 'cái', note: 'n1', evidence: [] },
        ],
      },
    };
    const res = mockRes();

    await budgetController.createDepartmentBudget(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt1');
    expect(ensureDepartmentInEvent).toHaveBeenCalledWith('evt1', 'dep1');
    expect(normalizeEvidenceArray).toHaveBeenCalled();

    expect(_mockCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: expect.anything(),
        departmentId: expect.anything(),
        status: 'draft',
        name: 'Budget 1',
        items: expect.any(Array),
      }),
    );
    expect(_mockSave).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
      }),
    );
  });

  it('[Abnormal] TC05 - should map Event/Department not found errors to 404', async () => {
    const { ensureEventExists } = await import('../../../services/departmentService.js');

    // Simulate service throwing an error (e.g. Event not found)
    ensureEventExists.mockRejectedValue(new Error('Event not found'));

    const req = {
      params: { eventId: 'evt404', departmentId: 'dep1' },
      user: { id: 'u1' },
      body: {
        name: 'Budget 1',
        items: [{ name: 'Item 1', qty: 1, unitCost: 100 }],
      },
    };
    const res = mockRes();

    await budgetController.createDepartmentBudget(req, res);

    // FIX: Expect 404 instead of 500, as the controller explicitly catches and handles this error
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });
});