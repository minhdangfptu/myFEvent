import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cloudinaryService để tránh lỗi import
vi.mock("../../services/cloudinaryService.js", () => ({
  uploadToCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

// Mock services
vi.mock("../../services/calendarService.js", () => ({
  getCalendarById: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
  getRequesterMembership: vi.fn(),
  getActiveEventMembers: vi.fn(),
}));

vi.mock("../../services/departmentService.js", () => ({
  findDepartmentById: vi.fn(),
}));

vi.mock("../../services/notificationService.js", () => ({}));

vi.mock("../../models/eventMember.js", () => ({
  __esModule: true,
  default: {},
}));

// Import controller SAU khi mock xong
import * as calendarController from "../calendarController.js";

// Helper Response mock
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calendarController.getAvailableMembers", () => {
  it("[Normal] TC01 - should return available members", async () => {
    const { getCalendarById } = await import("../../services/calendarService.js");
    const { getRequesterMembership, getActiveEventMembers } =
      await import("../../services/eventMemberService.js");

    // Calendar thuộc event trực tiếp (eventId), creator = m1
    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      createdBy: "m1",
      participants: [
        { member: { _id: "m1" } },
        { member: { _id: "m2" } },
      ],
    });

    // requesterMembership là m1 (creator)
    getRequesterMembership.mockResolvedValue({
      _id: "m1",
      role: "HoOC",
    });

    // Active members trong event
    getActiveEventMembers.mockResolvedValue([
      { _id: "m1" },
      { _id: "m2" },
      { _id: "m3" }, // chỉ m3 chưa trong participants
    ]);

    const req = {
      params: { eventId: "event1", calendarId: "cal1" },
      user: { id: "u1" },
    };
    const res = mockRes();

    await calendarController.getAvailableMembers(req, res);

    expect(getCalendarById).toHaveBeenCalledWith("cal1");
    expect(getRequesterMembership).toHaveBeenCalledWith("event1", "u1");
    expect(getActiveEventMembers).toHaveBeenCalledWith("event1");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Successfully get available members",
        data: [expect.objectContaining({ _id: "m3" })],
      })
    );
  });

  it("[Abnormal] TC02 - calendar not found", async () => {
    const { getCalendarById } = await import("../../services/calendarService.js");

    getCalendarById.mockResolvedValue(null);

    const req = {
      params: { eventId: "event1", calendarId: "calX" },
      user: { id: "u1" },
    };
    const res = mockRes();

    await calendarController.getAvailableMembers(req, res);

    expect(getCalendarById).toHaveBeenCalledWith("calX");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Calendar not found" })
    );
  });

  it("[Abnormal] TC03 - calendar not belong to event", async () => {
    const { getCalendarById } = await import("../../services/calendarService.js");

    // Calendar thuộc event khác (event999)
    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event999",
      createdBy: "m1",
      participants: [],
    });

    const req = {
      params: { eventId: "event1", calendarId: "cal1" },
      user: { id: "u1" },
    };
    const res = mockRes();

    await calendarController.getAvailableMembers(req, res);

    expect(getCalendarById).toHaveBeenCalledWith("cal1");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Calendar does not belong to this event" })
    );
  });

  it("[Abnormal] TC04 - requester not creator", async () => {
    const { getCalendarById } = await import("../../services/calendarService.js");
    const { getRequesterMembership } = await import("../../services/eventMemberService.js");

    getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      createdBy: "m999", // creator là m999
      participants: [],
    });

    // requesterMembership là m1 ≠ m999
    getRequesterMembership.mockResolvedValue({
      _id: "m1",
      role: "HoOC",
    });

    const req = {
      params: { eventId: "event1", calendarId: "cal1" },
      user: { id: "u1" },
    };
    const res = mockRes();

    await calendarController.getAvailableMembers(req, res);

    expect(getCalendarById).toHaveBeenCalledWith("cal1");
    expect(getRequesterMembership).toHaveBeenCalledWith("event1", "u1");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Infficient permissions" })
    );
  });

  it("[Abnormal] TC05 - service throws error", async () => {
    const { getCalendarById } = await import("../../services/calendarService.js");

    getCalendarById.mockRejectedValue(new Error("DB ERROR"));

    const req = {
      params: { eventId: "event1", calendarId: "cal1" },
      user: { id: "u1" },
    };
    const res = mockRes();

    await calendarController.getAvailableMembers(req, res);

    expect(getCalendarById).toHaveBeenCalledWith("cal1");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to get available members" })
    );
  });
});
