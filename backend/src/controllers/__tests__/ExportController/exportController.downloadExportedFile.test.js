import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockRes = () => {
  const res = {};
  res.setHeader = vi.fn();
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn();
  res.headersSent = false;
  return res;
};

describe('exportController.downloadExportedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[Abnormal] TC01 - should return 404 when file does not exist', async () => {
    const { downloadExportedFile } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockReturnValue(false);

    const req = { params: { filename: 'test.xlsx' } };
    const res = mockRes();

    await downloadExportedFile(req, res);

    expect(fsMock.existsSync).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'File không tồn tại' });
  });

  it('[Normal] TC02 - should stream file when exists', async () => {
    const { downloadExportedFile } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockReturnValue(true);
    fsMock.statSync.mockReturnValue({
      size: 456,
    });

    const fileStream = {
      on: vi.fn(),
      pipe: vi.fn(),
    };
    fsMock.createReadStream.mockReturnValue(fileStream);

    const req = { params: { filename: 'test.xlsx' } };
    const res = mockRes();

    await downloadExportedFile(req, res);

    expect(fsMock.createReadStream).toHaveBeenCalled();
    expect(fileStream.pipe).toHaveBeenCalledWith(res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 456);
  });

  it('[Abnormal] TC03 - should return 500 when unexpected error occurs', async () => {
    const { downloadExportedFile } = await import('../../../controllers/exportController.js');

    fsMock.existsSync.mockImplementation(() => {
      throw new Error('fs broken');
    });

    const req = { params: { filename: 'test.xlsx' } };
    const res = mockRes();

    await downloadExportedFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Không thể download file' }),
    );
  });
});
