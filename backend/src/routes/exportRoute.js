// routes/export.js
import { Router } from 'express';
import { cleanupOldFiles, downloadExportedFile, exportSingleItem, exportAllItemsZip, exportSelectedItemsZip, listExportedFiles } from '../controllers/exportController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { getAgendaByEvent, getNameAgendaWithMilestone } from '../controllers/agendaController.js';

const router = Router({ mergeParams: true });
// Đặt các route cụ thể TRƯỚC route có param để tránh conflict
router.get('/items/zip-all', authenticateToken, exportAllItemsZip);
router.post('/items/zip-selected', authenticateToken, exportSelectedItemsZip);
router.get('/items/lists', authenticateToken, listExportedFiles);
router.post('/items/:itemId', authenticateToken, exportSingleItem);
router.get('/download/:filename', authenticateToken, downloadExportedFile);
router.get('/raw/agenda/by-event', authenticateToken, getAgendaByEvent);
router.get('/raw/agenda/list-name', authenticateToken, getNameAgendaWithMilestone);
router.delete('/cleanup', authenticateToken, cleanupOldFiles);
export default router;