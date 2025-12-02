// src/controllers/__tests__/RiskController/riskController.getRisks.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRisksByEvent: vi.fn(),
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

describe('riskController.getRisks', () => {
  it('[Normal] TC01 - should return paginated risks', async () => {
    const { validationResult } = await import('express-validator');
    const RiskService = await import('../../../services/riskService.js');
    const ensureEventRole = (await import('../../../utils/ensureEventRole.js')).default;

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    ensureEventRole.mockResolvedValue({ _id: 'mem1', role: 'Member' });

    RiskService.getRisksByEvent.mockResolvedValue({
      success: true,
      data: {
        risks: [{ _id: 'r1' }],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const req = {
      params: { eventId: 'event1' },
      user: { id: 'user1' },
      query: {},
    };
    const res = mockRes();

    await riskController.getRisks(req, res);

    expect(ensureEventRole).toHaveBeenCalledWith('user1', 'event1', ['HoOC', 'HoD', 'Member']);
    expect(RiskService.getRisksByEvent).toHaveBeenCalledWith('event1', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [{ _id: 'r1' }],
      }),
    );
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
      params: { eventId: 'event1' },
      user: { id: 'user1' },
      query: {},
    };
    const res = mockRes();

    await riskController.getRisks(req, res);

    expect(RiskService.getRisksByEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
