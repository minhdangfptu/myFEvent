// calendarController.updateCalendarForEvent.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// ==== MOCK DEPENDENCIES ==== //
vi.mock("../../services/calendarService.js", () => ({
  getCalendarById: vi.fn(),
  updateCalendar: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
  getRequesterMembership: vi.fn(),
  getMembersByEventRaw: vi.fn(),
  getMembersByDepartmentRaw: vi.fn(),
  getEventMemberById: vi.fn(),
  getActiveEventMembers: vi.fn(),
}));

vi.mock("../../services/departmentService.js", () => ({
  findDepartmentById: vi.fn(),
}));

vi.mock("../../services/notificationService.js", () => ({
  notifyMeetingReminder: vi.fn(),
  notifyRemovedFromCalendar: vi.fn(),
  notifyAddedToCalendar: vi.fn(),
  notifyCalendarUpdated: vi.fn(),
}));

// tránh lỗi cloudinary giống các file khác
vi.mock("../../services/cloudinaryService.js", () => ({
  __esModule: true,
  uploadImageIfNeeded: vi.fn(async (image) => image),
}));

// ==== MOCK RES ==== //
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

// ==== BEGIN TESTS ==== //

describe("calendarController.updateCalendarForEvent", () => {
  it('[Normal] TC01 - should update event calendar successfully by HoOC', async () => {
    const { getCalendarById, updateCalendar } = await import(
      "../../services/calendarService.js"
    );
    const { getRequesterMembership } = await import(
      "../../services/eventMemberService.js"
    );
    const { notifyCalendarUpdated } = await import(
      "../../services/notificationService.js"
    );

    const calendarId = "cal1";
    const eventId = "event1";

    // calendar ban đầu (trước update)
    const originalCalendar = {
      _id: calendarId,
      eventId,
      departmentId: null,
      name: "Old name",
      startAt: new Date("2025-01-01T10:00:00.000Z"),
      endAt: new Date("2025-01-01T11:00:00.000Z"),
      participants: [
        {
          member: {
            _id: "mem2",
            userId: { _id: "user2" },
          },
          participateStatus: "unconfirmed",
        },
      ],
      createdBy: "mem1",
    };

    // calendar sau update (getCalendarById lần 2)
    const updatedCalendar = {
      ...originalCalendar,
      name: "Updated name",
      startAt: new Date("2025-01-02T10:00:00.000Z"),
      endAt: new Date("2025-01-02T11:00:00.000Z"),
    };

    // getCalendarById được gọi 2 lần
    getCalendarById
      .mockResolvedValueOnce(originalCalendar)
      .mockResolvedValueOnce(updatedCalendar);

    // requester là HoOC trong event
    getRequesterMembership.mockResolvedValue({
      _id: "mem1",
      role: "HoOC",
    });

    updateCalendar.mockResolvedValue(updatedCalendar);
    notifyCalendarUpdated.mockResolvedValue(1);

    const req = {
      params: { calendarId },
      user: { id: "user1" },
      body: {
        updateData: {
          name: "Updated name",
          startAt: "2025-01-02T10:00:00.000Z",
          endAt: "2025-01-02T11:00:00.000Z",
          locationType: "online",
          location: "Zoom",
        },
      },
    };
    const res = mockRes();

    await calendarController.updateCalendarForEvent(req, res);

    expect(getCalendarById).toHaveBeenCalledTimes(2);
    expect(getCalendarById).toHaveBeenCalledWith(calendarId);
    expect(getRequesterMembership).toHaveBeenCalledWith(eventId, "user1");
    expect(updateCalendar).toHaveBeenCalledWith(
      calendarId,
      expect.objectContaining({
        name: "Updated name",
        locationType: "online",
        location: "Zoom",
      })
    );
    expect(notifyCalendarUpdated).toHaveBeenCalledWith(
      eventId,
      calendarId,
      updatedCalendar.participants,
      "Updated name"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ _id: calendarId }),
      })
    );
  });

  it("[Abnormal] TC02 - should return 404 when calendar not found", async () => {
    const { getCalendarById } = await import(
      "../../services/calendarService.js"
    );

    getCalendarById.mockResolvedValue(null);

    const req = {
      params: { calendarId: "calX" },
      user: { id: "u1" },
      body: { updateData: {} },
    };
    const res = mockRes();

    await calendarController.updateCalendarForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Calendar not found" })
    );
  });

  it("[Abnormal] TC03 - should return 403 when requester is not HoOC for event calendar", async () => {
    const { getCalendarById } = await import(
      "../../services/calendarService.js"
    );
    const { getRequesterMembership } = await import(
      "../../services/eventMemberService.js"
    );

    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      departmentId: null,
    });

    getRequesterMembership.mockResolvedValue({
      _id: "mem1",
      role: "Member", // không phải HoOC
    });

    const req = {
      params: { calendarId: "cal1" },
      user: { id: "u1" },
      body: { updateData: {} },
    };
    const res = mockRes();

    await calendarController.updateCalendarForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Only HoOC can update calendar for event!",
      })
    );
  });

  it("[Abnormal] TC04 - should return 400 when updateData is missing or not object", async () => {
    const { getCalendarById } = await import(
      "../../services/calendarService.js"
    );
    const { getRequesterMembership } = await import(
      "../../services/eventMemberService.js"
    );

    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      departmentId: null,
    });

    getRequesterMembership.mockResolvedValue({
      _id: "mem1",
      role: "HoOC",
    });

    const badReqCases = [
      { updateData: null },
      { updateData: "string" },
      { }, // không có updateData
    ];

    for (const body of badReqCases) {
      const req = {
        params: { calendarId: "cal1" },
        user: { id: "u1" },
        body,
      };
      const res = mockRes();

      await calendarController.updateCalendarForEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "updateData must be provided" })
      );
    }
  });

  it("[Abnormal] TC05 - should return 400 when date range is invalid", async () => {
    const { getCalendarById } = await import(
      "../../services/calendarService.js"
    );
    const { getRequesterMembership } = await import(
      "../../services/eventMemberService.js"
    );

    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      departmentId: null,
    });

    getRequesterMembership.mockResolvedValue({
      _id: "mem1",
      role: "HoOC",
    });

    const req = {
      params: { calendarId: "cal1" },
      user: { id: "u1" },
      body: {
        updateData: {
          startAt: "2025-01-02T10:00:00.000Z",
          endAt: "2025-01-02T09:00:00.000Z", // end < start
        },
      },
    };
    const res = mockRes();

    await calendarController.updateCalendarForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "endAt must be after startAt" })
    );
  });

  it('[Abnormal] TC06 - should return 400 when locationType is invalid', async () => {
    const { getCalendarById } = await import(
      "../../services/calendarService.js"
    );
    const { getRequesterMembership } = await import(
      "../../services/eventMemberService.js"
    );

    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      departmentId: null,
    });

    getRequesterMembership.mockResolvedValue({
      _id: "mem1",
      role: "HoOC",
    });

    const req = {
      params: { calendarId: "cal1" },
      user: { id: "u1" },
      body: {
        updateData: {
          locationType: "invalid-type",
        },
      },
    };
    const res = mockRes();

    await calendarController.updateCalendarForEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'locationType must be either "online" or "offline"',
      })
    );
  });
});
