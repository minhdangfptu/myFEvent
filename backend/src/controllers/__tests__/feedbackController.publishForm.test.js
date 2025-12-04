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

describe("feedbackController.publishForm", () => {
  let req, res;

  beforeEach(() => {
    req = { user: { id: "u1" }, params: { eventId: "e1", formId: "f1" } };
    res = mockRes();
    vi.clearAllMocks();
  });

  it("[Normal] TC01 - should publish form successfully (200)", async () => {
    // Controller returns `{ status: 200 }`, not message
    feedbackService.publishForm.mockResolvedValue({});

    await controller.publishForm(req, res);

    expect(feedbackService.publishForm).toHaveBeenCalledWith({
      userId: "u1",
      eventId: "e1",
      formId: "f1",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 200 });
  });

  it("[Abnormal] TC02 - should return 500 when service throws error", async () => {
    // Controller returns `{ message: err.message }` for error
    feedbackService.publishForm.mockRejectedValue(new Error("ERR"));

    await controller.publishForm(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "ERR",
    });
  });
});
