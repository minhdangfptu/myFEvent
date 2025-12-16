import { describe, it, expect, vi, beforeEach } from "vitest";
import * as calendarController from "../calendarController.js";

// ==== MOCK SERVICES ==== //
vi.mock("../../services/calendarService.js", () => ({
    getCalendarById: vi.fn(),
}));

// Cloudinary mock cho chắc
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
describe("calendarController.getCalendarDetail", () => {
    it("[Normal] TC01 - should return calendar detail", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockResolvedValue({
            _id: "cal1",
            name: "Team Meeting",
        });

        const req = {
            params: { calendarId: "cal1" },
        };
        const res = mockRes();

        await calendarController.getCalendarDetail(req, res);

        expect(getCalendarById).toHaveBeenCalledWith("cal1");

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ _id: "cal1" }),
            })
        );
    });

    it("[Abnormal] TC02 - should return 404 when calendar not found", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockResolvedValue(null);

        const req = { params: { calendarId: "calX" } };
        const res = mockRes();

        await calendarController.getCalendarDetail(req, res);

        expect(getCalendarById).toHaveBeenCalledWith("calX");

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Calendar not found",
            })
        );
    });

    it("[Abnormal] TC03 - should return 500 when service throws error", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        getCalendarById.mockRejectedValue(new Error("DB ERROR"));

        const req = { params: { calendarId: "cal1" } };
        const res = mockRes();

        await calendarController.getCalendarDetail(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Failed to load calendar detail",
            })
        );
    });

    it("[Abnormal] TC04 - should handle missing calendarId param", async () => {
        const req = { params: {} }; // thiếu calendarId
        const res = mockRes();

        await calendarController.getCalendarDetail(req, res);

        // Khi thiếu calendarId → gọi getCalendarById(undefined) → return 404
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "calendarId is required",
            })
        );
    });

    it("[Abnormal] TC05 - should handle invalid calendarId format", async () => {
        const { getCalendarById } = await import("../../services/calendarService.js");

        // giả lập DB ném lỗi invalid ObjectId
        getCalendarById.mockRejectedValue(new Error("CastError: invalid ObjectId"));

        const req = { params: { calendarId: "???invalid???" } };
        const res = mockRes();

        await calendarController.getCalendarDetail(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Failed to load calendar detail",
            })
        );
    });
});
