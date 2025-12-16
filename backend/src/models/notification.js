import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["CÔNG VIỆC", "LỊCH HỌP", "CỘT MỐC", "THÀNH VIÊN", "TÀI CHÍNH", "PHẢN HỒI", "RỦI RO", "KHÁC"],
      default: "KHÁC",
    },
    title: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: "bi bi-bell",
    },
    avatarUrl: {
      type: String,
      default: "/logo-03.png",
    },
    color: {
      type: String,
      default: "#ef4444",
    },
    unread: {
      type: Boolean,
      default: true,
    },
    relatedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    relatedMilestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
    },
    relatedAgendaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agenda",
    },
    relatedCalendarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Calendar",
    },
    relatedBudgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBudgetPlan",
    },
    relatedExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventExpense",
    },
    relatedFeedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
    },
    relatedRiskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Risk",
    },
    relatedItemId: {
      type: String,
    },
    targetUrl: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ userId: 1, unread: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;

