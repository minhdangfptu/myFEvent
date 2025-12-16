import axiosClient from './axiosClient';

export const departmentApi = {
  getDepartments: async (eventId, page = 1, limit = 100) => {
    const res = await axiosClient.get(`/api/events/${eventId}/departments`, {
      params: { page, limit }
    });
    return res.data;
  },
  getDepartmentDetail: async (eventId, departmentId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/departments/${departmentId}`);
    return res.data;
  },
  getMembersByDepartment: async (eventId, departmentId) => {
    const res = await axiosClient.get(`/api/events/${eventId}/departments/${departmentId}/members`);
    return res.data;
  },
  createDepartment: async (eventId, data) => {
    const res = await axiosClient.post(`/api/events/${eventId}/departments`, data);
    return res.data;
  },

  // Cập nhật department
  updateDepartment: async (eventId, departmentId, data) => {
    const res = await axiosClient.patch(`/api/events/${eventId}/departments/${departmentId}`, data);
    return res.data;
  },

  // Xóa department
  deleteDepartment: async (eventId, departmentId) => {
    const res = await axiosClient.delete(`/api/events/${eventId}/departments/${departmentId}`);
    return res.data;
  },

  // Gán trưởng ban (Head of Department)
  assignHoD: async (eventId, departmentId, userId) => {
    const res = await axiosClient.patch(
      `/api/events/${eventId}/departments/${departmentId}/assign-hod`,
      { userId }
    );
    return res.data;
  },

  // Thay đổi trưởng ban (Change Head of Department)
  changeHoD: async (eventId, departmentId, newHoDId) => {
    const res = await axiosClient.patch(
      `/api/events/${eventId}/departments/${departmentId}/change-hod`,
      { newHoDId }
    );
    return res.data;
  },

  // Thêm thành viên vào department
  addMemberToDepartment: async (eventId, departmentId, memberId) => {
    const res = await axiosClient.post(
      `/api/events/${eventId}/departments/${departmentId}/members`,
      { memberId }
    );
    return res.data;
  },

  // Xóa thành viên khỏi department
  removeMemberFromDepartment: async (eventId, departmentId, memberId) => {
    const res = await axiosClient.delete(
      `/api/events/${eventId}/departments/${departmentId}/members/${memberId}`
    );
    return res.data;
  }
};


