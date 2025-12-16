// src/controllers/__tests__/ExportController/exportController.cleanupOldFiles.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readdirSync = vi.fn();
  const statSync = vi.fn();
  const unlinkSync = vi.fn();

  return {
    default: {
      existsSync,
      readdirSync,
      statSync,
      unlinkSync,
    },
    existsSync,
    readdirSync,
    statSync,
    unlinkSync,
  };
});

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const getFsMock = async () => {
  const fsModule = await import('fs');
  return fsModule.default;
};

describe('exportController.cleanupOldFiles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-02T12:00:00Z')); // thời gian cố định
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('[Normal] TC01 – should return deleted = 0 when export folder does not exist', async () => {
    const fsMock = await getFsMock();
    fsMock.existsSync.mockReturnValue(false);

    const { cleanupOldFiles } = await import('../../exportController.js');

    const req = {};
    const res = mockRes();

    await cleanupOldFiles(req, res);

    expect(fsMock.existsSync).toHaveBeenCalledTimes(1);
    expect(fsMock.readdirSync).not.toHaveBeenCalled();
    expect(fsMock.unlinkSync).not.toHaveBeenCalled();

    expect(res.status).not.toHaveBeenCalled(); // mặc định 200
    expect(res.json).toHaveBeenCalledWith({
      message: 'No exports directory found',
      deleted: 0,
    });
  });

  it('[Normal] TC02 – should delete the correct number of files older than 24h', async () => {
    const fsMock = await getFsMock();

    // Có thư mục
    fsMock.existsSync.mockReturnValue(true);
    // Có 2 file: 1 cũ hơn 24h, 1 mới
    fsMock.readdirSync.mockReturnValue(['old.xlsx', 'new.xlsx']);

    const now = Date.now();
    fsMock.statSync.mockImplementation((filePath) => {
      if (filePath.includes('old.xlsx')) {
        return { mtime: new Date(now - 2 * 24 * 60 * 60 * 1000) }; // 2 ngày trước
      }
      return { mtime: new Date(now - 60 * 60 * 1000) }; // 1 giờ trước
    });

    fsMock.unlinkSync.mockImplementation(() => {});

    const { cleanupOldFiles } = await import('../../exportController.js');

    const req = {};
    const res = mockRes();

    await cleanupOldFiles(req, res);

    // chỉ file old.xlsx bị xóa
    expect(fsMock.unlinkSync).toHaveBeenCalledTimes(1);
    expect(fsMock.unlinkSync.mock.calls[0][0]).toContain('old.xlsx');

    expect(res.status).not.toHaveBeenCalled(); // 200 OK
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cleaned up 1 old files',
      deleted: 1,
    });
  });

  it('[Normal] TC03 – should return 500 with message "Cleanup failed" when file system error occurs', async () => {
    const fsMock = await getFsMock();

    fsMock.existsSync.mockReturnValue(true);
    fsMock.readdirSync.mockImplementation(() => {
      throw new Error('FS error');
    });

    const { cleanupOldFiles } = await import('../../exportController.js');

    const req = {};
    const res = mockRes();

    await cleanupOldFiles(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Cleanup failed',
    });
  });
});
