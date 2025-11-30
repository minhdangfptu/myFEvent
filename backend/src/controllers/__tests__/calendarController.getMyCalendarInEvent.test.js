import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// ==== MOCK SERVICES ==== //
vi.mock("../../services/eventService.js", () => ({
  findEventById: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
  getRequesterMembership: vi.fn(),
}));

vi.mock("../../services/calendarService.js", () => ({
  getCalendarsInEventScope: vi.fn(),
  getCalendarByEventId: vi.fn(),
}));

// Tránh dính cloudinary như các file trước
vi.mock("../../services/cloudinaryService.js", () => ({
  __esModule: true,
  uploadImageIfNeeded: vi.fn(),
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

// ==== MOCK RES ==== //
const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

// ==== TESTS ==== //
describe("calendarController.getMyCalendarInEvent", () => {
  it("[Normal] TC01 - should return my calendars in event", async () => {
    const { findEventById } = await import("../../services/eventService.js");
    const { getRequesterMembership } = await import("../../services/eventMemberService.js");
    const {
      getCalendarsInEventScope,
      getCalendarByEventId,
    } = await import("../../services/calendarService.js");

    const userId = "user1";
    const membershipId = "mem1";
    const eventId = "event1";

    // Event tồn tại
    findEventById.mockResolvedValue({ _id: eventId });

    // User là member của event
    getRequesterMembership.mockResolvedValue({
      _id: membershipId,
      userId,
      role: "Member",
    });

    // Trả về 2 calendar, chỉ 1 cái chứa member này
    getCalendarsInEventScope.mockResolvedValue([
      {
        _id: "cal1",
        participants: [
          { member: { _id: membershipId } }, // mình ở trong đây
        ],
      },
      {
        _id: "cal2",
        participants: [
          { member: { _id: "other" } },
        ],
      },
    ]);

    // Fallback không dùng tới nhưng mock cho chắc
    getCalendarByEventId.mockResolvedValue([]);

    const req = {
      params: { eventId },
      user: { id: userId },
      query: {
        month: "5",
        year: "2025",
      },
    };
    const res = mockRes();

    await calendarController.getMyCalendarInEvent(req, res);

    expect(findEventById).toHaveBeenCalledWith(eventId);
    expect(getRequesterMembership).toHaveBeenCalledWith(eventId, userId);
    expect(getCalendarsInEventScope).toHaveBeenCalledWith(
      eventId,
      expect.any(Date),
      expect.any(Date)
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ _id: "cal1" }),
        ]),
      })
    );
    // đảm bảo chỉ có 1 calendar được trả về
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data).toHaveLength(1);
  });

  it("[Abnormal] TC02 - should return 403 when userId is missing", async () => {
    const req = {
      params: { eventId: "event1" },
      user: null,
      query: {},
    };
    const res = mockRes();

    await calendarController.getMyCalendarInEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Infficient permissions",
      })
    );
  });

  it("[Abnormal] TC03 - should return 404 when event not found", async () => {
    const { findEventById } = await import("../../services/eventService.js");

    findEventById.mockResolvedValue(null);

    const req = {
      params: { eventId: "eventX" },
      user: { id: "u1" },
      query: {},
    };
    const res = mockRes();

    await calendarController.getMyCalendarInEvent(req, res);

    expect(findEventById).toHaveBeenCalledWith("eventX");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Event not found",
      })
    );
  });

  it("[Abnormal] TC04 - should return 403 when user is not a member of event", async () => {
    const { findEventById } = await import("../../services/eventService.js");
    const { getRequesterMembership } = await import("../../services/eventMemberService.js");

    findEventById.mockResolvedValue({ _id: "event1" });
    getRequesterMembership.mockResolvedValue(null); // không phải member

    const req = {
      params: { eventId: "event1" },
      user: { id: "u1" },
      query: {},
    };
    const res = mockRes();

    await calendarController.getMyCalendarInEvent(req, res);

    expect(getRequesterMembership).toHaveBeenCalledWith("event1", "u1");
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You are not a member of this event",
      })
    );
  });

  it("[Abnormal] TC05 - should return 500 on unexpected error", async () => {
    const { findEventById } = await import("../../services/eventService.js");

    // quăng lỗi luôn
    findEventById.mockRejectedValue(new Error("DB ERROR"));

    const req = {
      params: { eventId: "event1" },
      user: { id: "u1" },
      query: {},
    };
    const res = mockRes();

    await calendarController.getMyCalendarInEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to load calendar",
      })
    );
  });
});
