import axiosClient from "./axiosClient";

/**
 * Get dashboard overview for an event
 * Returns pre-computed stats with 60s cache
 *
 * Response structure:
 * {
 *   data: {
 *     event: { id, name, status, type, startDate, endDate, ... },
 *     stats: {
 *       members: { total, hooc, hod, member },
 *       departments: { total },
 *       milestones: { total, completed, upcoming },
 *       meetings: { upcoming },
 *       budget: { allocated, spent }
 *     },
 *     highlights: {
 *       topDepartments: [{ id, name, progress }],
 *       nextMilestones: [{ _id, name, status, targetDate }],
 *       upcomingMeetings: [{ id, name, startAt, endAt, ... }]
 *     }
 *   },
 *   meta: { cached: boolean, ttl: number }
 * }
 */
export const getDashboardOverview = async (eventId) => {
  try {
    const response = await axiosClient.get(`/api/dashboard/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Dashboard API error:', error);
    throw error;
  }
};

export const dashboardApi = {
  getDashboardOverview
};

export default dashboardApi;
