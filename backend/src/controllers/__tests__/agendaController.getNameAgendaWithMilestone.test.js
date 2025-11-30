// src/controllers/__test__/getNameAgendaWithMilestone.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../services/agendaService.js', () => ({
  __esModule: true,
  getNameAgendaWithMilestone: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.getNameAgendaWithMilestone', () => {
  it('[Normal] TC01 - should return agenda names with milestone successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { getNameAgendaWithMilestone } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    const mockResult = [{ milestoneId: 'm1', agendaName: 'Agenda 1' }];
    getNameAgendaWithMilestone.mockResolvedValue(mockResult);

    await agendaController.getNameAgendaWithMilestone(req, res);

    expect(getNameAgendaWithMilestone).toHaveBeenCalledWith('event1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockResult,
        message: 'Agenda retrieved successfully',
      }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const { getNameAgendaWithMilestone } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid eventId' }],
    });

    const req = { params: { eventId: '' } };
    const res = mockRes();

    await agendaController.getNameAgendaWithMilestone(req, res);

    expect(getNameAgendaWithMilestone).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { validationResult } = await import('express-validator');
    const { getNameAgendaWithMilestone } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    getNameAgendaWithMilestone.mockRejectedValue(new Error('DB error'));

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    await agendaController.getNameAgendaWithMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to retrieve agenda',
      }),
    );
  });
});
