import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// ==== MOCK SERVICES ==== //
vi.mock("../../services/calendarService.js", () => ({
    getCalendarById: vi.fn(),
    updateCalendar: vi.fn(),
}));

vi.mock("../../services/departmentService.js", () => ({
    findDepartmentById: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
    getRequesterMembership: vi.fn(),
}));
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

describe("calendarController.updateParticipateStatus", () => {
    it("[Normal] TC01 - should update participate status successfully", async () => {
        const { getCalendarById, updateCalendar } = await import("../../services/calendarService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event1",
            participants: [
                { member: { _id: "m1" }, participateStatus: "unconfirmed" }
            ]
        });

        getRequesterMembership.mockResolvedValue({
            _id: "m1",
            role: "Member"
        });

        updateCalendar.mockResolvedValue({
            _id: "cal1",
            participants: [
                { member: { _id: "m1" }, participateStatus: "confirmed" }
            ]
        });

        const req = {
            params: { calendarId: "cal1" },
            user: { id: "user1" },
            body: { participateStatus: "confirmed" }
        };

        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(updateCalendar).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Update participate status successfully",
            })
        );
    });

    it("[Abnormal] TC02 - should return 404 when calendar not found", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        getCalendarById.mockResolvedValue(null);

        const req = {
            params: { calendarId: "calX" },
            user: { id: "u1" },
            body: {}
        };

        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("[Abnormal] TC03 - should return 404 when department not found (for department calendar)", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        const { findDepartmentById } = await import("../../services/departmentService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            departmentId: "dep1",
            participants: []
        });

        findDepartmentById.mockResolvedValue(null);

        const req = {
            params: { calendarId: "cal1" },
            user: { id: "u1" },
            body: {}
        };

        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Department not found" })
        );
    });

    it("[Abnormal] TC04 - should return 403 when user is not participant", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event1",
            participants: [
                { member: { _id: "m1" } },
            ]
        });

        getRequesterMembership.mockResolvedValue({
            _id: "m2", // NOT in participants
        });

        const req = {
            params: { calendarId: "cal1" },
            user: { id: "u1" },
            body: { participateStatus: "confirmed" }
        };
        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "You are not a participant of this calendar" })
        );
    });

    it("[Abnormal] TC05 - should return 400 when absent but no reason", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event1",
            participants: [
                { member: { _id: "m1" } },
            ]
        });

        getRequesterMembership.mockResolvedValue({
            _id: "m1",
        });

        const req = {
            params: { calendarId: "cal1" },
            user: { id: "u1" },
            body: { participateStatus: "absent" }
        };
        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("[Abnormal] TC06 - should return 500 on unexpected error", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockRejectedValue(new Error("DB ERROR"));

        const req = {
            params: { calendarId: "cal1" },
            user: { id: "u1" },
            body: {}
        };
        const res = mockRes();

        await calendarController.updateParticipateStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Failed to update participate status",
            })
        );
    });
});
