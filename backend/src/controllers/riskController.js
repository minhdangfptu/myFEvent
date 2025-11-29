import { validationResult } from 'express-validator';
import * as RiskService from '../services/riskService.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  notifyRiskCreated,
  notifyRiskUpdated,
  notifyRiskAssigned,
  notifyRiskOccurred,
  notifyOccurredRiskUpdated,
  notifyRiskStatusChanged,
} from '../services/notificationService.js';

// ====== HELPER FUNCTIONS ======

/**
 * Check if a member has permission to manage a risk
 * @param {Object} member - Event member object
 * @param {Object} risk - Risk object (can be null for create operation)
 * @param {string} riskDepartmentId - Department ID for the risk (used when risk object doesn't exist yet)
 * @param {string} riskScope - Risk scope ('event' or 'department')
 * @returns {boolean} - true if member has permission
 */
const checkRiskPermission = (member, risk = null, riskDepartmentId = null, riskScope = null) => {
    // HoOC has full permission
    if (member.role === 'HoOC') {
        return true;
    }

    // For HoD
    if (member.role === 'HoD') {
        // Get risk details
        const scope = risk ? (risk.scope || 'department') : riskScope;
        let deptId = risk ? risk.departmentId : riskDepartmentId;

        // Allow event-level risks (toàn BTC)
        if (scope === 'event') {
            return true;
        }

        // Extract _id if departmentId is an object (populated)
        if (deptId && typeof deptId === 'object' && deptId._id) {
            deptId = deptId._id;
        }

        // Extract _id from member.departmentId if it's an object
        let memberDeptId = member.departmentId;
        if (memberDeptId && typeof memberDeptId === 'object' && memberDeptId._id) {
            memberDeptId = memberDeptId._id;
        }

        // Allow if risk belongs to HoD's department
        if (deptId && memberDeptId) {
            return deptId.toString() === memberDeptId.toString();
        }

        // If creating new risk without department (shouldn't happen, but deny by default)
        return false;
    }

    // Other roles don't have permission
    return false;
};

const updateRiskStatusBasedOnOccurred = async (eventId, riskId) => {
    try {
        // Get current risk data
        const riskResult = await RiskService.getRiskById(eventId, riskId);
        if (!riskResult.success) {
            console.warn(`Failed to get risk ${riskId} for status update:`, riskResult.message);
            return;
        }

        const risk = riskResult.data;
        const occurredRisks = risk.occurred_risk || [];
        let newStatus = 'not_yet'; // Default status

        if (occurredRisks.length === 0) {
            // BR: occurred = 0 → risk status = not_yet
            newStatus = 'not_yet';
        } else {
            // BR: occurred > 0, check the statuses
            // Count different statuses
            const resolvingOrPendingCount = occurredRisks.filter(occ =>
                occ.occurred_status === 'resolving'
            ).length;

            const resolvedCount = occurredRisks.filter(occ =>
                occ.occurred_status === 'resolved'
            ).length;

           

            // BR: Nếu có bất kỳ occurred nào là pending/resolving → risk status = resolving
            if (resolvingOrPendingCount > 0) {
                newStatus = 'resolving';
            }
            // BR: Nếu tất cả occurred đều là resolved → risk status = resolved
            else if (resolvedCount === occurredRisks.length && occurredRisks.length > 0) {
                newStatus = 'resolved';
            }
            // Edge case: nếu có occurred nhưng không có status hợp lệ
            else {
                newStatus = 'resolving'; // Default to resolving if there are occurred risks
            }
        }
        // Only update if status has changed
        if (risk.risk_status !== newStatus) {
            const updateResult = await RiskService.updateRisk(eventId, riskId, {
                risk_status: newStatus
            });

            if (updateResult.success) {
                // console.log(`✅ Auto-updated risk ${riskId} status: ${risk.risk_status} → ${newStatus}`);
                
                // Send notification about status change
                try {
                  await notifyRiskStatusChanged(eventId, riskId, risk.risk_status, newStatus, risk.scope || 'department', risk.departmentId);
                } catch (notifError) {
                  console.error('Error sending risk status changed notification:', notifError);
                  // Don't fail the request if notification fails
                }
            } else {
                // console.warn(`❌ Failed to auto-update risk ${riskId} status:`, updateResult.message);
            }
        } else {
            // console.log(`🔄 Risk ${riskId} status unchanged: ${newStatus}`);
        }

        return {
            success: true,
            previousStatus: risk.risk_status,
            newStatus: newStatus,
            changed: risk.risk_status !== newStatus
        };

    } catch (error) {
        console.error('Error in updateRiskStatusBasedOnOccurred:', error);
        // Don't throw error to avoid breaking the main operation
        return {
            success: false,
            error: error.message
        };
    }
};

export const getAllOccurredRisksByEventController = async (req, res) => {
    try {
        const { eventId } = req.params;

        const result = await RiskService.getAllOccurredRisksByEvent(eventId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
// ====== BASIC CRUD OPERATIONS ======

/**
 * Create a new risk
 * POST /api/events/:eventId/risks
 */
export const createRisk = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Validate eventId
        if (!eventId) {
            return res.status(400).json({
                success: false,
                message: 'Event ID is required'
            });
        }

        // Check role: chỉ HoOC hoặc HoD mới được tạo risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được tạo risk'
            });
        }

        // Check permission for HoD: can only create risks for their department or event-level
        const riskScope = req.body.scope || 'department';
        const riskDepartmentId = req.body.departmentId;

        if (!checkRiskPermission(member, null, riskDepartmentId, riskScope)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được tạo risk cho ban mình hoặc toàn BTC'
            });
        }

        const riskData = { ...req.body, updated_personId: member._id };

        const result = await RiskService.createRisk(eventId, riskData);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Send notification
        try {
          await notifyRiskCreated(eventId, result.data._id, riskScope, riskDepartmentId);
        } catch (notifError) {
          console.error('Error sending risk created notification:', notifError);
          // Don't fail the request if notification fails
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            message: 'Risk created successfully'
        });

    } catch (error) {
        console.error('Error in createRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all risks for an event with pagination and filtering
 * GET /api/events/:eventId/risks
 */
export const getRisks = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Check role: HoOC, HoD, Member đều có thể xem
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xem risks'
            });
        }
        const options = {
            page: req.query.page,
            limit: req.query.limit,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            search: req.query.search,
            risk_category: req.query.risk_category,
            impact: req.query.impact,
            likelihood: req.query.likelihood,
            risk_status: req.query.risk_status,
            departmentId: req.query.departmentId
        };

        const result = await RiskService.getRisksByEvent(eventId, options);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data.risks,
            pagination: result.data.pagination,
            message: 'Risks retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getRisks controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all risks without pagination (for analytics)
 * GET /api/events/:eventId/risks/all
 */
export const getAllRisks = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Check role: HoOC, HoD, Member đều có thể xem
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xem risks'
            });
        }
        const filters = {
            risk_category: req.query.risk_category,
            impact: req.query.impact,
            likelihood: req.query.likelihood,
            risk_status: req.query.risk_status,
            departmentId: req.query.departmentId
        };

        const result = await RiskService.getAllRisksByEventWithoutPagination(eventId, filters);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            message: 'All risks retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getAllRisks controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get a single risk by ID
 * GET /api/events/:eventId/risks/:riskId
 */
export const getRiskById = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId } = req.params;

        // Check role: HoOC, HoD, Member đều có thể xem
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xem risk'
            });
        }

        const result = await RiskService.getRiskById(eventId, riskId);

        if (!result.success) {
            const statusCode = result.message === 'Risk not found' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Risk retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getRiskById controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update a risk
 * PUT /api/events/:eventId/risks/:riskId
 */
export const updateRisk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được sửa risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được sửa risk'
            });
        }

        // Get current risk to check permission
        const currentRiskResult = await RiskService.getRiskById(eventId, riskId);
        if (!currentRiskResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Check permission for HoD
        if (!checkRiskPermission(member, currentRiskResult.data)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được sửa risk của ban mình hoặc toàn BTC'
            });
        }

        const updateData = { ...req.body, updated_personId: member._id };

        const result = await RiskService.updateRisk(eventId, riskId, updateData);

        if (!result.success) {
            const statusCode = result.message === 'Risk not found' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        // Send notification
        try {
          const risk = result.data;
          await notifyRiskUpdated(eventId, riskId, risk.scope || 'department', risk.departmentId);
        } catch (notifError) {
          console.error('Error sending risk updated notification:', notifError);
          // Don't fail the request if notification fails
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Risk updated successfully'
        });

    } catch (error) {
        console.error('Error in updateRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete a risk
 * DELETE /api/events/:eventId/risks/:riskId
 */
export const deleteRisk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được xóa risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được xóa risk'
            });
        }

        // Get current risk to check permission
        const currentRiskResult = await RiskService.getRiskById(eventId, riskId);
        if (!currentRiskResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Check permission for HoD
        if (!checkRiskPermission(member, currentRiskResult.data)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được xóa risk của ban mình hoặc toàn BTC'
            });
        }

        // Update updated_personId trước khi xóa
        await RiskService.updateRisk(eventId, riskId, { updated_personId: member._id });
        const result = await RiskService.deleteRisk(eventId, riskId);

        if (!result.success) {
            const statusCode = result.message === 'Risk not found' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Risk deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ====== OCCURRED RISK MANAGEMENT ======

/**
 * Add an occurred risk
 * POST /api/events/:eventId/risks/:riskId/occurred
 */
export const addOccurredRisk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được thêm occurred risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được thêm occurred risk'
            });
        }

        // Get current risk to check permission
        const currentRiskResult = await RiskService.getRiskById(eventId, riskId);
        if (!currentRiskResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Check permission for HoD
        if (!checkRiskPermission(member, currentRiskResult.data)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được thêm occurred risk cho risk của ban mình hoặc toàn BTC'
            });
        }

        const occurredData = { ...req.body, update_personId: member._id };

        const result = await RiskService.addOccurredRisk(eventId, riskId, occurredData);

        if (!result.success) {
            const statusCode = result.message === 'Risk not found' ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        // Auto-update risk status based on occurred risks
        const statusUpdateResult = await updateRiskStatusBasedOnOccurred(eventId, riskId);

        // Send notification
        try {
          const risk = currentRiskResult.data;
          // Get the newly created occurred risk (last one in the array)
          const occurredRisks = result.data.occurred_risk || [];
          const newOccurredRisk = occurredRisks.length > 0 ? occurredRisks[occurredRisks.length - 1] : null;
          const occurredRiskId = newOccurredRisk?._id || newOccurredRisk?.id;
          await notifyRiskOccurred(eventId, riskId, occurredRiskId, risk.scope || 'department', risk.departmentId);
        } catch (notifError) {
          console.error('Error sending risk occurred notification:', notifError);
          // Don't fail the request if notification fails
        }

        return res.status(201).json({
            success: true,
            data: result.data,
            statusUpdate: statusUpdateResult,
            message: 'Occurred risk added successfully and risk status updated'
        });

    } catch (error) {
        console.error('Error in addOccurredRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update an occurred risk
 * PUT /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId
 */
export const updateOccurredRisk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId, occurredRiskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được sửa occurred risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được sửa occurred risk'
            });
        }

        // Get current risk to check permission
        const currentRiskResult = await RiskService.getRiskById(eventId, riskId);
        if (!currentRiskResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Check permission for HoD
        if (!checkRiskPermission(member, currentRiskResult.data)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được sửa occurred risk cho risk của ban mình hoặc toàn BTC'
            });
        }

        const updateData = { ...req.body, update_personId: member._id };

        const result = await RiskService.updateOccurredRisk(eventId, riskId, occurredRiskId, updateData);

        if (!result.success) {
            const statusCode = result.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        // Auto-update risk status based on occurred risks
        const statusUpdateResult = await updateRiskStatusBasedOnOccurred(eventId, riskId);

        // Send notification
        try {
          const risk = currentRiskResult.data;
          await notifyOccurredRiskUpdated(eventId, riskId, occurredRiskId, risk.scope || 'department', risk.departmentId);
        } catch (notifError) {
          console.error('Error sending occurred risk updated notification:', notifError);
          // Don't fail the request if notification fails
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            statusUpdate: statusUpdateResult,
            message: 'Occurred risk updated successfully and risk status updated'
        });

    } catch (error) {
        console.error('Error in updateOccurredRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Remove an occurred risk
 * DELETE /api/events/:eventId/risks/:riskId/occurred/:occurredRiskId
 */
export const removeOccurredRisk = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId, occurredRiskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được xóa occurred risk
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được xóa occurred risk'
            });
        }

        // Get current risk to check permission
        const currentRiskResult = await RiskService.getRiskById(eventId, riskId);
        if (!currentRiskResult.success) {
            return res.status(404).json({
                success: false,
                message: 'Risk not found'
            });
        }

        // Check permission for HoD
        if (!checkRiskPermission(member, currentRiskResult.data)) {
            return res.status(403).json({
                success: false,
                message: 'HoD chỉ được xóa occurred risk cho risk của ban mình hoặc toàn BTC'
            });
        }

        // Update update_personId trước khi xóa occurred risk
        await RiskService.updateOccurredRisk(eventId, riskId, occurredRiskId, { update_personId: member._id });
        const result = await RiskService.removeOccurredRisk(eventId, riskId, occurredRiskId);

        if (!result.success) {
            const statusCode = result.message.includes('not found') ? 404 : 400;
            return res.status(statusCode).json(result);
        }

        // Auto-update risk status based on occurred risks
        const statusUpdateResult = await updateRiskStatusBasedOnOccurred(eventId, riskId);

        return res.status(200).json({
            success: true,
            data: result.data,
            statusUpdate: statusUpdateResult,
            message: 'Occurred risk removed successfully and risk status updated'
        });

    } catch (error) {
        console.error('Error in removeOccurredRisk controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get risks by department
 * GET /api/events/:eventId/departments/:departmentId/risks
 */
export const getRisksByDepartment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, departmentId } = req.params;

        // Check role: HoOC, HoD, Member đều có thể xem
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xem risks by department'
            });
        }

        const result = await RiskService.getRisksByDepartment(eventId, departmentId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            total: result.total,
            message: 'Department risks retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getRisksByDepartment controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// ====== UTILITY ENDPOINTS ======

/**
 * Bulk update risk statuses
 * PATCH /api/events/:eventId/risks/bulk-status
 */
export const bulkUpdateRiskStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được bulk update status
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được bulk update risk status'
            });
        }

        const { riskIds, status } = req.body;

        if (!Array.isArray(riskIds) || riskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'riskIds array is required and cannot be empty'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'status is required'
            });
        }

        const result = await RiskService.bulkUpdateRiskStatus(eventId, riskIds, status);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: result.message
        });

    } catch (error) {
        console.error('Error in bulkUpdateRiskStatus controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get risk categories
 * GET /api/risks/categories
 */
export const getRiskCategories = async (req, res) => {
    try {
        const categories = RiskService.getRiskCategories();

        return res.status(200).json({
            success: true,
            data: categories,
            message: 'Risk categories retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getRiskCategories controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// ====== AUTO-STATUS UPDATE ENDPOINTS ======

/**
 * Manually trigger risk status update based on occurred risks
 * POST /api/events/:eventId/risks/:riskId/update-status
 */
export const updateRiskStatusManually = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId, riskId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được update status manually
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được update risk status manually'
            });
        }

        // Get risk before update for comparison
        const beforeResult = await RiskService.getRiskById(eventId, riskId);
        if (!beforeResult.success) {
            return res.status(404).json(beforeResult);
        }

        const oldStatus = beforeResult.data.risk_status;

        // Trigger status update
        const statusUpdateResult = await updateRiskStatusBasedOnOccurred(eventId, riskId);

        // Get risk after update
        const afterResult = await RiskService.getRiskById(eventId, riskId);
        const newStatus = statusUpdateResult?.newStatus || afterResult.data.risk_status;

        return res.status(200).json({
            success: true,
            data: {
                riskId,
                statusChange: {
                    from: oldStatus,
                    to: newStatus,
                    changed: oldStatus !== newStatus
                },
                risk: afterResult.data,
                updateDetails: statusUpdateResult
            },
            message: oldStatus !== newStatus ?
                `Risk status updated from ${oldStatus} to ${newStatus}` :
                'No status change needed'
        });

    } catch (error) {
        console.error('Error in updateRiskStatusManually controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Batch update all risk statuses in an event
 * POST /api/events/:eventId/risks/batch-update-status
 */
export const batchUpdateRiskStatuses = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Check role: chỉ HoOC hoặc HoD mới được batch update statuses
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Chỉ HoOC hoặc HoD được batch update risk statuses'
            });
        }

        // Get all risks for the event
        const allRisksResult = await RiskService.getAllRisksByEventWithoutPagination(eventId);
        if (!allRisksResult.success) {
            return res.status(400).json(allRisksResult);
        }

        const risks = allRisksResult.data;
        const statusUpdates = [];

        // Update status for each risk
        for (const risk of risks) {
            const oldStatus = risk.risk_status;
            const updateResult = await updateRiskStatusBasedOnOccurred(eventId, risk._id);

            if (updateResult.success) {
                statusUpdates.push({
                    riskId: risk._id,
                    riskName: risk.name,
                    from: oldStatus,
                    to: updateResult.newStatus,
                    changed: updateResult.changed
                });
            }
        }

        const changedCount = statusUpdates.filter(update => update.changed).length;

        return res.status(200).json({
            success: true,
            data: {
                totalRisks: risks.length,
                updatedCount: changedCount,
                statusUpdates: statusUpdates
            },
            message: `Batch status update completed. ${changedCount} risks had status changes.`
        });

    } catch (error) {
        console.error('Error in batchUpdateRiskStatuses controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
/**
 * Get risk statistics by category for pie charts
 * GET /api/events/:eventId/risks/category-statistics
 */
export const getRiskCategoryStatistics = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { eventId } = req.params;

        // Check role: HoOC, HoD, Member đều có thể xem
        const member = await ensureEventRole(req.user.id, eventId, ['HoOC', 'HoD', 'Member']);
        if (!member) {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền xem thống kê rủi ro theo danh mục'
            });
        }

        const result = await RiskService.getRiskStatistics(eventId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Risk category statistics retrieved successfully'
        });

    } catch (error) {
        console.error('Error in getRiskCategoryStatistics controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while getting risk category statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


