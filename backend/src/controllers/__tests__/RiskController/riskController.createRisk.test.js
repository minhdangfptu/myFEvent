// src/controllers/__tests__/RiskController/riskController.createRisk.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  createRisk: vi.fn(),
}));

vi.mock('../../../utils/ensureEventRole.js', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyRiskCreated: vi.fn(),
  notifyRiskUpdated: vi.fn(),
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

describe('riskController.createRisk', () => {
  it('[Normal] TC01 - HoOC creates risk successfully', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;
    const { notifyRiskCreated } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({
      _id: 'mem1',
      role: 'HoOC',
    });

    RiskService.createRisk.mockResolvedValue({
      success: true,
      data: { _id: 'risk1', scope: 'event', departmentId: null },
    });

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
      body: { scope: 'event', title: 'Risk 1' },
    };
    const res = mockRes();

    await riskController.createRisk(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('user1', 'event1', ['HoOC', 'HoD']);
    expect(RiskService.createRisk).toHaveBeenCalledWith(
      'event1',
      expect.objectContaining({
        scope: 'event',
        updated_personId: 'mem1',
      }),
    );
    expect(notifyRiskCreated).toHaveBeenCalledWith('event1', 'risk1', 'event', undefined);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ _id: 'risk1' }),
      }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid' }],
    });

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
      body: {},
    };
    const res = mockRes();

    await riskController.createRisk(req, res);

    expect(RiskService.createRisk).not.toHaveBeenCalled();
    expect(ensureEventRole).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 403 when member is not HoOC/HoD', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue(null);

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
      body: { scope: 'event' },
    };
    const res = mockRes();

    await riskController.createRisk(req, res);

    expect(RiskService.createRisk).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
