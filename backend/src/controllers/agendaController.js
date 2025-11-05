import {
    getAgendasByMilestoneId,
    createAgendaDoc,
    updateAgendaDoc,
    getAgendaById,
    deleteAgendaById
} from "../services/agendaService.js";
import { getMilestoneById } from "../services/milestoneService.js";

export const getAgendasByMilestone = async () => {
    try {
        const { milestoneId } = req.params;
        const milestone = await getMilestoneById(milestoneId);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
        const agendas = await getAgendasByMilestoneId(milestoneId);
        return res.status(200).json({ data: agendas });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get agendas' });
    }
}
export const createAgenda = async () => {
    try {
        const { milestoneId } = req.params;
        const milestone = await getMilestoneById(milestoneId);
        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }
        const { startTime, endTime, name, description } = req.body;
        const newAgenda = await createAgendaDoc({
            milestoneId,
            startTime,
            endTime,
            name,
            description
        });
        return res.status(201).json({ data: newAgenda });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create agenda' });
    }
}

export const updateAgenda = async () => {
    try {
        const { agendaId } = req.params;
        const agenda = await getAgendaById(agendaId);
        if (!agenda) {
            return res.status(404).json({ message: 'Agenda not found' });
        }
        const { startTime, endTime, name, description } = req.body;
        if(!startTime || !endTime || !name || !description) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        const updates = {};
        if (startTime !== undefined) updates.startTime = startTime;
        if (endTime !== undefined) updates.endTime = endTime;
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        const updatedAgenda = await updateAgendaDoc(agendaId, updates);
        return res.status(200).json({ data: updatedAgenda });
    }catch (error) {
        res.status(500).json({ message: 'Failed to update agenda' });
    }
}
export const deleteAgenda = async () => {
    try {
        const { agendaId } = req.params;
        const agenda = await getAgendaById(agendaId);
        if (!agenda) {
            return res.status(404).json({ message: 'Agenda not found' });
        }
        await deleteAgendaById(agendaId);
        return res.status(200).json({ message: 'Agenda deleted' });
    }catch (error) {
        res.status(500).json({ message: 'Failed to delete agenda' });
    }
}
