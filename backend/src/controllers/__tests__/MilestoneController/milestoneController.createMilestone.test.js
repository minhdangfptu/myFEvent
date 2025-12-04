import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as milestoneController from '../../milestoneController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../../services/milestoneService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  createMilestoneDoc: vi.fn(),
  listMilestonesByEvent: vi.fn(),
  findMilestoneDetail: vi.fn(),
  getEventMembership: vi.fn(),
  updateMilestoneDoc: vi.fn(),
  softDeleteMilestoneIfNoTasks: vi.fn(),
}));

vi.mock('../../../services/agendaService.js', () => ({
  __esModule: true,
  createAgendaDoc: vi.fn(),
}));

vi.mock('../../../services/notificationService.js', () => ({
  __esModule: true,
  notifyAgendaCreated: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

/* -------------------- Tests: createMilestone -------------------- */

describe('milestoneController.createMilestone', () => {
  it('[Abnormal] TC01 - should return 400 when required fields missing', async () => {
    const req = {
      params: { eventId: 'evt1' },
      body: { name: '', targetDate: '' },
    };
    const res = mockRes();

    await milestoneController.createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
  });

  it('[Abnormal] TC02 - should return 404 when event does not exist', async () => {
    const { ensureEventExists } = await import('../../../services/milestoneService.js');

    ensureEventExists.mockResolvedValue(false);

    const req = {
      params: { eventId: 'evt404' },
      body: { name: 'M1', targetDate: '2025-01-01' },
    };
    const res = mockRes();

    await milestoneController.createMilestone(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
  });

  it('[Normal] TC03 - should create milestone and agenda, send notification, return 201', async () => {
    const { ensureEventExists, createMilestoneDoc } = await import('../../../services/milestoneService.js');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');
    const { notifyAgendaCreated } = await import('../../../services/notificationService.js');

    ensureEventExists.mockResolvedValue(true);

    const mockMilestone = { _id: 'm1', name: 'M1' };
    createMilestoneDoc.mockResolvedValue(mockMilestone);

    const mockAgenda = { _id: 'a1', milestoneId: 'm1' };
    createAgendaDoc.mockResolvedValue(mockAgenda);

    const req = {
      params: { eventId: 'evt1' },
      body: { name: 'M1', description: 'D', targetDate: '2025-01-01' },
    };
    const res = mockRes();

    await milestoneController.createMilestone(req, res);

    expect(createMilestoneDoc).toHaveBeenCalledWith({
      eventId: 'evt1',
      name: 'M1',
      description: 'D',
      targetDate: '2025-01-01',
    });
    expect(createAgendaDoc).toHaveBeenCalledWith({
      milestoneId: mockMilestone._id,
    });
    expect(notifyAgendaCreated).toHaveBeenCalledWith('evt1', mockAgenda._id, mockMilestone._id);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      data: mockMilestone,
      agenda: {
        _id: mockAgenda._id,
        milestoneId: mockAgenda.milestoneId,
        created: true,
      },
      message: 'Milestone and agenda created successfully',
    });
  });

  it('[Abnormal] TC04 - should still return 201 when agenda creation fails', async () => {
    const { ensureEventExists, createMilestoneDoc } = await import('../../../services/milestoneService.js');
    const { createAgendaDoc } = await import('../../../services/agendaService.js');
    const { notifyAgendaCreated } = await import('../../../services/notificationService.js');

    ensureEventExists.mockResolvedValue(true);

    const mockMilestone = { _id: 'm1', name: 'M1' };
    createMilestoneDoc.mockResolvedValue(mockMilestone);

    createAgendaDoc.mockRejectedValue(new Error('Agenda error'));

    const req = {
      params: { eventId: 'evt1' },
      body: { name: 'M1', description: 'D', targetDate: '2025-01-01' },
    };
    const res = mockRes();

    await milestoneController.createMilestone(req, res);

    expect(createMilestoneDoc).toHaveBeenCalled();
    expect(createAgendaDoc).toHaveBeenCalled();
    expect(notifyAgendaCreated).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockMilestone,
        agenda: expect.objectContaining({
          created: false,
          error: 'Agenda error',
        }),
        message: 'Milestone created successfully, but agenda creation failed',
      }),
    );
  });

  it('[Abnormal] TC05 - should return 500 when createMilestoneDoc throws', async () => {
    const { ensureEventExists, createMilestoneDoc } = await import('../../../services/milestoneService.js');

    ensureEventExists.mockResolvedValue(true);
    createMilestoneDoc.mockRejectedValue(new Error('DB error'));

    const req = {
      params: { eventId: 'evt1' },
      body: { name: 'M1', targetDate: '2025-01-01' },
    };
    const res = mockRes();

    await milestoneController.createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create milestone' });
  });
});


