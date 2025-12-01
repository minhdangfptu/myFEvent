// src/controllers/__tests__/RiskController/riskController.getRiskCategoryStatistics.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskStatistics: vi.fn(),
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

describe('riskController.getRiskCategoryStatistics', () => {
  it('[Normal] TC01 - should return statistics data', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'Member' });

    RiskService.getRiskStatistics.mockResolvedValue({
      success: true,
      data: [{ category: 'infrastructure', count: 3 }],
    });

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.getRiskCategoryStatistics(req, res);

    expect(RiskService.getRiskStatistics).toHaveBeenCalledWith('event1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 403 when not allowed', async () => {
    const { validationResult } = await import('express-validator');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const RiskService = await import('../../../services/riskService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue(null);

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.getRiskCategoryStatistics(req, res);

    expect(RiskService.getRiskStatistics).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
