import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventMemberController from '../eventMemberController.js';

/* -------------------- Mocks -------------------- */

vi.mock('../../services/eventMemberService.js', () => ({
  __esModule: true,
  ensureEventExists: vi.fn(),
  getMemberInformationForExport: vi.fn(),
}));

/* -------------------- Helpers -------------------- */

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

/* -------------------- Tests -------------------- */

describe('eventMemberController.getEventMemberForExport', () => {
  it('[Normal] TC01 - should get event members for export successfully', async () => {
    const { ensureEventExists, getMemberInformationForExport } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    const mockExportData = [
      {
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'HoD',
        departmentName: 'Marketing',
        phone: '123456789'
      },
      {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        role: 'Member',
        departmentName: 'Marketing',
        phone: '987654321'
      }
    ];

    ensureEventExists.mockResolvedValue(true);
    getMemberInformationForExport.mockResolvedValue(mockExportData);

    await eventMemberController.getEventMemberForExport(req, res);

    expect(ensureEventExists).toHaveBeenCalledWith('evt123');
    expect(getMemberInformationForExport).toHaveBeenCalledWith('evt123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: mockExportData
      })
    );
  });

  it('[Abnormal] TC02 - should return 500 on database error', async () => {
    const { ensureEventExists } = await import('../../services/eventMemberService.js');

    const req = {
      params: { eventId: 'evt123' }
    };
    const res = mockRes();

    ensureEventExists.mockRejectedValue(new Error('DB error'));

    await eventMemberController.getEventMemberForExport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load core team members' })
    );
  });
});
