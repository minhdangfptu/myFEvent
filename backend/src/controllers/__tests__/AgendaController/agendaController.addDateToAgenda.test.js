// src/controllers/__tests__/agendaController.addDateToAgenda.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  addDateToAgenda: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.addDateToAgenda', () => {
  it('[Normal] TC01 - should add date successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { addDateToAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1', dates: [{ date: '2025-01-01' }] };
    addDateToAgenda.mockResolvedValue(mockAgenda);

    const req = { params: { milestoneId: 'mile1' }, body: { date: '2025-01-01' } };
    const res = mockRes();

    await agendaController.addDateToAgenda(req, res);

    expect(addDateToAgenda).toHaveBeenCalledWith('mile1', '2025-01-01');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const { addDateToAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid date' }],
    });

    const req = { params: { milestoneId: 'mile1' }, body: { date: 'bad' } };
    const res = mockRes();

    await agendaController.addDateToAgenda(req, res);

    expect(addDateToAgenda).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 400 on service error with message from error', async () => {
    const { validationResult } = await import('express-validator');
    const { addDateToAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    addDateToAgenda.mockRejectedValue(new Error('Bad date'));

    const req = { params: { milestoneId: 'mile1' }, body: { date: '2025-01-01' } };
    const res = mockRes();

    await agendaController.addDateToAgenda(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Bad date',
      }),
    );
  });
});
