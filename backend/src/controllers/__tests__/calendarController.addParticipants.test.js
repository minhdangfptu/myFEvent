import { describe, it, expect, vi, beforeEach } from "vitest";

// ==== MOCK SERVICES ==== //
vi.mock("../../services/cloudinaryService.js", () => ({}));

vi.mock("../../services/calendarService.js", () => ({
    getCalendarById: vi.fn(),
    addParticipantsToCalendar: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
    getRequesterMembership: vi.fn(),
    getEventMemberById: vi.fn(),
}));

vi.mock("../../services/notificationService.js", () => ({
    notifyAddedToCalendar: vi.fn(),
}));

vi.mock("../../models/eventMember.js", () => ({
    __esModule: true,
    default: {
        find: vi.fn(() => ({
            populate: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([]),
        })),
    },
}));

// ==== IMPORT CONTROLLER SAU KHI MOCK ==== //
import * as calendarController from "../calendarController.js";

// ==== MOCK RES ==== //
const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("calendarController.addParticipants", () => {
    it("[Normal] TC01 - should add new participants successfully", async () => {
        const { getCalendarById, addParticipantsToCalendar } = await import(
            "../../services/calendarService.js"
        );
        const {
            getRequesterMembership,
            getEventMemberById,
        } = await import("../../services/eventMemberService.js");
        const { notifyAddedToCalendar } = await import(
            "../../services/notificationService.js"
        );

        const calendarBefore = {
            _id: "cal1",
            name: "Test Calendar",
            eventId: "event1",
            createdBy: "mem1",
            participants: [{ member: { _id: "mem1" } }],
        };

        const calendarAfter = {
            _id: "cal1",
            name: "Test Calendar",
            participants: [
                { member: { _id: "mem1" } },
                { member: { _id: "mem2" } },
            ],
        };

        // getCalendarById được gọi 2 lần → mock tuần tự
        getCalendarById
            .mockResolvedValueOnce(calendarBefore) // lần 1
            .mockResolvedValueOnce(calendarAfter); // lần 2

        getRequesterMembership.mockResolvedValue({
            _id: "mem1",
            userId: { _id: "u1" },
        });

        getEventMemberById.mockResolvedValue({
            _id: "mem2",
            userId: "u2",
        });

        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: { memberIds: ["mem2"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(addParticipantsToCalendar).toHaveBeenCalledTimes(1);
        expect(addParticipantsToCalendar).toHaveBeenCalledWith(
            "cal1",
            expect.arrayContaining([
                expect.objectContaining({ member: "mem2" }),
            ])
        );

        expect(notifyAddedToCalendar).toHaveBeenCalledTimes(1);

        expect(res.status).toHaveBeenCalledWith(200);
    });


    it("[Abnormal] TC02 - missing memberIds", async () => {
        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: {},
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("[Abnormal] TC03 - calendar not found", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockResolvedValue(null);

        const req = {
            params: { eventId: "event1", calendarId: "calX" },
            user: { id: "u1" },
            body: { memberIds: ["m1"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("[Abnormal] TC04 - calendar does not belong to this event", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event999",
            createdBy: "mem1",
            participants: [],
        });

        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: { memberIds: ["m2"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("[Abnormal] TC05 - requester not creator", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        const { getRequesterMembership } = await import(
            "../../services/eventMemberService.js"
        );

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event1",
            createdBy: "mem999",
            participants: [],
        });

        getRequesterMembership.mockResolvedValue({
            _id: "mem1",
            userId: "u1",
        });

        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: { memberIds: ["m2"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("[Abnormal] TC06 - all members already exist", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");
        const { getRequesterMembership } = await import(
            "../../services/eventMemberService.js"
        );

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            eventId: "event1",
            createdBy: "mem1",
            participants: [{ member: { _id: "mem2" } }],
        });

        getRequesterMembership.mockResolvedValue({
            _id: "mem1",
            userId: { _id: "u1" },
        });

        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: { memberIds: ["mem2"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining("đã có trong lịch họp"),
            })
        );
    });

    it("[Abnormal] TC07 - service throws error", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockRejectedValue(new Error("DB ERROR"));

        const req = {
            params: { eventId: "event1", calendarId: "cal1" },
            user: { id: "u1" },
            body: { memberIds: ["m2"] },
        };

        const res = mockRes();

        await calendarController.addParticipants(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});
