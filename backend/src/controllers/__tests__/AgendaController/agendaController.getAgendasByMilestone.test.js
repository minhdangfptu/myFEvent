// src/controllers/__tests__/agendaController.getAgendasByMilestone.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  getAgendaByMilestoneId: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.getAgendasByMilestone', () => {
  it('[Normal] TC01 - should return agenda by milestoneId successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { getAgendaByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: { milestoneId: 'mile1' } };
    const res = mockRes();

    const mockAgenda = { _id: 'ag1', milestoneId: 'mile1' };
    getAgendaByMilestoneId.mockResolvedValue(mockAgenda);

    await agendaController.getAgendasByMilestone(req, res);

    expect(getAgendaByMilestoneId).toHaveBeenCalledWith('mile1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockAgenda,
        message: 'Agenda retrieved successfully',
      }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const { getAgendaByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid milestoneId' }],
    });

    const req = { params: { milestoneId: '' } };
    const res = mockRes();

    await agendaController.getAgendasByMilestone(req, res);

    expect(getAgendaByMilestoneId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed',
      }),
    );
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { validationResult } = await import('express-validator');
    const { getAgendaByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    getAgendaByMilestoneId.mockRejectedValue(new Error('DB error'));

    const req = { params: { milestoneId: 'mile1' } };
    const res = mockRes();

    await agendaController.getAgendasByMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to retrieve agenda',
      }),
    );
  });
});
