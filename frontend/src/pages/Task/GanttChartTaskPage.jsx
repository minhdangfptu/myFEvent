export default function GanttChartTaskPage() {
  // Task data with color coding
  const tasks = [
    {
      id: 1,
      name: "Mua bia carton",
      category: "Hầu cần",
      categoryColor: "#f3e8ff",
      taskColor: "#7c3aed",
      duration: "14 ngày",
      startWeek: 0.5,
      width: 35,
    },
    {
      id: 2,
      name: "Healthcare app wireframe flow",
      category: "Hầu cần",
      categoryColor: "#fff7ed",
      taskColor: "#ea580c",
      duration: "18 ngày",
      startWeek: 1.5,
      width: 45,
    },
    {
      id: 3,
      name: "Des ấn phẩm",
      category: "Design",
      categoryColor: "#dcfce7",
      taskColor: "#16a34a",
      duration: "22 ngày",
      startWeek: 1,
      width: 55,
    },
  ];

  const weeks = ["W 01", "W 02", "W 03", "W 04"];
  const currentDate = "23/10/2025";

  return (
    <div
      className="p-5"
      style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="mb-5">
        <h6
          className="text-uppercase mb-2"
          style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "#9ca3af",
            letterSpacing: "0.1em",
          }}
        >
          Gantt Chart
        </h6>
        <h1
          className="mb-0"
          style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}
        >
          Halloween 2024 - Tiến độ
        </h1>
      </div>

      {/* Gantt Container */}
      <div
        className="position-relative"
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 10px 24px rgba(0,0,0,0.03)",
        }}
      >
        {/* Current Date Indicator */}
        <div
          className="position-absolute"
          style={{ right: "32px", top: "32px", zIndex: 10 }}
        >
          <div
            className="px-4 py-2 rounded-pill"
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
              letterSpacing: "0.025em",
            }}
          >
            📅 {currentDate}
          </div>
        </div>

        <div className="d-flex" style={{ gap: "24px", marginTop: "60px" }}>
          {/* Left Panel - Task Names */}
          <div style={{ minWidth: "280px" }}>
            {tasks.map((task) => (
              <div key={task.id} className="mb-4">
                <div
                  className="p-4 rounded-3"
                  style={{
                    backgroundColor: task.categoryColor,
                    border: "1px solid rgba(0,0,0,0.04)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#6b7280",
                      marginBottom: "6px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {task.category}
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "#111827",
                      lineHeight: "1.4",
                    }}
                  >
                    {task.name}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - Timeline */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* Current Date Line */}
            <div
              className="position-absolute"
              style={{
                left: "60%",
                top: "0",
                bottom: "0",
                width: "3px",
                backgroundColor: "#dc2626",
                zIndex: 5,
                opacity: 0.6,
                borderRadius: "4px",
              }}
            />

            {/* Month Header */}
            <div className="text-center mb-4">
              <h5
                className="text-uppercase mb-0"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  color: "#374151",
                  letterSpacing: "0.15em",
                }}
              >
                OCTOBER
              </h5>
            </div>

            {/* Week Headers */}
            <div className="d-flex mb-3" style={{ gap: "0" }}>
              {weeks.map((week, idx) => (
                <div
                  key={idx}
                  className="flex-fill text-center"
                  style={{
                    flex: "1 1 0",
                    paddingBottom: "16px",
                    borderBottom: "2px solid #e5e7eb",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#6b7280",
                  }}
                >
                  {week}
                </div>
              ))}
            </div>

            {/* Task Bars */}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="mb-4 position-relative"
                style={{ height: "64px" }}
              >
                <div
                  className="h-100 position-relative"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  <div
                    className="rounded-pill d-flex align-items-center justify-content-center"
                    style={{
                      backgroundColor: task.taskColor,
                      color: "white",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      marginLeft: `${task.startWeek * 25}%`,
                      width: `${task.width}%`,
                      height: "40px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      position: "relative",
                      zIndex: 2,
                      boxShadow: `0 4px 12px ${task.taskColor}40`,
                      letterSpacing: "0.025em",
                    }}
                  >
                    <span style={{ fontSize: "1rem", marginRight: "6px" }}>
                      ⭕
                    </span>
                    {task.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Grid Lines */}
        <div
          className="position-absolute"
          style={{
            top: "146px",
            left: "328px",
            right: "32px",
            bottom: "32px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {weeks.map((_, idx) => (
            <div
              key={idx}
              className="position-absolute h-100"
              style={{
                left: `${(idx + 1) * 25}%`,
                width: "1px",
                backgroundColor: "#f3f4f6",
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div
        className="mt-4 d-flex justify-content-center"
        style={{ gap: "32px" }}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className="d-flex align-items-center"
            style={{ gap: "8px" }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: task.taskColor,
                boxShadow: `0 2px 8px ${task.taskColor}30`,
              }}
            />
            <span
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              {task.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
