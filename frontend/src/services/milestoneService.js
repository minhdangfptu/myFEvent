import { milestoneApi } from '~/apis/milestoneApi';
export const milestoneService = {
    getMilestones: async (eventId) => {
        const response = await milestoneApi.getMilestones(eventId);
        return response.data;
    },
    createMilestone: async (eventId, milestone) => {
        const response = await milestoneApi.createMilestone(eventId, milestone);
        return response.data;
    },
    getMilestoneDetail: async (eventId, milestoneId) => {
        const response = await milestoneApi.getMilestoneDetail(eventId, milestoneId);
        return response.data;
    },
    updateMilestone: async (eventId, milestoneId, milestone) => {
        const response = await milestoneApi.updateMilestone(eventId, milestoneId, milestone);
        return response.data;
    },
    deleteMilestone: async (eventId, milestoneId) => {
        const response = await milestoneApi.deleteMilestone(eventId, milestoneId);
        return response.data;
    }
};