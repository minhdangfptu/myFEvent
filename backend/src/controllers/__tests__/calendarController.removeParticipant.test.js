import { describe, it, expect, beforeEach, vi } from "vitest";

import * as calendarService from "../../services/calendarService.js";
import * as eventMemberService from "../../services/eventMemberService.js";
import * as notificationService from "../../services/notificationService.js";
import * as controller from "../calendarController.js";

vi.mock("../../services/calendarService.js");
vi.mock("../../services/eventMemberService.js");
vi.mock("../../services/notificationService.js");

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
      user: { id: "u1" },
      params: { eventId: "event1", calendarId: "cal1", memberId: "mem2" },
    };

    res = mockRes();

    // FIX QUAN TRỌNG:
    const spy = vi.spyOn(controller, "resolveCalendarEventId");
    spy.mockResolvedValueOnce({ eventId: "event1" });   // dùng cho TC01
    spy.mockResolvedValue({ eventId: "event1" });       // fallback mặc định cho TC02–TC07

    eventMemberService.getRequesterMembership.mockResolvedValue({ _id: "mem1" });
    eventMemberService.getEventMemberById.mockResolvedValue({
      _id: "mem2",
      userId: "u2",
    });
    calendarService.removeParticipantFromCalendar.mockResolvedValue(true);
  });


  // -------------------------------------------------------
  it("[TC01] remove successfully", async () => {
    // Lần 1: lấy calendar ban đầu
    calendarService.getCalendarById
      .mockResolvedValueOnce({
        _id: "cal1",
        eventId: "event1",
        createdBy: "mem1",
        name: "Meeting",
        participants: [{ member: "mem1" }, { member: "mem2" }],
      })
      // Lần 2: lấy calendar sau khi đã remove
      .mockResolvedValueOnce({
        _id: "cal1",
        eventId: "event1",
        createdBy: "mem1",
        name: "Meeting",
        participants: [{ member: "mem1" }],
      });

    await controller.removeParticipant(req, res);

    expect(calendarService.removeParticipantFromCalendar)
      .toHaveBeenCalledWith("cal1", "mem2");

    expect(notificationService.notifyRemovedFromCalendar)
      .toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Đã xóa người tham gia" })
    );
  });

  // -------------------------------------------------------
  it("[TC02] calendar not found", async () => {
    calendarService.getCalendarById.mockResolvedValueOnce(null);

    await controller.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Không tìm thấy lịch họp" })
    );
  });

  // -------------------------------------------------------
  it("[TC03] calendar not belong to event", async () => {
  calendarService.getCalendarById.mockResolvedValueOnce({
    _id: "cal1",
    eventId: "wrong",   
    createdBy: "mem1",
    participants: [{ member: "mem1" }],
  });

  await controller.removeParticipant(req, res);

  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      message: "Lịch họp không thuộc sự kiện này",
    })
  );
  });


  // -------------------------------------------------------
  it("[TC04] requester not creator", async () => {
    // Quyền sai
    eventMemberService.getRequesterMembership.mockResolvedValueOnce({
      _id: "memX",
    });

    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "event1",
      createdBy: "mem1",
      participants: [{ member: "mem1" }],
    });

    await controller.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Bạn không có quyền xóa người tham gia",
      })
    );
  });

  // -------------------------------------------------------
  it("[TC05] cannot remove creator", async () => {
    req.params.memberId = "mem1";

    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "event1",
      createdBy: "mem1",
      participants: [{ member: "mem1" }],
    });

    await controller.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Không thể xóa người tạo cuộc họp",
      })
    );
  });

  // -------------------------------------------------------
  it("[TC06] participant not found", async () => {
    calendarService.getCalendarById.mockResolvedValueOnce({
      _id: "cal1",
      eventId: "event1",
      createdBy: "mem1",
      participants: [{ member: "mem1" }],
    });

    await controller.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Không tìm thấy người tham gia trong lịch họp",
      })
    );
  });

  // -------------------------------------------------------
  it("[TC07] service throws error", async () => {
    calendarService.getCalendarById.mockRejectedValueOnce(new Error("ERR"));

    await controller.removeParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lỗi server khi xóa người tham gia",
      })
    );
  });
});
