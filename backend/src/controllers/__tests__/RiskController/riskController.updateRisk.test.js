// src/controllers/__tests__/RiskController/riskController.updateRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
  updateRisk: vi.fn(),
}));

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyRiskUpdated: vi.fn(),
  notifyRiskCreated: vi.fn(),
  notifyRiskOccurred: vi.fn(),
  notifyOccurredRiskUpdated: vi.fn(),
  notifyRiskStatusChanged: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.updateRisk', () => {
  it('[Normal] TC01 - HoOC updates risk successfully', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { notifyRiskUpdated } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: { _id: 'r1', scope: 'event', departmentId: null, risk_status: 'not_yet' },
    });

    RiskService.updateRisk.mockResolvedValue({
      success: true,
      data: { _id: 'r1', scope: 'event', departmentId: null },
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
      body: { title: 'Updated' },
    };
    const res = mockRes();

    await riskController.updateRisk(req, res);

    expect(RiskService.updateRisk).toHaveBeenCalledWith(
      'event1',
      'r1',
      expect.objectContaining({ updated_personId: 'mem1' }),
    );
    expect(notifyRiskUpdated).toHaveBeenCalledWith('event1', 'r1', 'event', null);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 403 if ensureEventRole returns null', async () => {
    const { validationResult } = await import('express-validator');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const RiskService = await import('../../../services/riskService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue(null);

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
      body: {},
    };
    const res = mockRes();

    await riskController.updateRisk(req, res);

    expect(RiskService.getRiskById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
