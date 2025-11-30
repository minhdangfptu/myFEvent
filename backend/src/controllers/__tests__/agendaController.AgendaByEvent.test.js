// src/controllers/__test__/getAgendaByEvent.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../services/agendaService.js', () => ({
  __esModule: true,
  getAgendaByEvent: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.getAgendaByEvent', () => {
  it('[Normal] TC01 - should return agenda by eventId successfully', async () => {
    const { validationResult } = await import('express-validator');
    const { getAgendaByEvent } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    const mockAgenda = { _id: 'ag1', eventId: 'event1' };
    getAgendaByEvent.mockResolvedValue(mockAgenda);

    await agendaController.getAgendaByEvent(req, res);

    expect(getAgendaByEvent).toHaveBeenCalledWith('event1');
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
    const { getAgendaByEvent } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid eventId', param: 'eventId' }],
    });

    const req = { params: { eventId: '' } };
    const res = mockRes();

    await agendaController.getAgendaByEvent(req, res);

    expect(getAgendaByEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC03 - should return 500 on service error', async () => {
    const { validationResult } = await import('express-validator');
    const { getAgendaByEvent } = await import('../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    getAgendaByEvent.mockRejectedValue(new Error('DB error'));

    const req = { params: { eventId: 'event1' } };
    const res = mockRes();

    await agendaController.getAgendaByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to retrieve agenda',
      }),
    );
  });
});
