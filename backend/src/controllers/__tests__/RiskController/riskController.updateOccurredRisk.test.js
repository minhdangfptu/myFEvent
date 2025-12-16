// src/controllers/__tests__/RiskController/riskController.updateOccurredRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskById: vi.fn(),
  updateOccurredRisk: vi.fn(),
  updateRisk: vi.fn(),
}));

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyOccurredRiskUpdated: vi.fn(),
  notifyRiskOccurred: vi.fn(),
  notifyRiskCreated: vi.fn(),
  notifyRiskUpdated: vi.fn(),
  notifyRiskStatusChanged: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.updateOccurredRisk', () => {
  it('[Normal] TC01 - HoOC update occurred risk successfully', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { notifyOccurredRiskUpdated } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'HoOC' });

    RiskService.getRiskById.mockResolvedValue({
      success: true,
      data: { _id: 'r1', risk_status: 'not_yet', scope: 'event', departmentId: null, occurred_risk: [] },
    });

    RiskService.updateOccurredRisk.mockResolvedValue({
      success: true,
      data: { _id: 'r1' },
    });

    RiskService.updateRisk.mockResolvedValue({ success: true });

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
      body: { note: 'updated' },
    };
    const res = mockRes();

    await riskController.updateOccurredRisk(req, res);

    expect(RiskService.updateOccurredRisk).toHaveBeenCalledWith(
      'event1',
      'r1',
      'occ1',
      expect.objectContaining({ update_personId: 'mem1' }),
    );
    expect(notifyOccurredRiskUpdated).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 when occurred risk not found', async () => {
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

    RiskService.updateOccurredRisk.mockResolvedValue({
      success: false,
      message: 'Occurred risk not found',
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
      body: {},
    };
    const res = mockRes();

    await riskController.updateOccurredRisk(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('[Abnormal] TC03 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const RiskService = await import('../../../services/riskService.js');

    const mockErrors = [{ msg: 'Invalid occurredRiskId', param: 'occurredRiskId' }];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors,
    });

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'invalid' },
      user: { id: 'user1' },
      body: { note: 'update' },
    };
    const res = mockRes();

    await riskController.updateOccurredRisk(req, res);

    expect(ensureEventRole).not.toHaveBeenCalled();
    expect(RiskService.getRiskById).not.toHaveBeenCalled();
    expect(RiskService.updateOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: mockErrors,
    });
  });

  it('[Abnormal] TC04 - should return 404 when risk not found', async () => {
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
      body: { note: 'update' },
    };
    const res = mockRes();

    await riskController.updateOccurredRisk(req, res);

    expect(RiskService.updateOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Risk not found',
    });
  });
});
