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

  it('[Abnormal] TC03 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const RiskService = await import('../../../services/riskService.js');

    const mockErrors = [{ msg: 'riskId is required', param: 'riskId' }];
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => mockErrors,
    });

    const req = {
      params: { eventId: 'event1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.removeOccurredRisk(req, res);

    expect(ensureEventRole).not.toHaveBeenCalled();
    expect(RiskService.getRiskById).not.toHaveBeenCalled();
    expect(RiskService.removeOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errors: mockErrors,
    });
  });

  it('[Abnormal] TC04 - should return 403 when not HoOC or HoD', async () => {
    const { validationResult } = await import('express-validator');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const RiskService = await import('../../../services/riskService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });
    ensureEventRole.mockResolvedValue(null);

    const req = {
      params: { eventId: 'event1', riskId: 'r1', occurredRiskId: 'occ1' },
      user: { id: 'user1' },
    };
    const res = mockRes();

    await riskController.removeOccurredRisk(req, res);

    expect(RiskService.getRiskById).not.toHaveBeenCalled();
    expect(RiskService.removeOccurredRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Chỉ HoOC hoặc HoD được xóa occurred risk',
    });
  });
});
