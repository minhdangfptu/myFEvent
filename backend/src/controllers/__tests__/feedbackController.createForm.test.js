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

describe("feedbackController.createForm", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: "u1" },
      params: { eventId: "e1" },
      body: { title: "Form A" },
    };
    res = mockRes();
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should create form successfully (201)', async () => {
    feedbackService.createForm.mockResolvedValue({ id: "f1" });

    await controller.createForm(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.createForm.mockRejectedValue(new Error("ERR"));

    await controller.createForm(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
