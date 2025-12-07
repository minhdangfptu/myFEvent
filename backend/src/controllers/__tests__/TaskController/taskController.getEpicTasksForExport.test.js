// tests/TaskController/taskController.getEpicTasksForExport.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetAllMocks } from './testUtils.js';

vi.mock('../../../services/taskService.js', () => ({
  getEpicTasksForExportService: vi.fn(),
}));

import { getEpicTasksForExportService } from '../../../services/taskService.js';
import { getEpicTasksForExport } from '../../taskController.js';

describe('taskController.getEpicTasksForExport (wrapper)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('[Normal] TC01 - should call service and return epic tasks when successful', async () => {
    const eventId = 'event123';
    const mockTasks = [
      { id: 't1', title: 'Epic 1' },
      { id: 't2', title: 'Epic 2' },
    ];

    getEpicTasksForExportService.mockResolvedValueOnce(mockTasks);

    const result = await getEpicTasksForExport(eventId);

    expect(getEpicTasksForExportService).toHaveBeenCalledWith(eventId);
    expect(result).toEqual(mockTasks);
  });

  it('[Abnormal] TC02 - should propagate error from service when it fails', async () => {
    const eventId = 'event123';
    const err = new Error('DB error');
    getEpicTasksForExportService.mockRejectedValueOnce(err);

    await expect(getEpicTasksForExport(eventId)).rejects.toThrow('DB error');
  });
});
