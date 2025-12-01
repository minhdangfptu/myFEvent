// src/controllers/__tests__/RiskController/riskController.updateRiskStatusManually.test.js
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
  notifyRiskStatusChanged: vi.fn(),
  notifyRiskCreated: vi.fn(),
  notifyRiskUpdated: vi.fn(),
  notifyRiskOccurred: vi.fn(),
  notifyOccurredRiskUpdated: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.updateRiskStatusManually', () => {
  it('[Normal] TC01 - should return 200 even if status unchanged', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    // getRiskById được gọi nhiều lần, nhưng trả về cùng 1 status
    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: {
        _id: 'r1',
        risk_status: 'not_yet',
        occurred_risk: [],
        scope: 'event',
        departmentId: null,
      },
    });

    RiskService.updateRisk.mockResolvedValue({ success: true });

    const req = {
      params: { eventId: 'event1', riskId: 'r1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.updateRiskStatusManually(req, res);

    expect(RiskService.getRiskById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          statusChange: expect.objectContaining({
            changed: false,
          }),
        }),
      }),
    );
  });

  it('[Abnormal] TC02 - should return 403 when member not HoOC/HoD', async () => {
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
    };
    const res = mockRes();

    await riskController.updateRiskStatusManually(req, res);

    expect(RiskService.getRiskById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
