import * as agendaService from '../services/agendaService.js';
import { validationResult } from 'express-validator';

// Utility function để handle validation errors
const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    return null;
};

// === READ OPERATIONS ===

// Lấy agenda theo milestoneId
export const getAgendasByMilestone = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        
        const agendaDoc = await agendaService.getAgendaByMilestoneId(milestoneId);
        
        res.status(200).json({
            success: true,
            data: agendaDoc,
            message: 'Agenda retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve agenda',
            error: error.message
        });
    }
};

// Lấy flattened agenda items
export const getFlattenedAgendaItems = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        
        const items = await agendaService.getFlattenedAgendaItemsByMilestoneId(milestoneId);
        
        res.status(200).json({
            success: true,
            data: items,
            message: 'Flattened agenda items retrieved successfully',
            count: items.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve agenda items',
            error: error.message
        });
    }
};

// === WRITE OPERATIONS ===

// Tạo agenda document mới
export const createAgenda = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        
        const payload = {
            milestoneId,
            ...req.body
        };
        
        const agenda = await agendaService.createAgendaDoc(payload);
        
        res.status(201).json({
            success: true,
            data: agenda,
            message: 'Agenda created successfully'
        });
    } catch (error) {
        const statusCode = error.message.includes('already exists') ? 409 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to create agenda',
            error: error.message
        });
    }
};

// === DATE MANAGEMENT ===

// Thêm date mới vào agenda
export const addDateToAgenda = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        const { date } = req.body;
        
        const agenda = await agendaService.addDateToAgenda(milestoneId, date);
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Date added successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to add date',
            error: error.message
        });
    }
};

// Update date trong agenda (by ID)
export const updateDateById = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId, dateId } = req.params;
        const updates = req.body;
        
        const agenda = await agendaService.updateDateInAgendaById(milestoneId, dateId, updates);
        
        if (!agenda) {
            return res.status(404).json({
                success: false,
                message: 'Date not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Date updated successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update date',
            error: error.message
        });
    }
};

// Xóa date từ agenda (by ID)
export const removeDateById = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId, dateId } = req.params;
        
        const agenda = await agendaService.removeDateFromAgendaById(milestoneId, dateId);
        
        if (!agenda) {
            return res.status(404).json({
                success: false,
                message: 'Date not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Date removed successfully'
        });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to remove date',
            error: error.message
        });
    }
};

// === ITEM MANAGEMENT (ID-based) ===

// Thêm item vào date (by dateId)
export const addItemToDateById = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId, dateId } = req.params;
        const itemData = req.body;
        
        const agenda = await agendaService.addItemToAgendaDateById(milestoneId, dateId, itemData);
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Item added successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to add item',
            error: error.message
        });
    }
};

// === ITEM MANAGEMENT (Index-based - for backward compatibility) ===

// Update item trong agenda (by index)
export const updateDayItem = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        const { dateIndex, itemIndex, updates } = req.body;
        
        if (dateIndex === undefined || itemIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'dateIndex and itemIndex are required'
            });
        }
        
        const agenda = await agendaService.updateItemInAgenda(
            milestoneId,
            dateIndex,
            itemIndex,
            updates
        );
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Item updated successfully'
        });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to update item',
            error: error.message
        });
    }
};

// Xóa item khỏi agenda (by index)
export const removeDayItem = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        const { dateIndex, itemIndex } = req.body;
        
        if (dateIndex === undefined || itemIndex === undefined) {
            return res.status(400).json({
                success: false,
                message: 'dateIndex and itemIndex are required'
            });
        }
        
        const agenda = await agendaService.removeItemFromAgenda(
            milestoneId,
            dateIndex,
            itemIndex
        );
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: 'Item removed successfully'
        });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to remove item',
            error: error.message
        });
    }
};

// === BATCH OPERATIONS ===

// Batch tạo items cho một date (by dateId)
export const batchCreateItemsForDateById = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId, dateId } = req.params;
        const { items } = req.body;
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'items must be a non-empty array'
            });
        }
        
        const agenda = await agendaService.batchCreateItemsForDateById(
            milestoneId,
            dateId,
            items
        );
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: `${items.length} items created successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to batch create items',
            error: error.message
        });
    }
};

// Batch update items (by index)
export const batchUpdateItems = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        const { itemUpdates } = req.body;
        
        if (!Array.isArray(itemUpdates) || itemUpdates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'itemUpdates must be a non-empty array'
            });
        }
        
        const agenda = await agendaService.batchUpdateItems(milestoneId, itemUpdates);
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: `${itemUpdates.length} items updated successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to batch update items',
            error: error.message
        });
    }
};

// Batch xóa items (by index)
export const batchRemoveItems = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId } = req.params;
        const { itemsToRemove } = req.body;
        
        if (!Array.isArray(itemsToRemove) || itemsToRemove.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'itemsToRemove must be a non-empty array'
            });
        }
        
        const agenda = await agendaService.batchRemoveItems(milestoneId, itemsToRemove);
        
        res.status(200).json({
            success: true,
            data: agenda,
            message: `${itemsToRemove.length} items removed successfully`
        });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            message: 'Failed to batch remove items',
            error: error.message
        });
    }
};

// === UTILITY ENDPOINTS ===

// Tìm date bằng ID
export const findDateById = async (req, res) => {
    try {
        const validationError = handleValidationErrors(req, res);
        if (validationError) return validationError;

        const { milestoneId, dateId } = req.params;
        
        const dateInfo = await agendaService.findDateById(milestoneId, dateId);
        
        if (!dateInfo) {
            return res.status(404).json({
                success: false,
                message: 'Date not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: dateInfo,
            message: 'Date found successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to find date',
            error: error.message
        });
    }
};