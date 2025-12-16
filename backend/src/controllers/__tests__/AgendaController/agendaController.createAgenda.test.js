// src/controllers/__tests__/agendaController.createAgenda.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as agendaController from '../../agendaController.js';

vi.mock('express-validator', () => ({
  validationResult: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  createAgendaDoc: vi.fn(),
}));

vi.mock('../../../models/milestone.js', () => ({
  __esModule: true,
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyAgendaCreated: vi.fn(),
}));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('agendaController.createAgenda', () => {
  it('[Normal] TC01 - should create agenda successfully and send notification', async () => {
    const { validationResult } = await import('express-validator');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');
    const MilestoneModule = await import('../../../models/milestone.js');
    const { notifyAgendaCreated } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1', milestoneId: 'mile1', title: 'Agenda' };
    createAgendaDoc.mockResolvedValue(mockAgenda);

    const mockLean = vi.fn().mockResolvedValue({ _id: 'mile1', eventId: 'event1' });
    const mockSelect = vi.fn().mockReturnValue({ lean: mockLean });
    MilestoneModule.default.findById.mockReturnValue({ select: mockSelect });

    const req = { params: { milestoneId: 'mile1' }, body: { title: 'Agenda' } };
    const res = mockRes();

    await agendaController.createAgenda(req, res);

    expect(createAgendaDoc).toHaveBeenCalledWith(
      expect.objectContaining({ milestoneId: 'mile1', title: 'Agenda' }),
    );
    expect(MilestoneModule.default.findById).toHaveBeenCalledWith('mile1');
    expect(notifyAgendaCreated).toHaveBeenCalledWith('event1', 'ag1', 'mile1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockAgenda,
        message: 'Agenda created successfully',
      }),
    );
  });

  it('[Abnormal] TC02 - should return 400 when milestoneId is missing', async () => {
    const { validationResult } = await import('express-validator');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = { params: {}, body: { title: 'Agenda' } };
    const res = mockRes();

    await agendaController.createAgenda(req, res);

    expect(createAgendaDoc).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'milestoneId is required',
      }),
    );
  });

  it('[Abnormal] TC03 - should return 409 when agenda already exists', async () => {
    const { validationResult } = await import('express-validator');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    createAgendaDoc.mockRejectedValue(new Error('Agenda already exists'));

    const req = { params: { milestoneId: 'mile1' }, body: { title: 'Agenda' } };
    const res = mockRes();

    await agendaController.createAgenda(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Agenda already exists',
      }),
    );
  });

  it('[Abnormal] TC04 - should return 400 on generic create error', async () => {
    const { validationResult } = await import('express-validator');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    createAgendaDoc.mockRejectedValue(new Error('Some validation error'));

    const req = { params: { milestoneId: 'mile1' }, body: { title: 'Agenda' } };
    const res = mockRes();

    await agendaController.createAgenda(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Some validation error',
      }),
    );
  });

  it('[Abnormal] TC05 - should still succeed if notification fails', async () => {
    const { validationResult } = await import('express-validator');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');
    const MilestoneModule = await import('../../../models/milestone.js');
    const { notifyAgendaCreated } = await import('../../../services/notificationService.js');

    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const mockAgenda = { _id: 'ag1', milestoneId: 'mile1', title: 'Agenda' };
    createAgendaDoc.mockResolvedValue(mockAgenda);

    const mockLean = vi.fn().mockResolvedValue({ _id: 'mile1', eventId: 'event1' });
    const mockSelect = vi.fn().mockReturnValue({ lean: mockLean });
    MilestoneModule.default.findById.mockReturnValue({ select: mockSelect });

    notifyAgendaCreated.mockRejectedValue(new Error('Notification error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = { params: { milestoneId: 'mile1' }, body: { title: 'Agenda' } };
    const res = mockRes();

    await agendaController.createAgenda(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
