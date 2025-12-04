import { describe, it, expect, vi, beforeEach } from 'vitest';

// ====== ExcelJS mock (giống file trên) ======
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

// ====== Mock archiver ======
const archiveAppend = vi.fn();
const archiveFinalize = vi.fn();
const archivePipe = vi.fn();
const archiveOn = vi.fn();

const archiverMock = vi.fn(() => ({
  append: archiveAppend,
  finalize: archiveFinalize,
  pipe: archivePipe,
  on: archiveOn,
}));

vi.mock('archiver', () => ({
  default: archiverMock,
}));

// ====== Service mocks (đơn giản, dữ liệu rỗng) ======
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

// Helper res cho zip (cần cả on)
const mockResZip = () => {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn();
  res.on = vi.fn();
  res.headersSent = false;
  return res;
};

describe('exportController.exportAllItemsZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should create zip with all items', async () => {
    const { exportAllItemsZip } = await import('../../../controllers/exportController.js');

    const req = { params: { eventId: 'evt1' } };
    const res = mockResZip();

    await exportAllItemsZip(req, res);

    expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(archivePipe).toHaveBeenCalledWith(res);

    // 9 loại item: team, members, timeline, agenda, tasks, budget, feedback, risks, incidents
    expect(archiveAppend).toHaveBeenCalledTimes(9);
    expect(archiveFinalize).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/zip',
    );
  });

  it('[Abnormal] TC02 - should return 500 when archiver throws', async () => {
    const { exportAllItemsZip } = await import('../../../controllers/exportController.js');

    archiverMock.mockImplementationOnce(() => {
      throw new Error('archiver error');
    });

    const req = { params: { eventId: 'evt1' } };
    const res = mockResZip();

    await exportAllItemsZip(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Xuất dữ liệu ZIP thất bại' }),
    );
  });
});
