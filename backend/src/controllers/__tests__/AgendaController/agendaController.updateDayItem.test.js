// src/controllers/__tests__/agendaController.updateDayItem.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  updateItemInAgenda: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.updateDayItem', () => {
  it('[Abnormal] TC01 - should return 400 when indexes are missing', async () => {
    const { validationResult } = await import('express-validator');
    const { updateItemInAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: { milestoneId: 'mile1' }, body: { itemIndex: 1, updates: {} } };
    const res = mockRes();

    await agendaController.updateDayItem(req, res);

    expect(updateItemInAgenda).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'dateIndex and itemIndex are required',
      }),
    );
  });

  it('[Normal] TC02 - should update item successfully by indexes', async () => {
    const { validationResult } = await import('express-validator');
    const { updateItemInAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1' };
    updateItemInAgenda.mockResolvedValue(mockAgenda);

    const req = {
      params: { milestoneId: 'mile1' },
      body: { dateIndex: 0, itemIndex: 1, updates: { title: 'Updated' } },
    };
    const res = mockRes();

    await agendaController.updateDayItem(req, res);

    expect(updateItemInAgenda).toHaveBeenCalledWith('mile1', 0, 1, { title: 'Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 404 when service throws "not found"', async () => {
    const { validationResult } = await import('express-validator');
    const { updateItemInAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    updateItemInAgenda.mockRejectedValue(new Error('Item not found'));

    const req = {
      params: { milestoneId: 'mile1' },
      body: { dateIndex: 0, itemIndex: 1, updates: { title: 'Updated' } },
    };
    const res = mockRes();

    await agendaController.updateDayItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Item not found',
      }),
    );
  });
});
