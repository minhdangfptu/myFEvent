import { describe, it, expect, vi, beforeEach } from 'vitest';

// ExcelJS mock
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

// Archiver mock
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

// Service mocks
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

describe('exportController.exportSelectedItemsZip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Abnormal] TC01 - should return 400 when no itemIds provided', async () => {
    const { exportSelectedItemsZip } = await import('../../../controllers/exportController.js');

    const req = { params: { eventId: 'evt1' }, body: {} };
    const res = mockResZip();

    await exportSelectedItemsZip(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Vui lòng chọn ít nhất một mục để xuất',
    });
    expect(archiverMock).not.toHaveBeenCalled();
  });

  it('[Abnormal] TC02 - should return 400 when all itemIds are invalid', async () => {
    const { exportSelectedItemsZip } = await import('../../../controllers/exportController.js');

    const req = { params: { eventId: 'evt1' }, body: { itemIds: ['unknown'] } };
    const res = mockResZip();

    await exportSelectedItemsZip(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Không có mục hợp lệ để xuất',
    });
    expect(archiverMock).not.toHaveBeenCalled();
  });

  it('[Normal] TC03 - should create zip with selected items', async () => {
    const { exportSelectedItemsZip } = await import('../../../controllers/exportController.js');

    const req = {
      params: { eventId: 'evt1' },
      body: { itemIds: ['team', 'members'] },
    };
    const res = mockResZip();

    await exportSelectedItemsZip(req, res);

    expect(archiverMock).toHaveBeenCalled();
    expect(archivePipe).toHaveBeenCalledWith(res);
    // 2 item hợp lệ: team, members
    expect(archiveAppend).toHaveBeenCalledTimes(2);
    expect(archiveFinalize).toHaveBeenCalled();
  });
});
