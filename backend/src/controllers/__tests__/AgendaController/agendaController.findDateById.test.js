// src/controllers/__tests__/agendaController.findDateById.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  findDateById: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.findDateById', () => {
  it('[Normal] TC01 - should find date successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { findDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockDateInfo = { _id: 'd1', date: '2025-01-01' };
    findDateById.mockResolvedValue(mockDateInfo);

    const req = { params: { milestoneId: 'mile1', dateId: 'd1' } };
    const res = mockRes();

    await agendaController.findDateById(req, res);

    expect(findDateById).toHaveBeenCalledWith('mile1', 'd1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockDateInfo,
        message: 'Date found successfully',
      }),
    );
  });

  it('[Abnormal] TC02 - should return 404 when date not found', async () => {
    const { validationResult } = await import('express-validator');
    const { findDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    findDateById.mockResolvedValue(null);

    const req = { params: { milestoneId: 'mile1', dateId: 'dNotFound' } };
    const res = mockRes();

    await agendaController.findDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Date not found',
      }),
    );
  });

  it('[Abnormal] TC03 - should return 500 on service error', async () => {
    const { validationResult } = await import('express-validator');
    const { findDateById } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    findDateById.mockRejectedValue(new Error('DB error'));

    const req = { params: { milestoneId: 'mile1', dateId: 'd1' } };
    const res = mockRes();

    await agendaController.findDateById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to find date',
      }),
    );
  });
});
