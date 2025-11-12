import Risk from '../models/risk.js';
import { Types } from 'mongoose';

// ====== HELPER FUNCTIONS ======

/**
 * Calculate risk score (impact × likelihood)
 * @param {string} impact - Impact level
 * @param {string} likelihood - Likelihood level
 * @returns {number} Risk score
 */
const calculateRiskScore = (impact, likelihood) => {
    const impactScores = { low: 1, medium: 2, high: 3 };
    const likelihoodScores = {
        very_low: 1,
        low: 2,
        medium: 3,
        high: 4,
        very_high: 5
    };
    return (impactScores[impact] || 2) * (likelihoodScores[likelihood] || 3);
};

/**
 * Get risk categories with Vietnamese labels
 * @returns {Object} Risk categories
 */
const getRiskCategories = () => {
    return {
        'infrastructure': 'Cơ sở vật chất',
        'mc-guests': 'MC & Khách mời',
        'communication': 'Truyền thông',
        'players': 'Người chơi',
        'staffing': 'Nhân sự',
        'communication_post': 'Tuyến bài',
        'attendees': 'Người tham gia',
        'weather': 'Thời tiết',
        'time': 'Thời gian',
        'timeline': 'Timeline',
        'tickets': 'Vé',
        'collateral': 'Ấn phẩm',
        'game': 'Game',
        'sponsorship': 'Nhà tài trợ',
        'finance': 'Tài chính',
        'transportation': 'Vận chuyển',
        'decor': 'Đồ trang trí',
        'others': 'Khác'
    };
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object|null} Error object or null if valid
 */
const validateObjectId = (id, fieldName = 'ID') => {
    if (!id || !Types.ObjectId.isValid(id)) {
        return {
            success: false,
            message: `Invalid ${fieldName} provided`
        };
    }
    return null;
};

/**
 * Handle errors with proper formatting
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 * @returns {Object} Formatted error response
 */
const handleError = (error, defaultMessage) => {
    console.error(`Error: ${defaultMessage}`, error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return {
            success: false,
            message: `Validation error: ${messages.join(', ')}`
        };
    }

    return {
        success: false,
        message: error.message || defaultMessage,
        error: process.env.NODE_ENV === 'development' ? error : undefined
    };
};

// ====== BASIC CRUD OPERATIONS ======

/**
 * Create a new risk
 * @param {string} eventId - Event ID
 * @param {Object} riskData - Risk data
 * @returns {Promise<Object>} Created risk
 */
export const createRisk = async (eventId, riskData) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        // Validate required fields
        if (!riskData.name || !riskData.departmentId || !riskData.risk_category ||
            !riskData.impact || !riskData.likelihood || !riskData.risk_mitigation_plan) {
            return {
                success: false,
                message: 'Missing required fields: name, departmentId, risk_category, impact, likelihood, risk_mitigation_plan'
            };
        }

        // Validate departmentId
        const departmentIdError = validateObjectId(riskData.departmentId, 'department ID');
        if (departmentIdError) return departmentIdError;

        const risk = new Risk({
            ...riskData,
            eventId: new Types.ObjectId(eventId),
            departmentId: new Types.ObjectId(riskData.departmentId),
            occurred_risk: [],
            risk_status: riskData.risk_status || 'not_yet'
        });

        await risk.save();

        // Populate department info
        await risk.populate('departmentId', 'name description');

        return {
            success: true,
            data: risk,
            message: 'Risk created successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to create risk');
    }
};

/**
 * Get all occurred risks for an event - Ultra simple version
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} All occurred risks
 */
export const getAllOccurredRisksByEvent = async (eventId) => {
    try {
        const risks = await Risk.find({ eventId: new Types.ObjectId(eventId) })
            .populate('departmentId', 'name')
            .lean();

        const occurredRisks = [];

        risks.forEach(risk => {
            if (risk.occurred_risk?.length > 0) {
                risk.occurred_risk.forEach(occurred => {
                    occurredRisks.push({
                        _id: occurred._id,
                        occurred_name: occurred.occurred_name,
                        occurred_location: occurred.occurred_location,
                        occurred_date: occurred.occurred_date,
                        occurred_description: occurred.occurred_description,
                        occurred_status: occurred.occurred_status,
                        resolve_action: occurred.resolve_action,
                        departmentName: risk.departmentId?.name || 'Chưa phân công',
                        riskName: risk.name,
                        risk_id: risk._id
                    });
                });
            }
        });

        // Sort by date desc
        occurredRisks.sort((a, b) => new Date(b.occurred_date || 0) - new Date(a.occurred_date || 0));
        return {
            success: true,
            data: occurredRisks,
            message: 'Success'
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'Failed to get occurred risks'
        };
    }
};

/**
 * Get all risks for an event with advanced filtering and pagination
 * @param {string} eventId - Event ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} List of risks with pagination
 */
export const getRisksByEvent = async (eventId, options = {}) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search,
            risk_category,
            impact,
            likelihood,
            risk_status,
            departmentId
        } = options;

        // Build query
        let query = { eventId: new Types.ObjectId(eventId) };

        // Apply filters
        if (risk_category) query.risk_category = risk_category;
        if (impact) query.impact = impact;
        if (likelihood) query.likelihood = likelihood;
        if (risk_status) query.risk_status = risk_status;
        if (departmentId && Types.ObjectId.isValid(departmentId)) {
            query.departmentId = new Types.ObjectId(departmentId);
        }

        // Search by name or description
        if (search && search.trim()) {
            query.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { risk_mitigation_plan: { $regex: search.trim(), $options: 'i' } },
                { risk_response_plan: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query with pagination
        const [risks, totalCount] = await Promise.all([
            Risk.find(query)
                .populate('departmentId', 'name description')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Risk.countDocuments(query)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        return {
            success: true,
            data: {
                risks,
                pagination: {
                    current: pageNum,
                    total: totalPages,
                    hasNext: hasNextPage,
                    hasPrev: hasPrevPage,
                    totalCount,
                    limit: limitNum
                }
            },
            message: 'Risks retrieved successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to get risks');
    }
};

/**
 * Get all risks for an event (without pagination) - for analytics
 * @param {string} eventId - Event ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} All risks
 */
export const getAllRisksByEventWithoutPagination = async (eventId, filters = {}) => {
    try {
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        let query = { eventId: new Types.ObjectId(eventId) };

        // Apply filters
        if (filters.risk_category) query.risk_category = filters.risk_category;
        if (filters.impact) query.impact = filters.impact;
        if (filters.likelihood) query.likelihood = filters.likelihood;
        if (filters.risk_status) query.risk_status = filters.risk_status;
        if (filters.departmentId && Types.ObjectId.isValid(filters.departmentId)) {
            query.departmentId = new Types.ObjectId(filters.departmentId);
        }

        const risks = await Risk.find(query)
            .populate('departmentId', 'name description')
            .sort({ impact: -1, likelihood: -1, createdAt: -1 })
            .lean();

        return {
            success: true,
            data: risks,
            total: risks.length,
            message: 'All risks retrieved successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to get all risks');
    }
};

/**
 * Get a single risk by ID
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Risk data
 */
export const getRiskById = async (eventId, riskId) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        const risk = await Risk.findOne({
            _id: new Types.ObjectId(riskId),
            eventId: new Types.ObjectId(eventId)
        })
            .populate('departmentId', 'name')
            .populate('departmentId', 'name')
            .populate({
                path: 'occurred_risk.resolve_personId',
                model: 'EventMember',
                populate: {
                    path: 'userId',
                    model: 'User',
                    select: 'fullName email'
                }
            })
            .populate({
                path: 'occurred_risk.update_personId',
                model: 'EventMember',
                populate: {
                    path: 'userId',
                    model: 'User',
                    select: 'fullName email'
                }
            });
        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        return {
            success: true,
            data: risk,
            message: 'Risk retrieved successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to get risk');
    }
};

/**
 * Update a risk
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated risk
 */
export const updateRisk = async (eventId, riskId, updateData) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        // Validate departmentId if being updated
        if (updateData.departmentId) {
            const departmentIdError = validateObjectId(updateData.departmentId, 'department ID');
            if (departmentIdError) return departmentIdError;
        }

        // Convert departmentId to ObjectId if provided
        const processedUpdateData = { ...updateData };
        if (updateData.departmentId) {
            processedUpdateData.departmentId = new Types.ObjectId(updateData.departmentId);
        }

        const risk = await Risk.findOneAndUpdate(
            {
                _id: new Types.ObjectId(riskId),
                eventId: new Types.ObjectId(eventId)
            },
            {
                $set: {
                    ...processedUpdateData,
                    updatedAt: new Date()
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).populate('departmentId', 'name description');

        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        return {
            success: true,
            data: risk,
            message: 'Risk updated successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to update risk');
    }
};

/**
 * Delete a risk
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteRisk = async (eventId, riskId) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        const risk = await Risk.findOneAndDelete({
            _id: new Types.ObjectId(riskId),
            eventId: new Types.ObjectId(eventId)
        });

        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        return {
            success: true,
            data: { deletedRisk: { _id: risk._id, name: risk.name } },
            message: 'Risk deleted successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to delete risk');
    }
};

// ====== OCCURRED RISK MANAGEMENT ======

/**
 * Add an occurred risk to a risk
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @param {Object} occurredData - Occurred risk data
 * @returns {Promise<Object>} Updated risk
 */
export const addOccurredRisk = async (eventId, riskId, occurredData) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        // Validate required fields for occurred risk
        if (!occurredData.occurred_name) {
            return {
                success: false,
                message: 'Occurred risk name is required'
            };
        }

        const risk = await Risk.findOne({
            _id: new Types.ObjectId(riskId),
            eventId: new Types.ObjectId(eventId)
        });

        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        // Prepare occurred risk data
        const processedOccurredData = {
            ...occurredData,
            occurred_date: occurredData.occurred_date ? new Date(occurredData.occurred_date) : new Date(),
            occurred_status: occurredData.occurred_status || 'resolving'
        };

        // Convert person IDs to ObjectIds if provided
        if (occurredData.resolve_personId && Types.ObjectId.isValid(occurredData.resolve_personId)) {
            processedOccurredData.resolve_personId = new Types.ObjectId(occurredData.resolve_personId);
        }

        if (occurredData.update_personId && Types.ObjectId.isValid(occurredData.update_personId)) {
            processedOccurredData.update_personId = new Types.ObjectId(occurredData.update_personId);
        }

        // Add occurred risk
        risk.occurred_risk.push(processedOccurredData);
        await risk.save();

        // Populate and return
        await risk.populate([
            { path: 'departmentId', select: 'name description' },
        ]);

        return {
            success: true,
            data: risk,
            message: 'Occurred risk added successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to add occurred risk');
    }
};

/**
 * Update an occurred risk
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @param {string} occurredRiskId - Occurred risk ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated risk
 */
export const updateOccurredRisk = async (eventId, riskId, occurredRiskId, updateData) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        const occurredRiskIdError = validateObjectId(occurredRiskId, 'occurred risk ID');
        if (occurredRiskIdError) return occurredRiskIdError;

        const risk = await Risk.findOne({
            _id: new Types.ObjectId(riskId),
            eventId: new Types.ObjectId(eventId)
        });

        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        // Find and update the occurred risk
        const occurredRisk = risk.occurred_risk.id(occurredRiskId);
        if (!occurredRisk) {
            return {
                success: false,
                message: 'Occurred risk not found'
            };
        }

        // Process update data
        const processedUpdateData = { ...updateData };

        // Handle date conversion
        if (updateData.occurred_date) {
            processedUpdateData.occurred_date = new Date(updateData.occurred_date);
        }

        // Handle ObjectId conversions
        if (updateData.resolve_personId && Types.ObjectId.isValid(updateData.resolve_personId)) {
            processedUpdateData.resolve_personId = new Types.ObjectId(updateData.resolve_personId);
        }

        if (updateData.update_personId && Types.ObjectId.isValid(updateData.update_personId)) {
            processedUpdateData.update_personId = new Types.ObjectId(updateData.update_personId);
        }

        // Update fields
        Object.keys(processedUpdateData).forEach(key => {
            occurredRisk[key] = processedUpdateData[key];
        });

        await risk.save();

        // Populate and return
        await risk.populate([
            { path: 'departmentId', select: 'name description' },
        ]);

        return {
            success: true,
            data: risk,
            message: 'Occurred risk updated successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to update occurred risk');
    }
};

/**
 * Remove an occurred risk
 * @param {string} eventId - Event ID
 * @param {string} riskId - Risk ID
 * @param {string} occurredRiskId - Occurred risk ID
 * @returns {Promise<Object>} Updated risk
 */
export const removeOccurredRisk = async (eventId, riskId, occurredRiskId) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const riskIdError = validateObjectId(riskId, 'risk ID');
        if (riskIdError) return riskIdError;

        const occurredRiskIdError = validateObjectId(occurredRiskId, 'occurred risk ID');
        if (occurredRiskIdError) return occurredRiskIdError;

        const risk = await Risk.findOne({
            _id: new Types.ObjectId(riskId),
            eventId: new Types.ObjectId(eventId)
        });

        if (!risk) {
            return {
                success: false,
                message: 'Risk not found'
            };
        }

        // Check if occurred risk exists
        const occurredRisk = risk.occurred_risk.id(occurredRiskId);
        if (!occurredRisk) {
            return {
                success: false,
                message: 'Occurred risk not found'
            };
        }

        // Remove the occurred risk
        risk.occurred_risk.pull(occurredRiskId);
        await risk.save();

        return {
            success: true,
            data: risk,
            message: 'Occurred risk removed successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to remove occurred risk');
    }
};


/**
 * Get risks by department
 * @param {string} eventId - Event ID
 * @param {string} departmentId - Department ID
 * @returns {Promise<Object>} Department risks
 */
export const getRisksByDepartment = async (eventId, departmentId) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        const departmentIdError = validateObjectId(departmentId, 'department ID');
        if (departmentIdError) return departmentIdError;

        const risks = await Risk.find({
            eventId: new Types.ObjectId(eventId),
            departmentId: new Types.ObjectId(departmentId)
        })
            .populate('departmentId', 'name description')
            .sort({ impact: -1, likelihood: -1, createdAt: -1 })
            .lean();

        return {
            success: true,
            data: risks,
            total: risks.length,
            message: 'Department risks retrieved successfully'
        };
    } catch (error) {
        return handleError(error, 'Failed to get department risks');
    }
};


/**
 * Bulk update risk statuses
 * @param {string} eventId - Event ID
 * @param {Array} riskIds - Array of risk IDs
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
export const bulkUpdateRiskStatus = async (eventId, riskIds, status) => {
    try {
        // Validate input
        const eventIdError = validateObjectId(eventId, 'event ID');
        if (eventIdError) return eventIdError;

        if (!Array.isArray(riskIds) || riskIds.length === 0) {
            return {
                success: false,
                message: 'Risk IDs array is required and cannot be empty'
            };
        }

        // Validate all risk IDs
        const invalidIds = riskIds.filter(id => !Types.ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            return {
                success: false,
                message: `Invalid risk IDs: ${invalidIds.join(', ')}`
            };
        }

        // Validate status
        const validStatuses = ['not_yet', 'resolved', 'resolving'];
        if (!validStatuses.includes(status)) {
            return {
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            };
        }

        const objectIds = riskIds.map(id => new Types.ObjectId(id));

        const result = await Risk.updateMany(
            {
                _id: { $in: objectIds },
                eventId: new Types.ObjectId(eventId)
            },
            {
                $set: {
                    risk_status: status,
                    updatedAt: new Date()
                }
            }
        );

        return {
            success: true,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount,
                status: status
            },
            message: `${result.modifiedCount} risks updated successfully`
        };
    } catch (error) {
        return handleError(error, 'Failed to bulk update risks');
    }
};

export const getRiskStatistics = async (eventId) => {
    try {
        const risks = await Risk.find({ eventId })
            .populate('departmentId', 'name')
            .lean();

        const categoryLabels = {
            'infrastructure': 'Cơ sở vật chất',
            'mc-guests': 'MC & Khách mời',
            'communication': 'Truyền thông',
            'players': 'Người chơi',
            'staffing': 'Nhân sự',
            'communication_post': 'Tuyến bài',
            'attendees': 'Người tham gia',
            'weather': 'Thời tiết',
            'time': 'Thời gian',
            'timeline': 'Timeline',
            'tickets': 'Vé',
            'collateral': 'Ấn phẩm',
            'game': 'Game',
            'sponsorship': 'Nhà tài trợ',
            'finance': 'Tài chính',
            'transportation': 'Vận chuyển',
            'decor': 'Đồ trang trí',
            'others': 'Khác'
        };

        // 1. % Rủi ro theo danh mục (Pie Chart)
        const riskByCategory = {};
        risks.forEach(risk => {
            const cat = risk.risk_category;
            if (cat && categoryLabels[cat]) {
                riskByCategory[cat] = (riskByCategory[cat] || 0) + 1;
            }
        });

        const riskCategoryChart = Object.keys(riskByCategory).map(key => ({
            label: categoryLabels[key],
            value: riskByCategory[key],
            percentage: ((riskByCategory[key] / risks.length) * 100).toFixed(1)
        }));

        // 2. % Sự cố theo danh mục (Pie Chart)
        const occurredByCategory = {};
        risks.forEach(risk => {
            if (risk.occurred_risk?.length > 0) {
                const cat = risk.risk_category;
                if (cat && categoryLabels[cat]) {
                    occurredByCategory[cat] = (occurredByCategory[cat] || 0) + risk.occurred_risk.length;
                }
            }
        });

        const totalOccurred = Object.values(occurredByCategory).reduce((sum, count) => sum + count, 0);
        const occurredCategoryChart = Object.keys(occurredByCategory).map(key => ({
            label: categoryLabels[key],
            value: occurredByCategory[key],
            percentage: totalOccurred > 0 ? ((occurredByCategory[key] / totalOccurred) * 100).toFixed(1) : 0
        }));

        // 3. Tần suất xảy ra các rủi ro (Horizontal Bar Chart) 
        // Get top risk types based on actual occurred incidents
        const riskFrequency = {};
        risks.forEach(risk => {
            if (risk.occurred_risk?.length > 0) {
                const count = risk.occurred_risk.length;
                if (riskFrequency[risk.name]) {
                    riskFrequency[risk.name] += count;
                } else {
                    riskFrequency[risk.name] = count;
                }
            }
        });

        const riskFrequencyChart = Object.keys(riskFrequency)
            .map(riskName => ({
                label: riskName,
                value: riskFrequency[riskName]
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 risks với nhiều incidents nhất

        // 4. Tần suất xảy ra các rủi ro theo ban (Horizontal Bar Chart)
        const riskByDepartment = {};
        risks.forEach(risk => {
            const dept = risk.departmentId?.name || 'Chưa phân công';
            riskByDepartment[dept] = (riskByDepartment[dept] || 0) + 1;
        });

        const departmentRiskChart = Object.keys(riskByDepartment).map(dept => ({
            label: dept,
            value: riskByDepartment[dept]
        })).sort((a, b) => b.value - a.value);

        // 5. Số lượng sự cố xảy ra theo ban (Stacked Bar Chart)
        const departmentOccurred = {};
        risks.forEach(risk => {
            const dept = risk.departmentId?.name || 'Chưa phân công';
            if (!departmentOccurred[dept]) {
                departmentOccurred[dept] = { predicted: 0, unexpected: 0 };
            }
            
            if (risk.occurred_risk?.length > 0) {
                // Giả sử 70% là predicted, 30% là unexpected
                const total = risk.occurred_risk.length;
                departmentOccurred[dept].predicted += Math.floor(total * 0.7);
                departmentOccurred[dept].unexpected += Math.ceil(total * 0.3);
            }
        });

        const departmentStackedChart = Object.keys(departmentOccurred).map(dept => ({
            name: dept,
            predicted: departmentOccurred[dept].predicted,
            unexpected: departmentOccurred[dept].unexpected,
            total: departmentOccurred[dept].predicted + departmentOccurred[dept].unexpected
        })).sort((a, b) => b.total - a.total);

        // Find risk with most occurred incidents
        let riskWithMostIncidents = null;
        let maxIncidents = 0;
        
        risks.forEach(risk => {
            const incidentCount = risk.occurred_risk?.length || 0;
            if (incidentCount > maxIncidents) {
                maxIncidents = incidentCount;
                riskWithMostIncidents = {
                    name: risk.name,
                    category: categoryLabels[risk.risk_category] || risk.risk_category,
                    department: risk.departmentId?.name || 'Chưa phân công',
                    incidentCount: incidentCount
                };
            }
        });

        return {
            success: true,
            data: {
                // Pie Charts
                riskByCategory: riskCategoryChart,
                occurredByCategory: occurredCategoryChart,
                
                // Horizontal Bar Charts
                riskFrequency: riskFrequencyChart,
                riskByDepartment: departmentRiskChart,
                
                // Stacked Bar Chart
                occurredByDepartment: departmentStackedChart,
                
                // Summary
                summary: {
                    totalRisks: risks.length,
                    totalOccurred: totalOccurred,
                    totalDepartments: Object.keys(riskByDepartment).length,
                    riskWithMostIncidents: riskWithMostIncidents
                }
            }
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'Failed'
        };
    }
};


// Export utility functions as well
export { calculateRiskScore, getRiskCategories, validateObjectId, handleError };