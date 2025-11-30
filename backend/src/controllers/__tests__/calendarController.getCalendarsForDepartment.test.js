import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCalendarsForDepartment } from '../calendarController.js';

/* -------------------- Mocks -------------------- */
vi.mock('../../services/departmentService.js', () => ({
  __esModule: true,
  findDepartmentById: vi.fn(),
}));

vi.mock('../../services/calendarService.js', () => ({
  __esModule: true,
  getCalendarByDepartmentId: vi.fn(),
}));
vi.mock('../../services/cloudinaryService.js', () => ({
  __esModule: true,
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
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

describe('calendarController.getCalendarsForDepartment', () => {
  it('[Normal] TC01 - should return calendars of department', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');
    const { getCalendarByDepartmentId } = await import('../../services/calendarService.js');

    findDepartmentById.mockResolvedValue({ id: 'd1', name: 'Dept 1' });
    getCalendarByDepartmentId.mockResolvedValue([{ id: 'c1' }]);

    const req = { params: { departmentId: 'd1' } };
    const res = mockRes();

    await getCalendarsForDepartment(req, res);

    expect(findDepartmentById).toHaveBeenCalledWith('d1');
    expect(getCalendarByDepartmentId).toHaveBeenCalledWith('d1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: 'c1' }],
    });
  });

  it('[Abnormal] TC02 - should return 404 if department not found', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');

    findDepartmentById.mockResolvedValue(null);

    const req = { params: { departmentId: 'd404' } };
    const res = mockRes();

    await getCalendarsForDepartment(req, res);

    expect(findDepartmentById).toHaveBeenCalledWith('d404');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Department not found' })
    );
  });

  it('[Abnormal] TC03 - should return 500 on unexpected error', async () => {
    const { findDepartmentById } = await import('../../services/departmentService.js');

    findDepartmentById.mockRejectedValue(new Error('DB fail'));

    const req = { params: { departmentId: 'd1' } };
    const res = mockRes();

    await getCalendarsForDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to load calendar' })
    );
  });
});