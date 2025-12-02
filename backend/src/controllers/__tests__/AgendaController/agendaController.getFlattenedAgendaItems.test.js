// src/controllers/__tests__/agendaController.getFlattenedAgendaItems.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  getFlattenedAgendaItemsByMilestoneId: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.getFlattenedAgendaItems', () => {
  it('[Normal] TC01 - should return flattened items successfully with count', async () => {
    const { validationResult } = await import('express-validator');
    const { getFlattenedAgendaItemsByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const items = [
      { _id: 'i1', title: 'Task 1' },
      { _id: 'i2', title: 'Task 2' },
    ];
    getFlattenedAgendaItemsByMilestoneId.mockResolvedValue(items);

    const req = { params: { milestoneId: 'mile1' } };
    const res = mockRes();

    await agendaController.getFlattenedAgendaItems(req, res);

    expect(getFlattenedAgendaItemsByMilestoneId).toHaveBeenCalledWith('mile1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: items,
        count: items.length,
        message: 'Flattened agenda items retrieved successfully',
      }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when validation fails', async () => {
    const { validationResult } = await import('express-validator');
    const { getFlattenedAgendaItemsByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid milestoneId' }],
    });

    const req = { params: { milestoneId: '' } };
    const res = mockRes();

    await agendaController.getFlattenedAgendaItems(req, res);

    expect(getFlattenedAgendaItemsByMilestoneId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 500 when service throws error', async () => {
    const { validationResult } = await import('express-validator');
    const { getFlattenedAgendaItemsByMilestoneId } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    getFlattenedAgendaItemsByMilestoneId.mockRejectedValue(new Error('DB error'));

    const req = { params: { milestoneId: 'mile1' } };
    const res = mockRes();

    await agendaController.getFlattenedAgendaItems(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
