import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs cho các hàm dùng trong listExportedFiles
const fsMock = {
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  createReadStream: vi.fn(),
  unlinkSync: vi.fn(),
};

vi.mock('fs', () => ({
  default: fsMock,
}));

// Không cần mock exceljs/archiver vì hàm listExportedFiles không gọi tới

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('exportController.listExportedFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should return empty list when exports dir does not exist', async () => {
    const { listExportedFiles } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockReturnValue(false);

    const req = {};
    const res = mockRes();

    await listExportedFiles(req, res);

    expect(fsMock.existsSync).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ files: [] });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('[Normal] TC02 - should list only .xlsx files with metadata', async () => {
    const { listExportedFiles } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockReturnValue(['a.xlsx', 'b.txt', 'c.xlsx']);

    const now = new Date();
    // eslint-disable-next-line no-unused-vars
    fsMock.statSync.mockImplementation((filePath) => ({
      size: 123,
      birthtime: now,
      mtime: now,
    }));

    const req = {};
    const res = mockRes();

    await listExportedFiles(req, res);

    expect(fsMock.readdirSync).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];

    expect(Array.isArray(payload.files)).toBe(true);
    expect(payload.files.length).toBe(2);
    expect(payload.files.every((f) => f.filename.endsWith('.xlsx'))).toBe(true);
  });

  it('[Abnormal] TC03 - should return 500 when fs throws', async () => {
    const { listExportedFiles } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockImplementation(() => {
      throw new Error('fs error');
    });

    const req = {};
    const res = mockRes();

    await listExportedFiles(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Không thể list files' }),
    );
  });
});
