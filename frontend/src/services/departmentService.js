import { departmentApi } from '~/apis/departmentApi';

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

export const departmentService = {
    getDepartments: async (eventId) => {
        const response = await departmentApi.getDepartments(eventId);
        return unwrapResponse(response);
    },
    getDepartmentDetail: async (eventId, departmentId) => {
        const response = await departmentApi.getDepartmentDetail(eventId, departmentId);
        return unwrapResponse(response);
    },
    getMembersByDepartment: async (eventId, departmentId) => {
        const response = await departmentApi.getMembersByDepartment(eventId, departmentId);
        return unwrapResponse(response);
    },
    createDepartment: async (eventId, department) => {
        const response = await departmentApi.createDepartment(eventId, department);
        return unwrapResponse(response);
    },
    updateDepartment: async (eventId, departmentId, department) => {
        const response = await departmentApi.updateDepartment(eventId, departmentId, department);
        return unwrapResponse(response);
    },
    deleteDepartment: async (eventId, departmentId) => {
        const response = await departmentApi.deleteDepartment(eventId, departmentId);
        return unwrapResponse(response);
    },
    assignHoD: async (eventId, departmentId, userId) => {
        const response = await departmentApi.assignHoD(eventId, departmentId, userId);
        return unwrapResponse(response);
    },
    changeHoD: async (eventId, departmentId, newHoDId) => {
        const response = await departmentApi.changeHoD(eventId, departmentId, newHoDId);
        return unwrapResponse(response);
    },
    addMemberToDepartment: async (eventId, departmentId, memberId) => {
        const response = await departmentApi.addMemberToDepartment(eventId, departmentId, memberId);
        return unwrapResponse(response);
    },
    removeMemberFromDepartment: async (eventId, departmentId, memberId) => {
        const response = await departmentApi.removeMemberFromDepartment(eventId, departmentId, memberId);
        return unwrapResponse(response);
    }
};