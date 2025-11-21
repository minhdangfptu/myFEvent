import Agenda from '../models/agenda.js';
import mongoose from 'mongoose';

// Validate role function - COMMENTED OUT
// const validateRole = (userRole) => {
//     const allowedRoles = ['HoOC', 'HoD'];
//     if (!allowedRoles.includes(userRole)) {
//         throw new Error('Chỉ HoOC và HoD mới có quyền thực hiện thao tác này');
//     }
// }

// Lấy agenda theo milestoneId (không cần validate role - chỉ đọc)
export const getAgendaByMilestoneId = async (milestoneId) => {
    const agendaDoc = await Agenda.findOne({ milestoneId }).lean();
    if (!agendaDoc) {
        return null;
    }
    if (agendaDoc.agenda && agendaDoc.agenda.length > 0) {
        agendaDoc.agenda.forEach(dateAgenda => {
            if (dateAgenda.items && dateAgenda.items.length > 0) {
                dateAgenda.items.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            }
        });
        agendaDoc.agenda.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return agendaDoc;
}

export const getAgendaByEvent = async (eventId) => {
    const agendas = await Agenda.find({})
        .populate({
            path: 'milestoneId',
            select: 'eventId name description targetDate status isDeleted',
            match: { eventId }
        })
        .lean();

    if (!agendas || agendas.length === 0) {
        return [];
    }
    if (agendas.agenda && agendas.agenda.length > 0) {
        agendas.agenda.forEach(dateAgenda => {
            if (dateAgenda.items && dateAgenda.items.length > 0) {
                dateAgenda.items.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
            }
        });
        agendas.agenda.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return agendas;
}
export const getNameAgendaWithMilestone = async (eventId) => {
    const agendas = await Agenda.find({})
        .populate({
            path: 'milestoneId',
            select: 'eventId name',
            match: { eventId }
        })
        .select('_id')
        .lean();
    if (!agendas || agendas.length === 0) {
        return [];
    }
    return agendas;
}

// Tạo agenda document mới
export const createAgendaDoc = async (payload) => {
    // validateRole(userRole);
    
    // Check if agenda for this milestone already exists
    const existingAgenda = await Agenda.findOne({ milestoneId: payload.milestoneId });
    
    if (existingAgenda) {
        throw new Error('Agenda for this milestone already exists');
    }
    
    const newAgendaDoc = {
        milestoneId: payload.milestoneId,
        agenda: [] // Start with empty agenda array
    };
    
    return await Agenda.create(newAgendaDoc);
}

// === QUẢN LÝ DATE LEVEL ===

// Thêm một date mới vào agenda
export const addDateToAgenda = async (milestoneId, date) => {
    // validateRole(userRole);
    
    const dateObj = new Date(date);
    const newDateAgenda = {
        _id: new mongoose.Types.ObjectId(),
        date: dateObj,
        items: []
    };
    
    return await Agenda.findOneAndUpdate(
        { milestoneId },
        { $push: { agenda: newDateAgenda } },
        { new: true, upsert: true }
    ).lean();
}

// Update thông tin date trong agenda (by ID)
export const updateDateInAgendaById = async (milestoneId, dateId, updates) => {
    // validateRole(userRole);
    
    return await Agenda.findOneAndUpdate(
        { milestoneId, "agenda._id": dateId },
        { 
            $set: Object.keys(updates).reduce((acc, key) => {
                acc[`agenda.$.${key}`] = updates[key];
                return acc;
            }, {})
        },
        { new: true }
    ).lean();
}

// Xóa một date khỏi agenda (by ID)
export const removeDateFromAgendaById = async (milestoneId, dateId) => {
    // validateRole(userRole);
    
    return await Agenda.findOneAndUpdate(
        { milestoneId },
        { $pull: { agenda: { _id: dateId } } },
        { new: true }
    ).lean();
}

// === QUẢN LÝ ITEM LEVEL ===
// Thêm item vào date bằng dateId
export const addItemToAgendaDateById = async (milestoneId, dateId, agendaItem) => {
    // validateRole(userRole);
    
    const itemWithDuration = {
        _id: new mongoose.Types.ObjectId(),
        ...agendaItem,
        duration: new Date(agendaItem.endTime) - new Date(agendaItem.startTime)
    };
    
    return await Agenda.findOneAndUpdate(
        { milestoneId, "agenda._id": dateId },
        { $push: { "agenda.$.items": itemWithDuration } },
        { new: true }
    ).lean();
}

// Xóa item khỏi agenda (by index)
export const removeItemFromAgenda = async (milestoneId, dateIndex, itemIndex) => {
    // validateRole(userRole);
    
    const agendaDoc = await Agenda.findOne({ milestoneId });
    if (!agendaDoc || 
        !agendaDoc.agenda[dateIndex] || 
        !agendaDoc.agenda[dateIndex].items[itemIndex]) {
        throw new Error('Item not found in agenda');
    }
    
    agendaDoc.agenda[dateIndex].items.splice(itemIndex, 1);
    
    // Nếu date không còn item nào, xóa luôn date đó
    if (agendaDoc.agenda[dateIndex].items.length === 0) {
        agendaDoc.agenda.splice(dateIndex, 1);
    }
    
    await agendaDoc.save();
    return agendaDoc.toObject();
}


// Update một item cụ thể (by index)
export const updateItemInAgenda = async (milestoneId, dateIndex, itemIndex, updates) => {
    // validateRole(userRole);
    
    // Tính duration nếu có update startTime hoặc endTime
    if (updates.startTime || updates.endTime) {
        const agendaDoc = await Agenda.findOne({ milestoneId });
        if (agendaDoc && agendaDoc.agenda[dateIndex] && agendaDoc.agenda[dateIndex].items[itemIndex]) {
            const currentItem = agendaDoc.agenda[dateIndex].items[itemIndex];
            const startTime = updates.startTime ? new Date(updates.startTime) : new Date(currentItem.startTime);
            const endTime = updates.endTime ? new Date(updates.endTime) : new Date(currentItem.endTime);
            updates.duration = endTime - startTime;
        }
    }
    
    const updateFields = {};
    Object.keys(updates).forEach(key => {
        updateFields[`agenda.${dateIndex}.items.${itemIndex}.${key}`] = updates[key];
    });
    
    return await Agenda.findOneAndUpdate(
        { milestoneId },
        { $set: updateFields },
        { new: true }
    ).lean();
}

// Lấy tất cả agenda items được flatten và sort (không cần validate - chỉ đọc)
export const getFlattenedAgendaItemsByMilestoneId = async (milestoneId) => {
    const agendaDoc = await Agenda.findOne({ milestoneId }).lean();
    
    if (!agendaDoc) {
        return [];
    }
    
    const allItems = [];
    agendaDoc.agenda.forEach((dateAgenda, dateIndex) => {
        dateAgenda.items.forEach((item, itemIndex) => {
            allItems.push({
                ...item,
                date: dateAgenda.date,
                dateId: dateAgenda._id,
                milestoneId: agendaDoc.milestoneId,
                agendaId: agendaDoc._id,
                dateIndex,
                itemIndex,
                // For compatibility with old structure
                dayIndex: itemIndex // Keep for backward compatibility if needed
            });
        });
    });
    
    // Sort theo date và startTime
    allItems.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare === 0) {
            return new Date(a.startTime) - new Date(b.startTime);
        }
        return dateCompare;
    });
    
    return allItems;
}

// === UTILITY FUNCTIONS ===

// Tìm date bằng ID  
export const findDateById = async (milestoneId, dateId) => {
    const agendaDoc = await Agenda.findOne({ milestoneId }).lean();
    
    if (!agendaDoc) {
        return null;
    }
    
    const dateIndex = agendaDoc.agenda.findIndex(dateAgenda => 
        dateAgenda._id.toString() === dateId
    );
    
    if (dateIndex >= 0) {
        return {
            dateAgenda: agendaDoc.agenda[dateIndex],
            dateIndex,
            agendaId: agendaDoc._id
        };
    }
    
    return null;
}

// === BATCH OPERATIONS ===
// Batch thêm nhiều items vào date bằng dateId
export const batchCreateItemsForDateById = async (milestoneId, dateId, itemsArray) => {
    // validateRole(userRole);
    
    const itemsWithDuration = itemsArray.map(item => ({
        _id: new mongoose.Types.ObjectId(),
        ...item,
        duration: new Date(item.endTime) - new Date(item.startTime)
    }));
    
    return await Agenda.findOneAndUpdate(
        { milestoneId, "agenda._id": dateId },
        { $push: { "agenda.$.items": { $each: itemsWithDuration } } },
        { new: true }
    ).lean();
}

// Batch update nhiều items (by index)
export const batchUpdateItems = async (milestoneId, itemUpdates) => {
    // validateRole(userRole);
    
    const updateFields = {};
    itemUpdates.forEach(({ dateIndex, itemIndex, updates }) => {
        // Tính duration nếu cần
        if (updates.startTime && updates.endTime) {
            updates.duration = new Date(updates.endTime) - new Date(updates.startTime);
        }
        
        Object.keys(updates).forEach(key => {
            updateFields[`agenda.${dateIndex}.items.${itemIndex}.${key}`] = updates[key];
        });
    });
    
    return await Agenda.findOneAndUpdate(
        { milestoneId },
        { $set: updateFields },
        { new: true }
    ).lean();
}

// Batch xóa nhiều items (by index)
export const batchRemoveItems = async (milestoneId, itemsToRemove) => {
    // validateRole(userRole);
    
    const agendaDoc = await Agenda.findOne({ milestoneId });
    if (!agendaDoc) {
        throw new Error('Agenda not found');
    }
    
    // Group by dateIndex và sort itemIndex giảm dần để xóa từ cuối
    const groupedByDate = {};
    itemsToRemove.forEach(({ dateIndex, itemIndex }) => {
        if (!groupedByDate[dateIndex]) {
            groupedByDate[dateIndex] = [];
        }
        groupedByDate[dateIndex].push(itemIndex);
    });
    
    // Xóa items và dates rỗng
    const datesToRemove = [];
    Object.keys(groupedByDate).forEach(dateIndexStr => {
        const dateIndex = parseInt(dateIndexStr);
        const itemIndexes = groupedByDate[dateIndex].sort((a, b) => b - a); // Giảm dần
        
        if (agendaDoc.agenda[dateIndex]) {
            itemIndexes.forEach(itemIndex => {
                if (agendaDoc.agenda[dateIndex].items[itemIndex]) {
                    agendaDoc.agenda[dateIndex].items.splice(itemIndex, 1);
                }
            });
            
            // Đánh dấu date để xóa nếu không còn items
            if (agendaDoc.agenda[dateIndex].items.length === 0) {
                datesToRemove.push(dateIndex);
            }
        }
    });
    
    // Xóa dates rỗng (từ cuối để tránh thay đổi index)
    datesToRemove.sort((a, b) => b - a).forEach(dateIndex => {
        agendaDoc.agenda.splice(dateIndex, 1);
    });
    
    await agendaDoc.save();
    return agendaDoc.toObject();
}


