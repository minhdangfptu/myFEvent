import { describe, it, expect, beforeEach, vi } from "vitest";
import * as controller from "../../controllers/feedbackController.js";
import { feedbackService } from "../../services/feedbackService.js";

vi.mock("../../services/feedbackService.js");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("feedbackController.listFormsByEvent", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: { id: "u1" },
      params: { eventId: "e1" },
      query: { page: 1, limit: 10 },
    };
    res = mockRes();
  });

  it('[Normal] TC01 - should list forms by event successfully (200)', async () => {
    feedbackService.listFormsByEvent.mockResolvedValue({
      data: [{ id: "f1" }],
    });

    await controller.listFormsByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.listFormsByEvent.mockRejectedValue(new Error("ERR"));

    await controller.listFormsByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
