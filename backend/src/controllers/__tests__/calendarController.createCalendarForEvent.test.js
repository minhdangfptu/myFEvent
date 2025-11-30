// calendarController.createCalendarForEvent.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// === Mock Dependencies ===
vi.mock("../../services/eventService.js", () => ({
    findEventById: vi.fn(),
}));

vi.mock("../../services/eventMemberService.js", () => ({
    getRequesterMembership: vi.fn(),
}));

vi.mock("../../services/calendarService.js", () => ({
    createCalendar: vi.fn(),
}));

vi.mock("../../services/notificationService.js", () => ({
    notifyAddedToCalendar: vi.fn(),
}));

vi.mock("../../models/eventMember.js", () => {
    const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn(),
    };

    return {
        __esModule: true,
        default: {
            find: vi.fn(() => mockQuery),
        },
        mockQuery,
    };
});

// === Helper mock Response ===
const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => vi.clearAllMocks());

// === BEGIN TESTS ===

describe("calendarController.createCalendarForEvent", () => {
    it("[Normal] TC01 - should create calendar successfully by HoOC", async () => {
        const { findEventById } = await import("../../services/eventService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");
        const { createCalendar } = await import("../../services/calendarService.js");
        const { notifyAddedToCalendar } = await import("../../services/notificationService.js");

        const { mockQuery } = await import("../../models/eventMember.js");

        // Đây mới là mock đúng
        mockQuery.lean.mockResolvedValue([
            { _id: "m1" },
            { _id: "m2" },
        ]);

        const req = {
            params: { eventId: "event1" },
            user: { id: "user1" },
            body: {
                name: "Test calendar",
                locationType: "online",
                location: "Zoom",
                meetingDate: "2025-01-01",
                startTime: "10:00",
                endTime: "11:00",
                participantType: "all",
            },
        };
        const res = mockRes();

        findEventById.mockResolvedValue({ _id: "event1" });

        getRequesterMembership.mockResolvedValue({
            _id: "member1",
            role: "HoOC",
        });

        createCalendar.mockResolvedValue({
            _id: "cal1",
            name: "Test calendar",
            participants: [
                { member: "m1" },
                { member: "m2" },
            ],
        });

        notifyAddedToCalendar.mockResolvedValue(1);

        await calendarController.createCalendarForEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ _id: "cal1" }),
            }),
        );
    });

    it("[Abnormal] TC02 - should return 404 when event not found", async () => {
        const { findEventById } = await import("../../services/eventService.js");

        findEventById.mockResolvedValue(null);

        const req = {
            params: { eventId: "e99" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Event not found" })
        );
    });

    it("[Abnormal] TC03 - should return 403 when requester is not HoOC", async () => {
        const { findEventById } = await import("../../services/eventService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        findEventById.mockResolvedValue({ _id: "event1" });

        getRequesterMembership.mockResolvedValue({
            role: "Member",
        });

        const req = {
            params: { eventId: "event1" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Only HoOC can create calendar for event!",
            })
        );
    });

    it("[Abnormal] TC04 - should return 400 when missing required fields", async () => {
        const { findEventById } = await import("../../services/eventService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        findEventById.mockResolvedValue({ _id: "event1" });
        getRequesterMembership.mockResolvedValue({ role: "HoOC", _id: "m1" });

        const req = {
            params: { eventId: "event1" },
            user: { id: "u1" },
            body: {
                locationType: "online",
                location: "",
            },
        };
        const res = mockRes();

        await calendarController.createCalendarForEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("[Abnormal] TC05 - should return 500 on unexpected error", async () => {
        const { findEventById } = await import("../../services/eventService.js");

        findEventById.mockRejectedValue(new Error("DB ERROR"));

        const req = {
            params: { eventId: "event1" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForEvent(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining("Failed to create calendar"),
            })
        );
    });
});
