// calendarController.createCalendarForDepartment.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// ==== MOCK DEPENDENCIES ==== //
vi.mock("../../services/departmentService.js", () => ({
    findDepartmentById: vi.fn(),
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

// === FIXED MOCK EVENT MEMBER (FULL CHAIN WITH populate) === //
vi.mock("../../models/eventMember.js", () => {
    const chain = {
        select: vi.fn(() => chain),
        populate: vi.fn(() => chain),
        lean: vi.fn(),
    };

    return {
        __esModule: true,
        default: {
            find: vi.fn(() => chain),
        },
        chain, // <<=== EXPORT chain RA ĐỂ test sử dụng
    };
});

vi.mock('../../services/cloudinaryService.js', () => ({
    __esModule: true,
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
}));

// ==== MOCK RES ====
const mockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
};

beforeEach(() => vi.clearAllMocks());

// ==== BEGIN TESTS ==== //

describe("calendarController.createCalendarForDepartment", () => {

    it("[Normal] TC01 - should create calendar successfully by HoD", async () => {
        const { findDepartmentById } = await import("../../services/departmentService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");
        const { createCalendar } = await import("../../services/calendarService.js");
        const { notifyAddedToCalendar } = await import("../../services/notificationService.js");
        const EventMember = (await import("../../models/eventMember.js")).default;

        // --- mock department exists ---
        findDepartmentById.mockResolvedValue({
            _id: "dep1",
            eventId: "event1",
        });

        // --- mock requester is HoD of dep1 ---
        getRequesterMembership.mockResolvedValue({
            _id: "mem1",
            userId: "user1",
            role: "HoD",
            departmentId: "dep1",
        });

        // --- mock event members of department ---
        const { chain } = await import("../../models/eventMember.js");

        chain.lean.mockResolvedValue([
            { _id: "m1", userId: { _id: "u1" } },
            { _id: "m2", userId: { _id: "u2" } },
        ]);

        // --- fake createCalendar ---
        createCalendar.mockResolvedValue({
            _id: "cal1",
            name: "Dept Calendar",
            participants: [
                { member: "m1" },
                { member: "m2" },
            ],
        });

        notifyAddedToCalendar.mockResolvedValue(1);

        const req = {
            params: { departmentId: "dep1" },
            user: { id: "user1" },
            body: {
                name: "Dept Calendar",
                locationType: "online",
                location: "Zoom",
                meetingDate: "2025-01-01",
                startTime: "10:00",
                endTime: "11:00",
                participantType: "all",
            },
        };
        const res = mockRes();

        await calendarController.createCalendarForDepartment(req, res);

        expect(findDepartmentById).toHaveBeenCalledWith("dep1");
        expect(getRequesterMembership).toHaveBeenCalledWith("event1", "user1");
        expect(createCalendar).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ _id: "cal1" }),
            })
        );
    });

    it("[Abnormal] TC02 - should return 404 when department not found", async () => {
        const { findDepartmentById } = await import("../../services/departmentService.js");

        findDepartmentById.mockResolvedValue(null);

        const req = {
            params: { departmentId: "depX" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForDepartment(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Department not found" })
        );
    });

    it("[Abnormal] TC03 - should return 403 when requester is not HoD of department", async () => {
        const { findDepartmentById } = await import("../../services/departmentService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        findDepartmentById.mockResolvedValue({ _id: "dep1", eventId: "event1" });

        getRequesterMembership.mockResolvedValue({
            role: "Member",
            departmentId: "dep1",
        });

        const req = {
            params: { departmentId: "dep1" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForDepartment(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message:
                    "Only HoD of this department can create calendar for this department!",
            })
        );
    });

    it("[Abnormal] TC04 - should return 400 when missing required fields", async () => {
        const { findDepartmentById } = await import("../../services/departmentService.js");
        const { getRequesterMembership } = await import("../../services/eventMemberService.js");

        findDepartmentById.mockResolvedValue({ _id: "dep1", eventId: "event1" });

        getRequesterMembership.mockResolvedValue({
            _id: "mem1",
            role: "HoD",
            departmentId: "dep1",
        });

        const req = {
            params: { departmentId: "dep1" },
            user: { id: "u1" },
            body: {
                locationType: "online",
                location: "",
            },
        };
        const res = mockRes();

        await calendarController.createCalendarForDepartment(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("[Abnormal] TC05 - should return 500 on unexpected error", async () => {
        const { findDepartmentById } = await import("../../services/departmentService.js");

        findDepartmentById.mockRejectedValue(new Error("DB ERROR"));

        const req = {
            params: { departmentId: "dep1" },
            user: { id: "u1" },
            body: {},
        };
        const res = mockRes();

        await calendarController.createCalendarForDepartment(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining("Failed to create calendar"),
            })
        );
    });
});
