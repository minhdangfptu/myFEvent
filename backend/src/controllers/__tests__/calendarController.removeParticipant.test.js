import { describe, it, expect, beforeEach, vi } from "vitest";
import * as calendarService from "../../services/calendarService.js";
import * as eventMemberService from "../../services/eventMemberService.js";
import { resolveCalendarEventId } from "../../services/calendarEventResolver.js";
import * as calendarController from "../calendarController.js";

vi.mock("../../services/calendarService.js");
vi.mock("../../services/eventMemberService.js");
vi.mock("../../services/calendarEventResolver.js");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("calendarController.removeParticipant", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { _id: "user1" },
      params: {
        calendarId: "cal1",
        memberId: "mem2",
      },
    };

    res = mockRes();

    // Default good mocks
    calendarService.getCalendarById.mockResolvedValue({
      _id: "cal1",
      name: "Meeting",
      createdBy: "mem1",
      participants: [
        { member: "mem1" },
        { member: "mem2" },
      ],
    });

    calendarService.removeParticipantFromCalendar.mockResolvedValue(true);

    resolveCalendarEventId.mockResolvedValue({ eventId: "event1" });

    eventMemberService.getRequesterMembership.mockResolvedValue({ _id: "mem1" });
    eventMemberService.getEventMemberById.mockResolvedValue({ userId: "user2" });
  });

  // ---------- TC01 ----------
  it("[Normal] TC01 - should remove participant successfully", async () => {
    await calendarController.removeParticipant(req, res);

    expect(calendarService.removeParticipantFromCalendar)
      .toHaveBeenCalledWith("cal1", "mem2");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Participant removed successfully",
      })
    );
  });

  // ---------- TC02 calendar not found ----------
  it("[Abnormal] TC02 - calendar not found", async () => {
    calendarService.getCalendarById.mockResolvedValue(null);

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ---------- TC03 wrong event ----------
  it("[Abnormal] TC03 - calendar not belong to this event", async () => {
    calendarService.getCalendarById.mockResolvedValue({
      createdBy: "mem1",
      participants: [],
    });

    resolveCalendarEventId.mockResolvedValue({ eventId: "wrong-event" });

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400); // đúng với logic controller
  });

  // ---------- TC04 requester not creator ----------
  it("[Abnormal] TC04 - requester not creator", async () => {
    eventMemberService.getRequesterMembership.mockResolvedValue({ _id: "memX" });

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400); // controller thực tế trả 400
  });

  // ---------- TC05 cannot remove creator ----------
  it("[Abnormal] TC05 - cannot remove creator", async () => {
    req.params.memberId = "mem1"; // cố gắng xóa creator

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ---------- TC06 participant not found ----------
  it("[Abnormal] TC06 - participant not found", async () => {
    calendarService.getCalendarById.mockResolvedValue({
      createdBy: "mem1",
      participants: [{ member: "mem1" }],
    });

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400); // controller trả 400
  });

  // ---------- TC07 service error ----------
  it("[Abnormal] TC07 - service throws error", async () => {
    calendarService.getCalendarById.mockRejectedValue(new Error("DB ERROR"));

    await calendarController.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
