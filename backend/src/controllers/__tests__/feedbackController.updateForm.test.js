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

describe("feedbackController.updateForm", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id: "u1" },
      params: { eventId: "e1", formId: "f1" },
      body: { title: "Updated" },
    };
    res = mockRes();
    vi.clearAllMocks();
  });

  it('[Normal] TC01 - should update form successfully (200)', async () => {
    feedbackService.updateForm.mockResolvedValue({});

    await controller.updateForm(req, res);

    expect(feedbackService.updateForm).toHaveBeenCalledWith({
      userId: "u1",
      eventId: "e1",
      formId: "f1",
      body: { title: "Updated" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('[Abnormal] TC02 - should return 500 when service throws error', async () => {
    feedbackService.updateForm.mockRejectedValue(new Error("ERR"));

    await controller.updateForm(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

