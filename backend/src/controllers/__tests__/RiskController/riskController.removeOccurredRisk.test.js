// src/controllers/__tests__/RiskController/riskController.removeOccurredRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
  updateOccurredRisk: vi.fn(),
  removeOccurredRisk: vi.fn(),
  updateRisk: vi.fn(),
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

describe('riskController.removeOccurredRisk', () => {
  it('[Normal] TC01 - HoOC remove occurred risk successfully', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: { _id: 'r1', occurred_risk: [] },
    });

    RiskService.removeOccurredRisk.mockResolvedValue({
      success: true,
      data: { _id: 'r1' },
    });

    RiskService.updateRisk.mockResolvedValue({ success: true });

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.removeOccurredRisk(req, res);

    expect(RiskService.updateOccurredRisk).toHaveBeenCalledWith(
      'event1',
      'r1',
      'occ1',
      expect.objectContaining({ update_personId: 'mem1' }),
    );
    expect(RiskService.removeOccurredRisk).toHaveBeenCalledWith('event1', 'r1', 'occ1');
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
    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    RiskService.getRiskById.mockResolvedValue({
      success: false,
      message: 'Risk not found',
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.removeOccurredRisk(req, res);

    expect(RiskService.removeOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
