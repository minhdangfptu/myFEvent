// src/controllers/__tests__/RiskController/riskController.getAllOccurredRisksByEventController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getAllOccurredRisksByEvent: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.getAllOccurredRisksByEventController', () => {
  it('[Normal] TC01 - should return 200 with occurred risks', async () => {
    const RiskService = await import('../../../services/riskService.js');
    RiskService.getAllOccurredRisksByEvent.mockResolvedValue({
      success: true,
      data: [{ id: 'occ1' }],
    });

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    await riskController.getAllOccurredRisksByEventController(req, res);

    expect(RiskService.getAllOccurredRisksByEvent).toHaveBeenCalledWith('event1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when service returns !success', async () => {
    const RiskService = await import('../../../services/riskService.js');
    RiskService.getAllOccurredRisksByEvent.mockResolvedValue({
      success: false,
      message: 'Something wrong',
    });

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    await riskController.getAllOccurredRisksByEventController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 500 on exception', async () => {
    const RiskService = await import('../../../services/riskService.js');
    RiskService.getAllOccurredRisksByEvent.mockRejectedValue(new Error('DB error'));

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    await riskController.getAllOccurredRisksByEventController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Server error' }),
    );
  });
});
