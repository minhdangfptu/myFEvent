// src/controllers/__tests__/RiskController/riskController.deleteRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
  updateRisk: vi.fn(),
  deleteRisk: vi.fn(),
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

describe('riskController.deleteRisk', () => {
  it('[Normal] TC01 - HoOC delete risk successfully', async () => {
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
      data: { _id: 'r1', scope: 'event', departmentId: null },
    });

    RiskService.deleteRisk.mockResolvedValue({
      success: true,
      data: { _id: 'r1' },
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.deleteRisk(req, res);

    expect(RiskService.updateRisk).toHaveBeenCalledWith(
      'event1',
      'r1',
      expect.objectContaining({ updated_personId: 'mem1' }),
    );
    expect(RiskService.deleteRisk).toHaveBeenCalledWith('event1', 'r1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 when getRiskById fails', async () => {
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
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.deleteRisk(req, res);

    expect(RiskService.deleteRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
