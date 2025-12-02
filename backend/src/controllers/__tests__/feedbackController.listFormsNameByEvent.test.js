import { describe, it, beforeEach, expect, vi } from "vitest";
import * as controller from "../../controllers/feedbackController.js";
import { feedbackService } from "../../services/feedbackService.js";

vi.mock("../../services/feedbackService.js");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("feedbackController.listFormsNameByEvent", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: "u1" },
      params: { eventId: "e1" },
      query: { page: 1, limit: 5 },
    };
    res = mockRes();
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should list form names by event successfully (200)', async () => {
    feedbackService.listFormsNameByEvent.mockResolvedValue({ data: [] });

    await controller.listFormsNameByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.listFormsNameByEvent.mockRejectedValue(new Error("ERR"));

    await controller.listFormsNameByEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
