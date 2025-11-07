import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { taskApi } from "~/apis/taskApi";
import { toast } from "react-toastify";
import UserLayout from "../../components/UserLayout";
import { useTranslation } from "react-i18next";
import { useEvents } from "~/contexts/EventContext";

/** 
 * CustomGanttChart Component - FIXED VERSION
 * Dùng position: absolute/relative thay vì sticky để đảm bảo 100% hoạt động
 */
const CustomGanttChart = ({ tasks, viewMode, onTaskClick }) => {
  const timelineRef = useRef(null);
  const nameBodyRef = useRef(null);
  const headerScrollRef = useRef(null);

  // Tính toán ngày bắt đầu và kết thúc
  const getDatesRange = () => {
    const year = new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDatesRange();

  // Tạo danh sách các cột ngày/tuần/tháng
  const getTimeColumns = () => {
    const columns = [];
    const current = new Date(startDate);

    if (viewMode === "day") {
      while (current <= endDate) {
        columns.push({
          date: new Date(current),
          label: `${current.getDate()}/${current.getMonth() + 1}`,
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (viewMode === "week") {
      while (current <= endDate) {
        columns.push({
          date: new Date(current),
          label: `T${Math.ceil((current.getDate() + 6 - current.getDay()) / 7)}`,
        });
        current.setDate(current.getDate() + 7);
      }
    } else if (viewMode === "month") {
      while (current <= endDate) {
        columns.push({
          date: new Date(current),
          label: `T${current.getMonth() + 1}`,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return columns;
  };

  const timeColumns = getTimeColumns();
  const columnWidth = viewMode === "day" ? 50 : viewMode === "week" ? 100 : 150;
  const totalTimelineWidth = timeColumns.length * columnWidth;

  // Vị trí task trên timeline
  const getTaskPosition = (task) => {
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const taskStart = (task.start - startDate) / (1000 * 60 * 60 * 24);
    const taskDuration = (task.end - task.start) / (1000 * 60 * 60 * 24);

    const left = (taskStart / totalDays) * totalTimelineWidth;
    const width = Math.max((taskDuration / totalDays) * totalTimelineWidth, 30);
    return { left, width };
  };

  // Xử lý scroll
  const handleTimelineScroll = () => {
    if (!timelineRef.current) return;

    // Đồng bộ scroll dọc
    if (nameBodyRef.current) {
      nameBodyRef.current.scrollTop = timelineRef.current.scrollTop;
    }

    // Đồng bộ scroll ngang cho header
    if (headerScrollRef.current) {
      window.requestAnimationFrame(() => {
        if (headerScrollRef.current && timelineRef.current) {
          headerScrollRef.current.style.transform = 
            `translateX(-${timelineRef.current.scrollLeft}px)`;
        }
      });
    }
  };

  // Wheel trên name body
  const handleNameWheel = (e) => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <div className="gantt-chart-fixed">
      <style>{customGanttCSS}</style>

      <div className="gantt-chart-container">
        {/* CỘT 1: NAME - ABSOLUTE POSITIONED */}
        <div className="gantt-name-section">
          <div className="gantt-name-header">
            <div className="name-header-cell">Tên Task</div>
          </div>

          <div 
            className="gantt-name-body"
            ref={nameBodyRef}
            onWheel={handleNameWheel}
          >
            {tasks
              .filter((t) => t.id !== "__year_range__")
              .map((task) => (
                <div
                  key={task.id}
                  className="gantt-name-row"
                  onClick={() => onTaskClick && onTaskClick(task)}
                >
                  <div className="gantt-name-cell" title={task.name}>
                    {task.name}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* CỘT 2: TIMELINE - WITH MARGIN LEFT */}
        <div className="gantt-timeline-section">
          {/* Header */}
          <div className="gantt-timeline-header">
            <div
              ref={headerScrollRef}
              className="gantt-timeline-header-content"
              style={{ width: totalTimelineWidth, minWidth: totalTimelineWidth }}
            >
              {timeColumns.map((col, idx) => (
                <div
                  key={idx}
                  className="gantt-timeline-header-cell"
                  style={{ width: columnWidth, minWidth: columnWidth }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div
            ref={timelineRef}
            className="gantt-timeline-body"
            onScroll={handleTimelineScroll}
          >
            <div
              className="gantt-timeline-content"
              style={{ width: totalTimelineWidth, minWidth: totalTimelineWidth }}
            >
              {/* Grid */}
              <div className="gantt-grid">
                {timeColumns.map((_, idx) => (
                  <div
                    key={idx}
                    className="gantt-grid-column"
                    style={{ width: columnWidth, left: idx * columnWidth }}
                  />
                ))}
              </div>

              {/* Tasks */}
              {tasks
                .filter((t) => t.id !== "__year_range__")
                .map((task) => {
                  const { left, width } = getTaskPosition(task);
                  return (
                    <div key={task.id} className="gantt-task-row">
                      <div
                        className="gantt-task-bar"
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: task.styles?.backgroundColor || "#5b6ef5",
                        }}
                        onClick={() => onTaskClick && onTaskClick(task)}
                        title={`${task.name} (${Math.round(task.progress)}%)`}
                      >
                        <div
                          className="gantt-task-progress"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: task.styles?.progressColor || "#3b4edf",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              {/* Today line */}
              <TodayLine
                startDate={startDate}
                endDate={endDate}
                totalWidth={totalTimelineWidth}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Today Line Component */
const TodayLine = ({ startDate, endDate, totalWidth }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < startDate || today > endDate) return null;

  const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  const daysFromStart = (today - startDate) / (1000 * 60 * 60 * 24);
  const left = (daysFromStart / totalDays) * totalWidth;

  return <div className="gantt-today-line" style={{ left: `${left}px` }} />;
};

/** CSS - FIXED LAYOUT */
const customGanttCSS = `
/* Container */
.gantt-chart-fixed {
  width: 100%;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
}

.gantt-chart-container {
  position: relative;
  height: 600px;
  overflow: hidden;
}

/* NAME SECTION - ABSOLUTE POSITIONED, CỐ ĐỊNH */
.gantt-name-section {
  position: absolute;
  left: 0;
  top: 0;
  width: 300px;
  height: 100%;
  background: #fff;
  border-right: 2px solid #e5e7eb;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.gantt-name-header {
  height: 50px;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-shrink: 0;
}

.name-header-cell {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.gantt-name-body {
  flex: 1;
  overflow: hidden;
}

.gantt-name-row {
  height: 50px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}

.gantt-name-row:hover {
  background: #f9fafb;
}

.gantt-name-cell {
  font-size: 14px;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

/* TIMELINE SECTION - WITH MARGIN LEFT */
.gantt-timeline-section {
  position: absolute;
  left: 300px;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.gantt-timeline-header {
  height: 50px;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  overflow: hidden;
  flex-shrink: 0;
}

.gantt-timeline-header-content {
  display: flex;
  will-change: transform;
}

.gantt-timeline-header-cell {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
}

.gantt-timeline-body {
  flex: 1;
  overflow: auto;
}

.gantt-timeline-content {
  position: relative;
  min-height: 100%;
}

/* Scrollbar */
.gantt-timeline-body::-webkit-scrollbar {
  height: 12px;
  width: 12px;
  background: #f9fafb;
}

.gantt-timeline-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 6px;
  border: 2px solid #f9fafb;
}

.gantt-timeline-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Grid */
.gantt-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.gantt-grid-column {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px solid #f3f4f6;
}

/* Task rows */
.gantt-task-row {
  height: 50px;
  position: relative;
  border-bottom: 1px solid #f3f4f6;
}

.gantt-task-row:hover {
  background: #f9fafb;
}

/* Task bars */
.gantt-task-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 30px;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.gantt-task-bar:hover {
  transform: translateY(-50%) scale(1.02);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  z-index: 10;
}

.gantt-task-progress {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 6px 0 0 6px;
  opacity: 0.7;
  transition: width 0.3s;
}

/* Today line */
.gantt-today-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #dc2626;
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.6);
  pointer-events: none;
  z-index: 100;
}

.gantt-today-line::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 10px solid #dc2626;
}
`;

/** Main Page Component - UNCHANGED */
export default function GanttChartTaskPage() {
  const { t } = useTranslation();
  const { eventId } = useParams();
  const { fetchEventRole } = useEvents();

  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("week");
  const [eventRole, setEventRole] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");

  useEffect(() => {
    if (eventId) fetchEventRole(eventId).then(setEventRole);
  }, [eventId, fetchEventRole]);

  const getSidebarType = () => {
    if (eventRole === "HoOC") return "hooc";
    if (eventRole === "HoD") return "HoD";
    if (eventRole === "Member") return "member";
    return "user";
  };

  useEffect(() => {
    if (!eventId) return;

    (async () => {
      try {
        setLoading(true);
        const apiRes = await taskApi.getTaskByEvent(eventId);
        const arr = apiRes?.data || [];

        const mapped = arr.map((task) => {
          const startDate = task.createdAt ? new Date(task.createdAt) : new Date();
          let endDate = startDate;

          if (task.dueDate) {
            endDate = new Date(task.dueDate);
          } else if (task.estimate && task.estimateUnit) {
            const days =
              task.estimateUnit === "d"
                ? task.estimate
                : task.estimateUnit === "w"
                ? task.estimate * 7
                : task.estimate / 24;
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + Math.ceil(days));
          } else {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
          }

          if (endDate < startDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }

          return {
            start: startDate,
            end: endDate,
            name: task.title || "Unnamed Task",
            id: task._id,
            progress: typeof task.progressPct === "number" ? task.progressPct : 0,
            isDisabled: task.status === "cancelled",
            styles: {
              progressColor: getStatusColor(task.status),
              backgroundColor: getStatusColor(task.status),
            },
            rawTask: task,
          };
        });

        mapped.sort((a, b) => a.start.getTime() - b.start.getTime());

        setAllTasks(mapped);
        setRawTasks(arr);
        setTasks(mapped);
      } catch (e) {
        console.error(e);
        toast.error("Không thể tải dữ liệu Gantt chart");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  useEffect(() => {
    let filtered = [...allTasks];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => (t.name || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "Tất cả") {
      const map = {
        "Chưa bắt đầu": "todo",
        "Đang làm": "in_progress",
        "Hoàn thành": "done",
        "Tạm hoãn": "blocked",
        "Đã huỷ": "cancelled",
      };
      const st = map[filterStatus];
      if (st) {
        const ids = new Set(
          rawTasks.filter((t) => t.status === st).map((t) => t._id)
        );
        filtered = filtered.filter((t) => ids.has(t.id));
      }
    }
    setTasks(filtered);
  }, [searchQuery, filterStatus, allTasks, rawTasks]);

  const getStatusColor = (status) => {
    const colorMap = {
      done: "#28a745",
      in_progress: "#ffa500",
      blocked: "#dc3545",
      todo: "#5b6ef5",
      cancelled: "#6c757d",
    };
    return colorMap[status] || "#5b6ef5";
  };

  const handleTaskClick = (task) => {
    if (task.id) {
      window.location.href = `/events/${eventId}/tasks/${task.id}`;
    }
  };

  if (loading) {
    return (
      <UserLayout
        title={t("taskPage.title") || "Gantt Chart"}
        activePage="work-board"
        sidebarType={getSidebarType()}
      >
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "60vh" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title={(t("taskPage.title") || "Tasks") + ": Biểu đồ Gantt"}
      activePage="work-gantt"
      sidebarType={getSidebarType()}
    >
      <div
        className="container-fluid"
        style={{ maxWidth: "100%", width: "100%", padding: "0 15px" }}
      >
        {/* Header */}
        <div
          className="mb-3"
          style={{
            backgroundColor: "white",
            borderRadius: 8,
            padding: "12px 16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div
              className="position-relative flex-grow-1"
              style={{ maxWidth: 400, minWidth: 200 }}
            >
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm timeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: 40,
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                }}
              />
              <span
                className="position-absolute"
                style={{
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              >
                🔍
              </span>
            </div>

            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: 180, borderRadius: 6, border: "1px solid #e5e7eb" }}
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Chưa bắt đầu">Chưa bắt đầu</option>
              <option value="Đang làm">Đang làm</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Tạm hoãn">Tạm hoãn</option>
              <option value="Đã huỷ">Đã huỷ</option>
            </select>

            <div
              className="d-flex justify-content-center flex-wrap"
              style={{ gap: 24 }}
            >
              {[
                ["#5b6ef5", "Chưa bắt đầu"],
                ["#ffa500", "Đang làm"],
                ["#28a745", "Hoàn thành"],
                ["#dc3545", "Tạm hoãn"],
                ["#6c757d", "Đã huỷ"],
              ].map(([bg, label]) => (
                <div
                  key={label}
                  className="d-flex align-items-center"
                  style={{ gap: 8 }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      backgroundColor: bg,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        {tasks.length === 0 ? (
          <div
            className="text-center p-5"
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <p className="text-muted mb-0">Chưa có task nào để hiển thị</p>
          </div>
        ) : (
          <CustomGanttChart
            tasks={tasks}
            viewMode={viewMode}
            onTaskClick={handleTaskClick}
          />
        )}

        {/* View mode buttons */}
        <div
          className="position-fixed"
          style={{ bottom: 24, right: 24, zIndex: 1000 }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: 160,
              overflow: "hidden",
            }}
          >
            <div
              className="px-3 py-2"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                backgroundColor: "#f9fafb",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              XEM THEO
            </div>
            <div style={{ padding: 4 }}>
              {[
                ["day", "Ngày"],
                ["week", "Tuần"],
                ["month", "Tháng"],
              ].map(([mode, label]) => (
                <button
                  key={label}
                  className="w-100 text-start btn btn-sm"
                  style={{
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 12px",
                    margin: 2,
                    fontSize: 14,
                    fontWeight: viewMode === mode ? 600 : 400,
                    transition: "all 0.2s",
                    backgroundColor: viewMode === mode ? "#dc2626" : "transparent",
                    color: viewMode === mode ? "#fff" : "inherit",
                  }}
                  onClick={() => setViewMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}