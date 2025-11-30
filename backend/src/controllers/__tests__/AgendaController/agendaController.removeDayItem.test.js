// src/controllers/__tests__/agendaController.removeDayItem.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  removeItemFromAgenda: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.removeDayItem', () => {
  it('[Abnormal] TC01 - should return 400 when indexes missing', async () => {
    const { validationResult } = await import('express-validator');
    const { removeItemFromAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: { milestoneId: 'mile1' }, body: { dateIndex: 0 } };
    const res = mockRes();

    await agendaController.removeDayItem(req, res);

    expect(removeItemFromAgenda).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Normal] TC02 - should remove item successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { removeItemFromAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1' };
    removeItemFromAgenda.mockResolvedValue(mockAgenda);

    const req = { params: { milestoneId: 'mile1' }, body: { dateIndex: 0, itemIndex: 1 } };
    const res = mockRes();

    await agendaController.removeDayItem(req, res);

    expect(removeItemFromAgenda).toHaveBeenCalledWith('mile1', 0, 1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC03 - should return 404 when service throws "not found"', async () => {
    const { validationResult } = await import('express-validator');
    const { removeItemFromAgenda } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    removeItemFromAgenda.mockRejectedValue(new Error('Item not found'));

    const req = { params: { milestoneId: 'mile1' }, body: { dateIndex: 0, itemIndex: 1 } };
    const res = mockRes();

    await agendaController.removeDayItem(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Item not found',
      }),
    );
  });
});
