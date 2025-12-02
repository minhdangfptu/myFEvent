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

describe("feedbackController.closeForm", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "u1" }, params: { eventId: "e1", formId: "f1" } };
    res = mockRes();
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should close form successfully (200)', async () => {
    feedbackService.closeForm.mockResolvedValue({});

    await controller.closeForm(req, res);

    expect(feedbackService.closeForm).toHaveBeenCalledWith({
      userId: "u1",
      eventId: "e1",
      formId: "f1",
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.closeForm.mockRejectedValue(new Error("ERR"));

    await controller.closeForm(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});


