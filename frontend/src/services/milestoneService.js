import { milestoneApi } from '~/apis/milestoneApi';

const unwrapResponse = (payload) => {
    let current = payload;
    while (
        current &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        (current.data !== undefined || current.result !== undefined)
    ) {
        current = current.data ?? current.result;
    }
    return current;
};

export const milestoneService = {
    listMilestones: async (eventId, params = {}) => {
        const response = await milestoneApi.listMilestonesByEvent(eventId, params);
        return unwrapResponse(response);
    },
    getMilestones: async (eventId, params = {}) => {
        const response = await milestoneApi.listMilestonesByEvent(eventId, params);
        return unwrapResponse(response);
    },
    createMilestone: async (eventId, milestone) => {
        const response = await milestoneApi.createMilestone(eventId, milestone);
        return unwrapResponse(response);
    },
    getMilestoneDetail: async (eventId, milestoneId) => {
        const response = await milestoneApi.getMilestoneDetail(eventId, milestoneId);
        return unwrapResponse(response);
    },
    updateMilestone: async (eventId, milestoneId, milestone) => {
        const response = await milestoneApi.updateMilestone(eventId, milestoneId, milestone);
        return unwrapResponse(response);
    },
    deleteMilestone: async (eventId, milestoneId) => {
        const response = await milestoneApi.deleteMilestone(eventId, milestoneId);
        return unwrapResponse(response);
    }
};