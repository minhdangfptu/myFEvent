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
  getEventTaskProgressChart
} from '../controllers/taskController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Lấy danh sách task của event (tùy chọn filter departmentId), phân quyền bên trong controller
router.get('/events/:eventId/tasks', authenticateToken, listTasksByEventOrDepartment);
// Lấy chi tiết 1 task
router.get('/events/:eventId/tasks/:taskId', authenticateToken, getTaskDetail);
// Tạo task (HoD)
router.post('/events/:eventId/tasks', authenticateToken, createTask);
// Sửa task (HoD)
router.patch('/events/:eventId/tasks/:taskId', authenticateToken, editTask);
// Xoá task (HoD)
router.delete('/events/:eventId/tasks/:taskId', authenticateToken, deleteTask);
// Thành viên update progress
router.patch('/events/:eventId/tasks/:taskId/progress', authenticateToken, updateTaskProgress);
// Gán task cho ai đó (HoD)
router.patch('/events/:eventId/tasks/:taskId/assign', authenticateToken, assignTask);
// Huỷ gán
router.patch('/events/:eventId/tasks/:taskId/unassign', authenticateToken, unassignTask);
// Thống kê tiến độ/burnup chart
router.get('/events/:eventId/tasks/progress', authenticateToken, getEventTaskProgressChart);

export default router;
