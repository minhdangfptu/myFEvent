import express from 'express';
import {
  listTasksByEventOrDepartment,
  getTaskDetail,
  createTask,
  editTask,
  deleteTask,
  updateTaskProgress,
  assignTask,
  unassignTask,
  getTaskByDepartment,
  getEventTaskProgressChart,
  getTaskStatisticsByMilestone,
  getBurnupChartData,
  getDepartmentBurnupTasks,
} from '../controllers/taskController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });

// Thống kê task theo milestone
router.get('/:eventId/statistics/:milestoneId', authenticateToken, getTaskStatisticsByMilestone);

router.get('/:eventId/burnup-data/:milestoneId', authenticateToken, getBurnupChartData);

router.get('/:eventId/department-burnup/:milestoneId/:departmentId', authenticateToken, getDepartmentBurnupTasks);

router.get('/:eventId/', authenticateToken, listTasksByEventOrDepartment);
// Lấy chi tiết 1 task
router.get('/:eventId/:taskId', authenticateToken, getTaskDetail);
//Lấy task của 1 department
router.get('/:eventId/:taskId/:departmentId', authenticateToken, getTaskByDepartment);
// Tạo task (HoD)
router.post('/:eventId/create-new-task', authenticateToken, createTask);
// Sửa task (HoD)
router.patch('/:eventId/edit-task/:taskId', authenticateToken, editTask);
// Xoá task (HoD)
router.delete('/:eventId/:taskId', authenticateToken, deleteTask);
// Thành viên update progress
router.patch('/:eventId/:taskId/progress', authenticateToken, updateTaskProgress);
// Gán task cho ai đó (Hooc, HoD)
router.patch('/:eventId/:taskId/assign', authenticateToken, assignTask);
// Huỷ gán
router.patch('/:eventId/:taskId/unassign', authenticateToken, unassignTask);

// Thống kê tiến độ/burnup chart
router.get('/:eventId/:taskId/progress', authenticateToken, getEventTaskProgressChart);

export default router;
