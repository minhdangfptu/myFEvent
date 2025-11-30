// src/controllers/__tests__/RiskController/riskController.getRiskCategories.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as riskController from '../../riskController.js';

vi.mock('../../../services/riskService.js', () => ({
  __esModule: true,
  getRiskCategories: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('riskController.getRiskCategories', () => {
  it('[Normal] TC01 - should return risk categories', async () => {
    const RiskService = await import('../../../services/riskService.js');
    RiskService.getRiskCategories.mockReturnValue({
      infrastructure: 'Cơ sở vật chất',
    });

    const req = {};
    const res = mockRes();

    await riskController.getRiskCategories(req, res);

    expect(RiskService.getRiskCategories).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
      }),
    );
  });
});
