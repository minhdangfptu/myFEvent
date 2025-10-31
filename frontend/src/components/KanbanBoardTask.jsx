"use client"

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function KanbanBoardTask({ listTask, eventId }) {
  const navigate = useNavigate();
  const handleDetail = (taskId) => {
    navigate(`/events/${eventId}/tasks/${taskId}`);
  };
  const TaskCard = ({ task }) => (
    <div className="card mb-3 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
      <div onClick={() => handleDetail(task.id)} className="card-body p-3" style={{ cursor: "pointer" }}>
        <h6 className="card-title fw-600 mb-2" style={{ fontSize: "14px", color: "#2d3748" }}>
          {task.name || task.title}
        </h6>
        <p className="card-text text-muted mb-2" style={{ fontSize: "13px" }}>
          {task.description}
        </p>
        {task.department && <div className="mb-1 small"><span className="badge text-bg-light">{task.department}</span></div>}
        {task.assignee && <div className="mb-1 small"><span className="text-muted">👤 {task.assignee}</span></div>}
        {task.due && <div className="mb-1 small"><span className="text-muted">📅 {task.due}</span></div>}
      </div>
    </div>
  );

  const Column = ({ title, count, color, tasks }) => (
    <div className="col-12 col-md-4">
      <div
        className="rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center text-white"
        style={{
          backgroundColor: color,
          borderRadius: "20px",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              fontSize: "14px",
            }}
          >
            {count}
          </div>
          <span className="fw-600" style={{ fontSize: "15px" }}>
            {title}
          </span>
        </div>
      </div>
      <div style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-light min-vh-100 py-4">
      <div className="container-lg">
        <div className="row g-3">
          <Column
            title="Chưa bắt đầu"
            count={listTask.notStarted.length}
            color="#5b6ef5"
            tasks={listTask.notStarted}
          />
          <Column
            title="Đang làm"
            count={listTask.inProgress.length}
            color="#ffa500"
            tasks={listTask.inProgress}
          />
          <Column
            title="Đã xong"
            count={listTask.done.length}
            color="#28a745"
            tasks={listTask.done}
          />
        </div>
      </div>
    </div>
  );
}
