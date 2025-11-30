// src/controllers/__tests__/agendaController.addItemToDateById.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  addItemToAgendaDateById: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.addItemToDateById', () => {
  it('[Normal] TC01 - should add item to date successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { addItemToAgendaDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1' };
    addItemToAgendaDateById.mockResolvedValue(mockAgenda);

    const req = {
      params: { milestoneId: 'mile1', dateId: 'd1' },
      body: { title: 'New item', time: '09:00' },
    };
    const res = mockRes();

    await agendaController.addItemToDateById(req, res);

    expect(addItemToAgendaDateById).toHaveBeenCalledWith('mile1', 'd1', {
      title: 'New item',
      time: '09:00',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const { addItemToAgendaDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid item' }],
    });

    const req = { params: { milestoneId: 'mile1', dateId: 'd1' }, body: {} };
    const res = mockRes();

    await agendaController.addItemToDateById(req, res);

    expect(addItemToAgendaDateById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 400 on service error', async () => {
    const { validationResult } = await import('express-validator');
    const { addItemToAgendaDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    addItemToAgendaDateById.mockRejectedValue(new Error('Add failed'));

    const req = {
      params: { milestoneId: 'mile1', dateId: 'd1' },
      body: { title: 'Item' },
    };
    const res = mockRes();

    await agendaController.addItemToDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Add failed',
      }),
    );
  });
});
