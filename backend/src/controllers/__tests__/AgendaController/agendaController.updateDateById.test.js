// src/controllers/__tests__/agendaController.updateDateById.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  updateDateInAgendaById: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.updateDateById', () => {
  it('[Normal] TC01 - should update date successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { updateDateInAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1', dates: [{ _id: 'd1', date: '2025-01-02' }] };
    updateDateInAgendaById.mockResolvedValue(mockAgenda);

    const req = {
      params: { milestoneId: 'mile1', dateId: 'd1' },
      body: { date: '2025-01-02' },
    };
    const res = mockRes();

    await agendaController.updateDateById(req, res);

    expect(updateDateInAgendaById).toHaveBeenCalledWith('mile1', 'd1', { date: '2025-01-02' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 404 when date not found', async () => {
    const { validationResult } = await import('express-validator');
    const { updateDateInAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    updateDateInAgendaById.mockResolvedValue(null);

    const req = {
      params: { milestoneId: 'mile1', dateId: 'dNotFound' },
      body: { date: '2025-01-02' },
    };
    const res = mockRes();

    await agendaController.updateDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Date not found',
      }),
    );
  });

  it('[Abnormal] TC03 - should return 400 on service error with error message', async () => {
    const { validationResult } = await import('express-validator');
    const { updateDateInAgendaById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    updateDateInAgendaById.mockRejectedValue(new Error('Invalid date'));

    const req = {
      params: { milestoneId: 'mile1', dateId: 'd1' },
      body: { date: '2025-01-02' },
    };
    const res = mockRes();

    await agendaController.updateDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid date',
      }),
    );
  });
});
