import { describe, it, expect, beforeEach, vi } from "vitest";

import * as calendarService from "../../services/calendarService.js";
import * as eventMemberService from "../../services/eventMemberService.js";
import * as notificationService from "../../services/notificationService.js";

import * as controller from "../calendarController.js";

// Mock services
vi.mock("../../services/calendarService.js");
vi.mock("../../services/eventMemberService.js");
vi.mock("../../services/notificationService.js");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("calendarController.sendReminder", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      user: { id: "u1" },
      params: { eventId: "event1", calendarId: "cal1" },
      body: {},
    };

    res = mockRes();

    // requesterMembership mặc định là creator
    eventMemberService.getRequesterMembership.mockResolvedValue({
      _id: "mem1",
    });

    // Calendar MẶC ĐỊNH → phải có eventId KHỚP event
    calendarService.getCalendarById.mockResolvedValue({
      _id: "cal1",
      eventId: "event1",
      createdBy: "mem1",
      name: "Meeting",
      startAt: "2024-01-01",
      participants: [
        { member: "mem1", participateStatus: "confirmed" },
        { member: "mem2", participateStatus: "unconfirmed" },
      ],
    });
  });

  it("[TC01] target invalid → 400", async () => {
    req.body.target = "abc";

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("[TC02] calendar not found → 404", async () => {
    calendarService.getCalendarById.mockResolvedValueOnce(null);
    req.body.target = "all";

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("[TC03] calendar not belong to event → 400", async () => {
    req.body.target = "all";

    // Calendar có eventId sai
    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "wrong",
      createdBy: "mem1",
      participants: [],
    });

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lịch họp không thuộc sự kiện này",
      })
    );
  });

  it("[TC04] requester is not creator → 403", async () => {
    req.body.target = "all";

    eventMemberService.getRequesterMembership.mockResolvedValueOnce({
      _id: "memX", // khác createdBy = mem1
    });

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("[TC05] no participants → 400", async () => {
    req.body.target = "all";

    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "event1", // vẫn thuộc event đúng
      createdBy: "mem1",
      participants: [],
    });

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Không có người tham gia nào",
      })
    );
  });

  it("[TC06] no unconfirmed participants → 400", async () => {
    req.body.target = "unconfirmed";

    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "event1",
      createdBy: "mem1",
      participants: [
        { member: "mem1", participateStatus: "confirmed" },
      ],
    });

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Không có người tham gia nào chưa phản hồi",
      })
    );
  });

  it("[TC07] send reminder successfully → 200", async () => {
    req.body.target = "all";

    await controller.sendReminder(req, res);

    expect(notificationService.notifyMeetingReminder).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("[TC08] service throws error → 500", async () => {
    req.body.target = "all";

    calendarService.getCalendarById.mockRejectedValueOnce(
      new Error("ERR")
    );

    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
