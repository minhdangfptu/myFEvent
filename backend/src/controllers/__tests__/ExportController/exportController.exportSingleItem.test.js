import { describe, it, expect, vi, beforeEach } from 'vitest';

// ====== Common mocks ======

// Mock worksheet cho ExcelJS
const createMockWorksheet = () => ({
  getColumn: vi.fn(() => ({ width: 0 })),
  mergeCells: vi.fn(),
  getCell: vi.fn(() => ({})),
  getRow: vi.fn(() => ({
    height: 0,
    getCell: vi.fn(() => ({})),
  })),
  addRow: vi.fn(),
  columns: [],
});

// Mock Workbook
const mockWorkbookInstance = {
  addWorksheet: vi.fn(() => createMockWorksheet()),
  xlsx: {
    write: vi.fn().mockResolvedValue(),
    writeBuffer: vi.fn().mockResolvedValue(Buffer.from('dummy')),
  },
};

const ExcelJSMock = {
  Workbook: vi.fn(() => mockWorkbookInstance),
};

vi.mock('exceljs', () => ({
  default: ExcelJSMock,
}));

// Mock các service được dùng trong exportController
vi.mock('../../../services/departmentService.js', () => ({
  findDepartmentsByEvent: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('../../../services/eventMemberService.js', () => ({
  countDepartmentMembersIncludingHoOC: vi.fn().mockResolvedValue(0),
  getMemberInformationForExport: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/agendaService.js', () => ({
  getAgendaByEvent: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/riskService.js', () => ({
  getAllOccurredRisksByEvent: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAllRisksByEventWithoutPagination: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock('../../../services/milestoneService.js', () => ({
  listMilestonesByEvent: vi.fn().mockResolvedValue({ items: [] }),
}));

const eventFindOneMock = vi.fn().mockReturnValue({
  lean: vi.fn().mockResolvedValue(null),
});

vi.mock('../../../models/event.js', () => ({
  default: { findOne: eventFindOneMock },
}));

vi.mock('../../../services/taskService.js', () => ({
  getEpicTasksForExport: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/budgetService.js', () => ({
  getBudgetItemsForExport: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/feedbackService.js', () => ({
  getFeedbackFormsForExport: vi.fn().mockResolvedValue({
    eventName: 'Test Event',
    forms: [],
  }),
}));

// Helper tạo res giả
const mockRes = () => {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn();
  res.headersSent = false;
  return res;
};

describe('exportController.exportSingleItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should export team workbook successfully', async () => {
    const { exportSingleItem } = await import('../../../controllers/exportController.js');

    const req = {
      params: { eventId: 'evt1', itemId: 'team' },
      body: { subItems: [] },
    };
    const res = mockRes();

    await exportSingleItem(req, res);

    expect(ExcelJSMock.Workbook).toHaveBeenCalledTimes(1);
    expect(mockWorkbookInstance.xlsx.write).toHaveBeenCalledWith(res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.end).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it('[Abnormal] TC02 - should return 400 when itemId is invalid', async () => {
    const { exportSingleItem } = await import('../../../controllers/exportController.js');

    const req = {
      params: { eventId: 'evt1', itemId: 'unknown' },
      body: { subItems: [] },
    };
    const res = mockRes();

    await exportSingleItem(req, res);

    expect(mockWorkbookInstance.xlsx.write).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Loại dữ liệu không hợp lệ',
    });
  });

  it('[Abnormal] TC03 - should return 500 when internal error occurs', async () => {
    const { exportSingleItem } = await import('../../../controllers/exportController.js');
    const departmentService = await import('../../../services/departmentService.js');

    // Lần gọi đầu tiên findDepartmentsByEvent sẽ throw
    departmentService.findDepartmentsByEvent.findDepartmentsByEvent?.mockRejectedValueOnce?.(
      new Error('DB error'),
    );
    // Nếu ở trên không có (do cách Vitest bundle), fallback:
    if (departmentService.findDepartmentsByEvent.mockRejectedValueOnce) {
      departmentService.findDepartmentsByEvent.mockRejectedValueOnce(new Error('DB error'));
    }

    const req = {
      params: { eventId: 'evt1', itemId: 'team' },
      body: { subItems: [] },
    };
    const res = mockRes();

    await exportSingleItem(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Xuất dữ liệu thất bại' }),
    );
  });
});
