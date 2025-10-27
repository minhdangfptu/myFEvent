import { departmentApi } from '~/apis/departmentApi';

export const departmentService = {
    getDepartments: async (eventId) => {
        const response = await departmentApi.getDepartments(eventId);
        return response.data;
    },
    createDepartment: async (eventId, department) => {
        const response = await departmentApi.createDepartment(eventId, department);
        return response.data;
    },
    updateDepartment: async (eventId, departmentId, department) => {
        const response = await departmentApi.updateDepartment(eventId, departmentId, department);
        return response.data;
    },
    deleteDepartment: async (eventId, departmentId) => {
        const response = await departmentApi.deleteDepartment(eventId, departmentId);
        return response.data;
    },
    assignHoD: async (eventId, departmentId, userId) => {
        const response = await departmentApi.assignHoD(eventId, departmentId, userId);
        return response.data;
    },
    addMemberToDepartment: async (eventId, departmentId, userId) => {
        const response = await departmentApi.addMemberToDepartment(eventId, departmentId, userId);
        return response.data;
    },
    removeMemberFromDepartment: async (eventId, departmentId, userId) => {
        const response = await departmentApi.removeMemberFromDepartment(eventId, departmentId, userId);
        return response.data;
    }
};