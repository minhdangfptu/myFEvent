import { Router } from 'express';
import * as RiskController from '../controllers/riskController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { getMemberRawForRisk } from '../controllers/eventMemberController.js';

const router = Router({ mergeParams: true });

// ====== BASIC CRUD ROUTES ======

// GET /api/events/:eventId/risks - Get risks with pagination and filters
router.get('/', authenticateToken, RiskController.getRisks);

// GET /api/events/:eventId/risks/all - Get all risks without pagination
router.get('/all', authenticateToken, RiskController.getAllRisks);

// POST /api/events/:eventId/risks - Create new risk
router.post('/', authenticateToken, RiskController.createRisk);

// GET /api/events/:eventId/risks/details/:riskId - Get single risk
router.get('/details/:riskId', authenticateToken, RiskController.getRiskById);

// PUT /api/events/:eventId/risks/details/:riskId - Update risk
router.put('/details/:riskId', authenticateToken, RiskController.updateRisk);

// DELETE /api/events/:eventId/risks/details/:riskId - Delete risk
router.delete('/details/:riskId', authenticateToken, RiskController.deleteRisk);

// ====== OCCURRED RISK ROUTES ======

// POST /api/events/:eventId/risks/:riskId/occurred - Add occurred risk
router.post('/:riskId/occurred', authenticateToken, RiskController.addOccurredRisk);

// PUT /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId - Update occurred risk
router.put('/:riskId/occurred/:occurredRiskId', authenticateToken, RiskController.updateOccurredRisk);

// DELETE /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId - Remove occurred risk
router.delete('/:riskId/occurred/:occurredRiskId', authenticateToken, RiskController.removeOccurredRisk);

// ====== DEPARTMENT-SPECIFIC ROUTES ======

// GET /api/events/:eventId/departments/:departmentId/risks - Department risks
router.get('/departments/:departmentId/risks', authenticateToken, RiskController.getRisksByDepartment);

router.get('/occurred-risks',
    authenticateToken,
    RiskController.getAllOccurredRisksByEventController
);

router.get('/full-members', authenticateToken, getMemberRawForRisk);


// ====== AUTO-STATUS UPDATE ROUTES ======

// POST /api/events/:eventId/risks/:riskId/update-status - Manual status update
router.post('/:riskId/update-status', authenticateToken, RiskController.updateRiskStatusManually);

/**
 * @route   GET /api/events/:eventId/risks/category-statistics
 * @desc    Get risk statistics by category for pie charts
 * @access  Private (HoOC, HoD, Member)
 */
router.get('/statistics',
    authenticateToken,
    RiskController.getRiskCategoryStatistics
);

export default router;

// ====== GLOBAL RISK ROUTES (Non-event specific) ======
export const globalRiskRouter = Router();

// GET /api/risks/categories - Get risk categories
globalRiskRouter.get('/categories', RiskController.getRiskCategories);
