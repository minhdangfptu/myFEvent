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

describe("feedbackController.submitResponse", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: "u1" },
      params: { eventId: "e1", formId: "f1" },
      body: { answers: [] },
    };
    res = mockRes();
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should submit response successfully (201)', async () => {
    feedbackService.submitResponse.mockResolvedValue({});

    await controller.submitResponse(req, res);

    expect(feedbackService.submitResponse).toHaveBeenCalledWith({
      userId: "u1",
      eventId: "e1",
      formId: "f1",
      body: { answers: [] },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.submitResponse.mockRejectedValue(new Error("ERR"));

    await controller.submitResponse(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});


