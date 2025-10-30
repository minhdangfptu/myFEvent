"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import UserLayout from "../../components/UserLayout"
import { milestoneApi } from "../../apis/milestoneApi"
import { useEvents } from "../../contexts/EventContext"

const styles = {
  container: {
    padding: "2rem",
    background: "#f8f9fa",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  headerTitle: {
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "#1a1a1a",
    margin: 0,
  },
  btnCreate: {
    background: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
    color: "white",
    border: "none",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
  },
  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "1rem",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "2rem",
    background: "white",
    borderRadius: "1rem",
    padding: "2rem",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  timelineSection: {
    position: "relative",
    paddingLeft: "2rem",
  },
  timelineLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "3px",
    background: "linear-gradient(180deg, #ef4444 0%, #f87171 50%, #fca5a5 100%)",
    borderRadius: "2px",
  },
  milestonesList: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  milestoneItem: {
    display: "flex",
    gap: "1rem",
    cursor: "pointer",
    padding: "1rem",
    borderRadius: "0.75rem",
    transition: "all 0.3s ease",
    position: "relative",
    left: "-1rem",
    paddingLeft: "2rem",
  },
  milestoneItemActive: {
    background: "#fef2f2",
  },
  milestoneDot: {
    position: "absolute",
    left: "-1.5rem",
    top: "1.25rem",
    width: "2rem",
    height: "2rem",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
    animation: "pulse 2s infinite",
  },
  dotInner: {
    width: "0.75rem",
    height: "0.75rem",
    background: "white",
    borderRadius: "50%",
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneDate: {
    fontSize: "0.875rem",
    color: "#ef4444",
    fontWeight: 600,
  },
  milestoneName: {
    fontSize: "1rem",
    fontWeight: 500,
    color: "#1a1a1a",
    marginTop: "0.25rem",
  },
  detailsSection: {
    borderLeft: "1px solid #e5e7eb",
    paddingLeft: "2rem",
  },
  milestoneDetails: {
    animation: "fadeIn 0.3s ease",
  },
  detailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "2px solid #f3f4f6",
  },
  detailsHeaderTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
    margin: 0,
  },
  statusBadge: {
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "2rem",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  detailsBody: {
    marginBottom: "2rem",
  },
  detailItem: {
    marginBottom: "1.5rem",
  },
  detailLabel: {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "0.5rem",
  },
  detailText: {
    fontSize: "1rem",
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.5,
  },
  detailsActions: {
    display: "flex",
    gap: "1rem",
  },
  btnPrimary: {
    flex: 1,
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "0.5rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "0.95rem",
    background: "linear-gradient(135deg, #ef4444 0%, #f87171 100%)",
    color: "white",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
  },
  btnSecondary: {
    flex: 1,
    padding: "0.75rem 1.5rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    fontSize: "0.95rem",
    background: "#f3f4f6",
    color: "#1a1a1a",
  },
  noSelection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
    color: "#9ca3af",
    fontSize: "1rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "white",
    borderRadius: "1rem",
    padding: "2rem",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15)",
    animation: "slideUp 0.3s ease",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#1a1a1a",
    margin: "0 0 1.5rem 0",
  },
  formGroup: {
    marginBottom: "1.5rem",
  },
  formLabel: {
    display: "block",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "0.5rem",
  },
  formInput: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    transition: "all 0.3s ease",
    boxSizing: "border-box",
  },
  formTextarea: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    transition: "all 0.3s ease",
    resize: "vertical",
    minHeight: "100px",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    gap: "1rem",
    marginTop: "2rem",
  },
}

const animationStyles = `
  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }
    50% {
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .milestone-content-responsive {
      grid-template-columns: 1fr !important;
    }
    .details-section-responsive {
      border-left: none !important;
      border-top: 1px solid #e5e7eb !important;
      padding-left: 0 !important;
      padding-top: 2rem !important;
    }
  }
`

const Milestone = () => {
  const navigate = useNavigate()
  const { eventId } = useParams()
  const { events, fetchEventRole, getEventRole } = useEvents()
  const [eventRole, setEventRole] = useState("")

  const [milestones, setMilestones] = useState([])
  const [selectedMilestone, setSelectedMilestone] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    targetDate: "",
    status: "Đã lên kế hoạch",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const currentEvent = events.find((event) => event._id === eventId)

  useEffect(() => {
    let mounted = true
    const loadRole = async () => {
      if (!eventId) {
        if (mounted) setEventRole("")
        return
      }
      try {
        const role = await fetchEventRole(eventId)
        if (mounted) setEventRole(role)
      } catch (_) {
        if (mounted) setEventRole("")
      }
    }
    loadRole()
    fetchMilestones()
    return () => {
      mounted = false
    }
  }, [eventId, fetchEventRole])

  const parseAnyDate = (value) => {
    if (!value) return null
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
    try {
      const parts = String(value)
        .split("/")
        .map((p) => p.trim())
      if (parts.length >= 2) {
        const day = Number.parseInt(parts[0], 10)
        const month = Number.parseInt(parts[1], 10) - 1
        const year = parts[2] ? Number.parseInt(parts[2], 10) : new Date().getFullYear()
        const guess = new Date(year, month, day)
        if (!isNaN(guess.getTime())) return guess
      }
    } catch {}
    return null
  }

  const fetchMilestones = async () => {
    try {
      setLoading(true)
      const response = await milestoneApi.listMilestonesByEvent(eventId)
      const sorted = [...(response.data || [])].sort((a, b) => {
        const da = parseAnyDate(a?.targetDate) || new Date(8640000000000000)
        const db = parseAnyDate(b?.targetDate) || new Date(8640000000000000)
        return da.getTime() - db.getTime()
      })
      const mappedMilestones = sorted.map((ms, index) => ({
        id: ms._id || ms.id,
        name: ms.name,
        date: ms.targetDate ? new Date(ms.targetDate).toLocaleDateString("vi-VN") : "",
        status: getStatusLabel(ms.status),
        description: ms.description || "",
        relatedTasks: ms.tasksCount || 0,
      }))
      setMilestones(mappedMilestones)
      if (mappedMilestones.length > 0 && !selectedMilestone) {
        setSelectedMilestone(mappedMilestones[0])
      }
    } catch (err) {
      console.error("Error fetching milestones:", err)
      setError("Không thể tải danh sách cột mốc")
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "planned":
        return "Đã lên kế hoạch"
      case "in_progress":
        return "Đang thực hiện"
      case "completed":
        return "Đã hoàn thành"
      case "delayed":
        return "Trễ hạn"
      case "cancelled":
        return "Đã hủy"
      default:
        return "Đã lên kế hoạch"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Đã lên kế hoạch":
        return "#3b82f6"
      case "Đang thực hiện":
        return "#f59e0b"
      case "Đã hoàn thành":
        return "#10b981"
      case "Trễ hạn":
        return "#dc2626"
      case "Đã hủy":
        return "#6b7280"
      default:
        return "#6b7280"
    }
  }

  const handleMilestoneClick = (milestone) => {
    setSelectedMilestone(milestone)
  }

  const handleEditMilestone = (milestoneId) => {
    setLoading(true)
    navigate(`/events/${eventId}/hooc-edit-milestone/${milestoneId}`)
  }

  const handleViewDetails = (milestoneId) => {
    setLoading(true)
    navigate(`/events/${eventId}/hooc-milestone-detail/${milestoneId}`)
  }

  const handleCreateMilestone = () => {
    setShowCreateModal(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")

      const response = await milestoneApi.createMilestone(eventId, {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        targetDate: createForm.targetDate,
        status: getStatusValue(createForm.status),
      })

      await fetchMilestones()
      setShowCreateModal(false)
      setCreateForm({ name: "", description: "", targetDate: "", status: "Đã lên kế hoạch" })
      alert("Tạo cột mốc thành công!")
    } catch (err) {
      console.error("Error creating milestone:", err)
      setError(err.response?.data?.message || "Tạo cột mốc thất bại")
    } finally {
      setLoading(false)
    }
  }

  const getStatusValue = (label) => {
    const map = {
      "Đã lên kế hoạch": "planned",
      "Đang thực hiện": "in_progress",
      "Đã hoàn thành": "completed",
      "Trễ hạn": "delayed",
      "Đã hủy": "cancelled",
    }
    return map[label] || "planned"
  }

  return (
    <UserLayout sidebarType={eventRole}>
      <style>{animationStyles}</style>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>Quản lý Cột Mốc</h1>
          {eventRole === "HoOC" && (<button
            style={styles.btnCreate}
            onClick={handleCreateMilestone}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)"
              e.target.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.4)"
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)"
            }}
          >
            + TẠO CỘT MỐC MỚI
          </button>
          )}
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.content} className="milestone-content-responsive">
          <div style={styles.timelineSection}>
            <div style={styles.timelineLine}></div>
            <div style={styles.milestonesList}>
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  style={{
                    ...styles.milestoneItem,
                    ...(selectedMilestone?.id === milestone.id ? styles.milestoneItemActive : {}),
                  }}
                  onClick={() => handleMilestoneClick(milestone)}
                  onMouseEnter={(e) => {
                    if (selectedMilestone?.id !== milestone.id) {
                      e.currentTarget.style.background = "#f3f4f6"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMilestone?.id !== milestone.id) {
                      e.currentTarget.style.background = "transparent"
                    }
                  }}
                >
                  <div
                    style={{
                      ...styles.milestoneDot,
                      background: `linear-gradient(135deg, ${getStatusColor(milestone.status)} 0%, rgba(239, 68, 68, 0.3) 100%)`,
                    }}
                  >
                    <div style={styles.dotInner}></div>
                  </div>
                  <div style={styles.milestoneInfo}>
                    <div style={styles.milestoneDate}>{milestone.date}</div>
                    <div style={styles.milestoneName}>{milestone.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.detailsSection} className="details-section-responsive">
            {selectedMilestone ? (
              <div style={styles.milestoneDetails}>
                <div style={styles.detailsHeader}>
                  <h2 style={styles.detailsHeaderTitle}>{selectedMilestone.name}</h2>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(selectedMilestone.status),
                    }}
                  >
                    {selectedMilestone.status}
                  </span>
                </div>

                <div style={styles.detailsBody}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Ngày:</label>
                    <p style={styles.detailText}>{selectedMilestone.date}</p>
                  </div>

                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Mô tả:</label>
                    <p style={styles.detailText}>{selectedMilestone.description || "Không có mô tả"}</p>
                  </div>

                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Số công việc liên quan:</label>
                    <p style={styles.detailText}>{selectedMilestone.relatedTasks}</p>
                  </div>
                </div>

                <div style={styles.detailsActions}>
                  <button
                    style={styles.btnSecondary}
                    onClick={() => handleEditMilestone(selectedMilestone.id)}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#e5e7eb"
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#f3f4f6"
                    }}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    style={styles.btnPrimary}
                    onClick={() => handleViewDetails(selectedMilestone.id)}
                    onMouseEnter={(e) => {
                      e.target.style.transform = "translateY(-2px)"
                      e.target.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.4)"
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "translateY(0)"
                      e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)"
                    }}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.noSelection}>
                <p>Chọn một cột mốc để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>

        {showCreateModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Tạo Cột Mốc Mới</h2>
              <form onSubmit={handleCreateSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Tên cột mốc:</label>
                  <input
                    type="text"
                    style={styles.formInput}
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#ef4444"
                      e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb"
                      e.target.style.boxShadow = "none"
                    }}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Mô tả:</label>
                  <textarea
                    style={styles.formTextarea}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#ef4444"
                      e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb"
                      e.target.style.boxShadow = "none"
                    }}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Ngày dự kiến:</label>
                  <input
                    type="date"
                    style={styles.formInput}
                    value={createForm.targetDate}
                    onChange={(e) => setCreateForm({ ...createForm, targetDate: e.target.value })}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#ef4444"
                      e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb"
                      e.target.style.boxShadow = "none"
                    }}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Trạng thái:</label>
                  <select
                    style={styles.formInput}
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#ef4444"
                      e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)"
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb"
                      e.target.style.boxShadow = "none"
                    }}
                  >
                    <option>Đã lên kế hoạch</option>
                    <option>Đang thực hiện</option>
                    <option>Đã hoàn thành</option>
                    <option>Trễ hạn</option>
                    <option>Đã hủy</option>
                  </select>
                </div>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.btnSecondary}
                    onClick={() => setShowCreateModal(false)}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#e5e7eb"
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#f3f4f6"
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={styles.btnPrimary}
                    disabled={loading}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = "translateY(-2px)"
                        e.target.style.boxShadow = "0 6px 16px rgba(239, 68, 68, 0.4)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.transform = "translateY(0)"
                        e.target.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)"
                      }
                    }}
                  >
                    {loading ? "Đang tạo..." : "Tạo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  )
}

export default Milestone
