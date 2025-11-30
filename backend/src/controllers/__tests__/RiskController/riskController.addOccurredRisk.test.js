// src/controllers/__tests__/RiskController/riskController.addOccurredRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
  addOccurredRisk: vi.fn(),
  updateRisk: vi.fn(),
}));

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyRiskOccurred: vi.fn(),
  notifyRiskUpdated: vi.fn(),
  notifyRiskCreated: vi.fn(),
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

describe('riskController.addOccurredRisk', () => {
  it('[Normal] TC01 - HoOC add occurred risk successfully', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { notifyRiskOccurred } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: {
        _id: 'r1',
        risk_status: 'not_yet',
        scope: 'department',
        departmentId: 'dept1',
        occurred_risk: [],
      },
    });

    RiskService.addOccurredRisk.mockResolvedValue({
      success: true,
      data: {
        _id: 'r1',
        occurred_risk: [{ _id: 'occ1' }],
      },
    });

    // updateRiskStatusBasedOnOccurred sẽ dùng getRiskById & updateRisk; ở đây để đơn giản:
    RiskService.updateRisk.mockResolvedValue({ success: true });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
      body: { note: 'something happened' },
    };
    const res = mockRes();

    await riskController.addOccurredRisk(req, res);

    expect(RiskService.addOccurredRisk).toHaveBeenCalledWith(
      'event1',
      'r1',
      expect.objectContaining({ update_personId: 'mem1' }),
    );
    expect(notifyRiskOccurred).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('[Abnormal] TC02 - should return 403 when member not allowed', async () => {
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

    await riskController.addOccurredRisk(req, res);

    expect(RiskService.addOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
