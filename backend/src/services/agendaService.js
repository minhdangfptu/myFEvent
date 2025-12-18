import Agenda from '../models/agenda.js';
import Milestone from '../models/milestone.js';
import Event from '../models/event.js';
import mongoose from 'mongoose';

// Validate role function - COMMENTED OUT
// const validateRole = (userRole) => {
//     const allowedRoles = ['HoOC', 'HoD'];
//     if (!allowedRoles.includes(userRole)) {
//         throw new Error('Chỉ HoOC và HoD mới có quyền thực hiện thao tác này');
//     }
// }

// Validate agenda time constraints
const validateAgendaTime = async (milestoneId, agendaDate) => {
    // Get milestone to find eventId
    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) {
        throw new Error('Milestone không tồn tại');
    }

    // Get event to check time constraints
    const event = await Event.findById(milestone.eventId);
    if (!event) {
        throw new Error('Sự kiện không tồn tại');
    }

    const agendaDateTime = new Date(agendaDate);
    const eventCreatedAt = new Date(event.createdAt);

    // Validate: agenda date must be after event creation time
    if (agendaDateTime < eventCreatedAt) {
        throw new Error('Thời gian agenda phải sau thời gian tạo sự kiện');
    }

    // Calculate 6 months after event end date
    if (event.eventEndDate) {
        const eventEndDate = new Date(event.eventEndDate);
        const sixMonthsAfterEnd = new Date(eventEndDate);
        sixMonthsAfterEnd.setMonth(sixMonthsAfterEnd.getMonth() + 6);

        // Validate: agenda date must be before 6 months after event end date
        if (agendaDateTime > sixMonthsAfterEnd) {
            throw new Error('Thời gian agenda phải trước 6 tháng sau thời gian kết thúc DDAY sự kiện');
        }
    }

    return true;
};

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
            select: 'eventId name isDeleted',
            match: { eventId, isDeleted: false }
        })
        .select('_id')
        .lean();
    if (!agendas || agendas.length === 0) {
        return [];
    }
    // Filter out agendas where milestone was not populated (due to match condition)
    return agendas.filter(agenda => agenda.milestoneId !== null);
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

    // Validate agenda time constraints
    await validateAgendaTime(milestoneId, date);

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

    // Validate agenda time if date is being updated
    if (updates.date) {
        await validateAgendaTime(milestoneId, updates.date);
    }

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

    // Validate agenda item time constraints
    await validateAgendaTime(milestoneId, agendaItem.startTime);
    await validateAgendaTime(milestoneId, agendaItem.endTime);

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

    // Validate agenda item time if startTime or endTime is being updated
    if (updates.startTime) {
        await validateAgendaTime(milestoneId, updates.startTime);
    }
    if (updates.endTime) {
        await validateAgendaTime(milestoneId, updates.endTime);
    }

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



