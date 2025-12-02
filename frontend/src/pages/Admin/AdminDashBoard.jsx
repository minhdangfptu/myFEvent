import { useState, useEffect } from "react";
import UserLayout from "~/components/UserLayout";
import adminService from "~/services/adminService";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("moi-tao");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats data
  const [stats, setStats] = useState({
    totalEvents: { value: 0, changeThisWeek: 0 },
    bannedEvents: { value: 0, changeThisWeek: 0 },
    totalUsers: { value: 0, changeThisWeek: 0 },
    bannedUsers: { value: 0, changeThisWeek: 0 },
  });

  // Banned events
  const [bannedEvents, setBannedEvents] = useState([]);

  // Weekly activity
  const [weeklyStats, setWeeklyStats] = useState([]);

  // Recent events
  const [recentEvents, setRecentEvents] = useState({
    "moi-tao": [],
    "sap-dien-ra": [],
  });

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [statsData, bannedEventsData, weeklyActivityData, newEventsData, upcomingEventsData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getRecentBannedEvents(10),
          adminService.getWeeklyActivity(),
          adminService.getRecentEvents("new", 10),
          adminService.getRecentEvents("upcoming", 10),
        ]);

        setStats(statsData);
        setBannedEvents(bannedEventsData);
        setWeeklyStats(weeklyActivityData);
        setRecentEvents({
          "moi-tao": newEventsData,
          "sap-dien-ra": upcomingEventsData,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper function to format change text
  const formatChangeText = (change) => {
    if (change > 0) {
      return `+${change} trong tuần này`;
    } else if (change < 0) {
      return `${change} trong tuần này`;
    } else {
      return "= trong tuần này";
    }
  };

  // Helper function to get change color
  const getChangeColor = (change) => {
    if (change > 0) {
      return "#10b981"; // green
    } else if (change < 0) {
      return "#ef4444"; // red
    } else {
      return "#6b7280"; // gray
    }
  };

  const StatCard = ({ icon, iconBg, title, value, change, changeColor }) => (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        flex: 1,
        minWidth: "200px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
            {title}
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
            {value}
          </div>
          <div style={{ fontSize: "12px", color: changeColor, marginTop: "4px" }}>
            {change}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <UserLayout title="Tổng quan" sidebarType="admin" activePage="dashboard">
        <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "24px", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: "16px", color: "#6b7280" }}>Đang tải dữ liệu...</div>
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout title="Tổng quan" sidebarType="admin" activePage="dashboard">
        <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "24px", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: "16px", color: "#ef4444" }}>{error}</div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Tổng quan" sidebarType="admin" activePage="dashboard">
      <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "24px" }}>
        {/* Stats Cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <StatCard
            icon="📅"
            iconBg="#dbeafe"
            title="Tổng sự kiện"
            value={stats.totalEvents.value}
            change={formatChangeText(stats.totalEvents.changeThisWeek)}
            changeColor={getChangeColor(stats.totalEvents.changeThisWeek)}
          />
          <StatCard
            icon="🚫"
            iconBg="#fee2e2"
            title="Sự kiện bị cấm"
            value={stats.bannedEvents.value}
            change={formatChangeText(stats.bannedEvents.changeThisWeek)}
            changeColor={getChangeColor(stats.bannedEvents.changeThisWeek)}
          />
          <StatCard
            icon="👥"
            iconBg="#e9d5ff"
            title="Tổng người dùng"
            value={stats.totalUsers.value}
            change={formatChangeText(stats.totalUsers.changeThisWeek)}
            changeColor={getChangeColor(stats.totalUsers.changeThisWeek)}
          />
          <StatCard
            icon="👤"
            iconBg="#f3f4f6"
            title="Người dùng bị cấm"
            value={stats.bannedUsers.value}
            change={formatChangeText(stats.bannedUsers.changeThisWeek)}
            changeColor={getChangeColor(stats.bannedUsers.changeThisWeek)}
          />
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          {/* Sự kiện bị cấm gần đây */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#ef4444",
                }}
              />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Sự kiện bị cấm gần đây
              </h3>
            </div>

            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Tên sự kiện
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Người tổ chức
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Ngày bị cấm
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bannedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                        Không có sự kiện bị cấm
                      </td>
                    </tr>
                  ) : (
                    bannedEvents.map((event, idx) => (
                      <tr key={idx}>
                        <td
                          style={{
                            padding: "12px 0",
                            fontSize: "14px",
                            color: "#111827",
                            borderBottom: idx < bannedEvents.length - 1 ? "1px solid #f3f4f6" : "none",
                          }}
                        >
                          {event.name}
                        </td>
                        <td
                          style={{
                            padding: "12px 0",
                            fontSize: "14px",
                            color: "#6b7280",
                            borderBottom: idx < bannedEvents.length - 1 ? "1px solid #f3f4f6" : "none",
                          }}
                        >
                          {event.organizer}
                        </td>
                        <td
                          style={{
                            padding: "12px 0",
                            fontSize: "14px",
                            color: "#6b7280",
                            borderBottom: idx < bannedEvents.length - 1 ? "1px solid #f3f4f6" : "none",
                          }}
                        >
                          {event.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tóm tắt hoạt động tuần */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                }}
              />
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                Tóm tắt hoạt động tuần
              </h3>
            </div>

            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Hoạt động
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#6b7280",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Tuần này
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats.map((stat, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: "12px 0",
                          fontSize: "14px",
                          color: "#111827",
                          borderBottom: idx < weeklyStats.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        {stat.activity}
                      </td>
                      <td
                        style={{
                          padding: "12px 0",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#111827",
                          textAlign: "right",
                          borderBottom: idx < weeklyStats.length - 1 ? "1px solid #f3f4f6" : "none",
                        }}
                      >
                        {stat.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sự kiện mới nhất */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                Sự kiện mới nhất
              </h3>
              <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e5e7eb" }}>
                <button
                  onClick={() => setActiveTab("moi-tao")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: activeTab === "moi-tao" ? "#3b82f6" : "#6b7280",
                    borderBottom: activeTab === "moi-tao" ? "2px solid #3b82f6" : "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Mới tạo
                </button>
                <button
                  onClick={() => setActiveTab("sap-dien-ra")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: activeTab === "sap-dien-ra" ? "#3b82f6" : "#6b7280",
                    borderBottom: activeTab === "sap-dien-ra" ? "2px solid #3b82f6" : "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  Sắp diễn ra
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentEvents[activeTab] && recentEvents[activeTab].length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
                  Không có sự kiện
                </div>
              ) : (
                recentEvents[activeTab]?.map((event, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#111827",
                          marginBottom: "4px",
                        }}
                      >
                        {event.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>👤</span>
                        <span>Người tổ chức: {event.organizer}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "2px",
                        }}
                      >
                        <span>📅</span>
                        <span>{event.date}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#3b82f6",
                        fontSize: "13px",
                        fontWeight: "500",
                        padding: "4px 8px",
                      }}
                    >
                      {activeTab === "moi-tao" ? "Mới tạo" : "Sắp diễn ra"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </UserLayout >
  );
}