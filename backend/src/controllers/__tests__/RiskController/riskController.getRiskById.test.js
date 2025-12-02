// src/controllers/__tests__/RiskController/riskController.getRiskById.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
}));

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.getRiskById', () => {
  it('[Normal] TC01 - should return single risk data', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'Member' });

    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: { _id: 'r1' },
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.getRiskById(req, res);

    expect(RiskService.getRiskById).toHaveBeenCalledWith('event1', 'r1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 when risk not found', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'Member' });

    RiskService.getRiskById.mockResolvedValue({
      success: false,
      message: 'Risk not found',
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.getRiskById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
