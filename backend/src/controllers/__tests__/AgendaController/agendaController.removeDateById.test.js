// src/controllers/__tests__/agendaController.removeDateById.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  removeDateFromAgendaById: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.removeDateById', () => {
  it('[Normal] TC01 - should remove date successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { removeDateFromAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1', dates: [] };
    removeDateFromAgendaById.mockResolvedValue(mockAgenda);

    const req = { params: { milestoneId: 'mile1', dateId: 'd1' } };
    const res = mockRes();

    await agendaController.removeDateById(req, res);

    expect(removeDateFromAgendaById).toHaveBeenCalledWith('mile1', 'd1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 when agenda not found (null)', async () => {
    const { validationResult } = await import('express-validator');
    const { removeDateFromAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    removeDateFromAgendaById.mockResolvedValue(null);

    const req = { params: { milestoneId: 'mile1', dateId: 'dNotFound' } };
    const res = mockRes();

    await agendaController.removeDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Date not found',
      }),
    );
  });

  it('[Abnormal] TC03 - should return 404 when service throws not found error', async () => {
    const { validationResult } = await import('express-validator');
    const { removeDateFromAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    removeDateFromAgendaById.mockRejectedValue(new Error('Date not found'));

    const req = { params: { milestoneId: 'mile1', dateId: 'd1' } };
    const res = mockRes();

    await agendaController.removeDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Date not found',
      }),
    );
  });
});
