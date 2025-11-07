import { Types } from 'mongoose';
import {
    createRisk as createRiskService,
    getRiskById,
    getAllRiskByEvent,
    updateRisk as updateRiskService,
    deleteRisk as deleteRiskService,
    getRiskStatistics as getRiskStatisticsService,
    getRisksByCategoryStats as getRisksByCategoryStatsService
} from '../services/riskService.js';

const handleError = (error, res, defaultMessage = 'Internal server error') => {
    console.error('RiskController error:', error);

    let statusCode = 500;
    let message = defaultMessage;
    const msg = error?.message || '';

    if (/not found/i.test(msg)) {
        statusCode = 404;
        message = msg;
    } else if (
        /invalid/i.test(msg) ||
        /required/i.test(msg) ||
        /format/i.test(msg)
    ) {
        statusCode = 400;
        message = msg;
    }

    return res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? msg : undefined,
    });
};

const validateParams = (params = {}) => {
    const {
        eventId,
        riskId,
        departmentId,
    } = params;

    if (eventId && !Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid eventId format');
    }
    if (riskId && !Types.ObjectId.isValid(riskId)) {
        throw new Error('Invalid riskId format');
    }
    if (departmentId && !Types.ObjectId.isValid(departmentId)) {
        throw new Error('Invalid departmentId format');
    }
};

const VALID_CATEGORIES = [
    'infrastructure',
    'mc-guests',
    'communication',
    'players',
    'staffing',
    'communication_post',
    'attendees',
    'weather',
    'time',
    'timeline',
    'tickets',
    'collateral',
    'game',
    'sponsorship',
    'finance',
    'transportation',
    'decor',
    'others',
];

const VALID_IMPACTS = ['low', 'medium', 'high'];
const VALID_STATUS = ['pending', 'resolved', 'cancelled'];

// GET /api/events/:eventId/risk
export const listRisksByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        validateParams({ eventId });

        const risks = await getAllRiskByEvent(eventId);

        return res.status(200).json({
            success: true,
            message: 'Risks retrieved successfully',
            data: risks,
            count: risks.length
        });
    } catch (error) {
        return handleError(error, res, 'Failed to load risks by event');
    }
};

// GET /api/events/:eventId/risk/:riskId
export const getRiskDetail = async (req, res) => {
    try {
        const { riskId } = req.params;
        validateParams({ riskId });

        const risk = await getRiskById(riskId);

        return res.status(200).json({
            success: true,
            message: 'Risk retrieved successfully',
            data: risk,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to get risk detail');
    }
};

// POST /api/events/:eventId/risk
export const createRisk = async (req, res) => {
    try {
        const { eventId } = req.params;
        const payload = req.body || {};

        validateParams({ eventId });

        if (!payload.departmentId) throw new Error('departmentId is required');
        if (!payload.name) throw new Error('name is required');
        if (!payload.risk_category) throw new Error('risk_category is required');
        if (!payload.impact) throw new Error('impact is required');
        if (!payload.risk_mitigation_plan) throw new Error('risk_mitigation_plan is required');
        if (!payload.risk_response_plan) throw new Error('risk_response_plan is required');

        validateParams({ departmentId: payload.departmentId });

        if (!VALID_CATEGORIES.includes(payload.risk_category)) {
            throw new Error('Invalid risk_category');
        }
        if (!VALID_IMPACTS.includes(payload.impact)) {
            throw new Error('Invalid impact');
        }
        if (payload.risk_status && !VALID_STATUS.includes(payload.risk_status)) {
            throw new Error('Invalid risk_status. Must be: pending, resolved, or cancelled');
        }

        // Set default risk_status if not provided
        if (!payload.risk_status) {
            payload.risk_status = 'pending';
        }

        const created = await createRiskService(payload);

        return res.status(201).json({
            success: true,
            message: 'Risk created successfully',
            data: created,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to create risk');
    }
};

// PATCH /api/events/:eventId/risk/:riskId
export const updateRisk = async (req, res) => {
    try {
        const { riskId } = req.params;
        const updateData = req.body || {};

        validateParams({ riskId });

        if (updateData.departmentId) {
            validateParams({ departmentId: updateData.departmentId });
        }
        if (updateData.risk_category && !VALID_CATEGORIES.includes(updateData.risk_category)) {
            throw new Error('Invalid risk_category');
        }
        if (updateData.impact && !VALID_IMPACTS.includes(updateData.impact)) {
            throw new Error('Invalid impact');
        }
        if (updateData.risk_status && !VALID_STATUS.includes(updateData.risk_status)) {
            throw new Error('Invalid risk_status. Must be: pending, resolved, or cancelled');
        }

        const updated = await updateRiskService(riskId, updateData);

        return res.status(200).json({
            success: true,
            message: 'Risk updated successfully',
            data: updated,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to update risk');
    }
};

// DELETE /api/events/:eventId/risk/:riskId
export const deleteRisk = async (req, res) => {
    try {
        const { riskId } = req.params;
        validateParams({ riskId });

        const result = await deleteRiskService(riskId);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.deletedRisk,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to delete risk');
    }
};

// GET /api/events/:eventId/risk/stats
export const getRiskStatistics = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { departmentId } = req.query || {};
        
        validateParams({ eventId });
        if (departmentId) validateParams({ departmentId });

        const stats = await getRiskStatisticsService(eventId, departmentId || null);

        return res.status(200).json({
            success: true,
            message: 'Risk statistics retrieved successfully',
            data: stats,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to get risk statistics');
    }
};

// GET /api/events/:eventId/risk/stats/categories
export const getRisksByCategoryStats = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { departmentId } = req.query || {};
        
        validateParams({ eventId });
        if (departmentId) validateParams({ departmentId });

        const stats = await getRisksByCategoryStatsService(eventId, departmentId || null);

        return res.status(200).json({
            success: true,
            message: 'Category statistics retrieved successfully',
            data: stats,
        });
    } catch (error) {
        return handleError(error, res, 'Failed to get risks by category statistics');
    }
};

export default {
    listRisksByEvent,
    getRiskDetail,
    createRisk,
    updateRisk,
    deleteRisk,
    getRiskStatistics,
    getRisksByCategoryStats,
};