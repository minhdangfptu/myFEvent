import Risk from '../models/risk.js'; // Adjust path as needed
import { Types } from 'mongoose';
import { findDepartmentsByEvent } from './departmentService.js';

/**
 * Create a new risk
 * @param {Object} riskData - Risk data
 * @returns {Promise<Object>} Created risk
 */
export const createRisk = async (riskData) => {
    try {
        const risk = new Risk(riskData);
        await risk.save();
        return await getRiskById(risk._id);
    } catch (error) {
        throw new Error(`Error creating risk: ${error.message}`);
    }
}

/**
 * Get all risks by event ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of risks
 */
export const getAllRiskByEvent = async (eventId) => {
    try {
        if (!eventId) {
            throw new Error('EventId is required');
        }

        const { items: departments } = await findDepartmentsByEvent(eventId, {
            search: null,      // Không search
            skip: 0,          // Từ đầu
            limit: 999        // Lấy tất cả departments
        });

        // Extract department IDs
        const deptIds = departments
            .filter(dept => dept?._id)
            .map(dept => dept._id);

        if (!deptIds.length) {
            return [];
        }

        // Lấy risks
        const risks = await Risk.find({
            departmentId: { $in: deptIds }
        })
            .populate({
                path: 'departmentId',
                select: 'name eventId',
                populate: { path: 'eventId', select: 'name' },
            })
            .sort({ createdAt: -1 })
            .lean();

        return risks;
    } catch (error) {
        console.error('❌ getAllRiskByEvent error:', error);
        throw new Error(`Error fetching risks by event: ${error.message}`);
    }
}

/**
 * Get risk by ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Risk object
 */
export const getRiskById = async (riskId) => {
    try {
        if (!Types.ObjectId.isValid(riskId)) {
            throw new Error('Invalid risk ID format');
        }

        const risk = await Risk.findById(riskId)
            .populate({
                path: 'departmentId',
                select: 'name eventId',
                populate: { path: 'eventId', select: 'name' }
            })
            .lean();

        if (!risk) {
            throw new Error('Risk not found');
        }

        return risk;
    } catch (error) {
        throw new Error(`Error fetching risk: ${error.message}`);
    }
}

/**
 * Update risk by ID
 * @param {string} riskId - Risk ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated risk
 */
export const updateRisk = async (riskId, updateData) => {
    try {
        if (!Types.ObjectId.isValid(riskId)) {
            throw new Error('Invalid risk ID format');
        }

        const updatedRisk = await Risk.findByIdAndUpdate(
            riskId,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .populate({
                path: 'departmentId',
                select: 'name eventId',
                populate: { path: 'eventId', select: 'name' }
            });

        if (!updatedRisk) {
            throw new Error('Risk not found');
        }

        return updatedRisk;
    } catch (error) {
        throw new Error(`Error updating risk: ${error.message}`);
    }
}

/**
 * Delete risk by ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteRisk = async (riskId) => {
    try {
        if (!Types.ObjectId.isValid(riskId)) {
            throw new Error('Invalid risk ID format');
        }

        const deletedRisk = await Risk.findByIdAndDelete(riskId);

        if (!deletedRisk) {
            throw new Error('Risk not found');
        }

        return { message: 'Risk deleted successfully', deletedRisk };
    } catch (error) {
        throw new Error(`Error deleting risk: ${error.message}`);
    }
}

// ========== UTILITY METHODS ==========

/**
 * Get risk statistics
 * @param {string} eventId - Optional event ID filter
 * @param {string} departmentId - Optional department ID filter
 * @returns {Promise<Object>} Risk statistics
 */
export const getRiskStatistics = async (eventId = null, departmentId = null) => {
    try {
        let matchStage = {};

        if (eventId) {
            const { items: departments } = await findDepartmentsByEvent(eventId, {
                search: null,
                skip: 0,
                limit: 999,
            });
            const deptIds = departments.map((dept) => dept._id);
            if (!deptIds.length) {
                return {
                    total_risks: 0,
                    impact_distribution: { low: 0, medium: 0, high: 0 },
                };
            }
            matchStage.departmentId = { $in: deptIds };
        } else if (departmentId) {
            matchStage.departmentId = new Types.ObjectId(departmentId);
        }

        const stats = await Risk.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total_risks: { $sum: 1 },
                    low_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'low'] }, 1, 0] },
                    },
                    medium_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'medium'] }, 1, 0] },
                    },
                    high_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'high'] }, 1, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total_risks: 1,
                    impact_distribution: {
                        low: '$low_impact',
                        medium: '$medium_impact',
                        high: '$high_impact',
                    },
                },
            },
        ]);

        return (
            stats[0] || {
                total_risks: 0,
                impact_distribution: { low: 0, medium: 0, high: 0 },
            }
        );
    } catch (error) {
        throw new Error(`Error fetching risk statistics: ${error.message}`);
    }
};

/**
 * Get risks by category statistics
 * @param {string} eventId - Optional event ID filter
 * @param {string} departmentId - Optional department ID filter
 * @returns {Promise<Array>} Category statistics
 */
export const getRisksByCategoryStats = async (
    eventId = null,
    departmentId = null
) => {
    try {
        let matchStage = {};

        if (eventId) {
            const { items: departments } = await findDepartmentsByEvent(eventId, {
                search: null,
                skip: 0,
                limit: 999,
            });
            const deptIds = departments.map((dept) => dept._id);
            if (!deptIds.length) return [];
            matchStage.departmentId = { $in: deptIds };
        } else if (departmentId) {
            matchStage.departmentId = new Types.ObjectId(departmentId);
        }

        const categoryStats = await Risk.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$risk_category',
                    count: { $sum: 1 },
                    low_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'low'] }, 1, 0] },
                    },
                    medium_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'medium'] }, 1, 0] },
                    },
                    high_impact: {
                        $sum: { $cond: [{ $eq: ['$impact', 'high'] }, 1, 0] },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    count: 1,
                    impact_distribution: {
                        low: '$low_impact',
                        medium: '$medium_impact',
                        high: '$high_impact',
                    },
                },
            },
            { $sort: { count: -1 } },
        ]);

        return categoryStats;
    } catch (error) {
        throw new Error(`Error fetching category statistics: ${error.message}`);
    }
};