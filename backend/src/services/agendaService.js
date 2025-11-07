import Agenda from '../models/agenda.js';

export const getAgendasByMilestoneId = async (milestoneId) => {
    return await Agenda.find({ milestoneId }).sort({ startTime: 1 }).lean();
}
export const createAgendaDoc = async (payload) => {
    return await Agenda.create(payload);
}
export const updateAgendaDoc = async (agendaId, updates) => {
    return await Agenda.findByIdAndUpdate(
        agendaId,
        { $set: updates },
        { new: true }
    ).lean();
}
export const getAgendaById = async (agendaId) => {
    return await Agenda.findById(agendaId).lean();
}

export const deleteAgendaById = async (agendaId) => {
    return await Agenda.findByIdAndDelete(agendaId);
}

