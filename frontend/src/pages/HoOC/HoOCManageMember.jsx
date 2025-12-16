import React, { useMemo, useState, useEffect } from "react";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { departmentApi } from "../../apis/departmentApi";
import { useLocation } from "react-router-dom";
import { useEvents } from "../../contexts/EventContext";
import { useAuth } from "../../contexts/AuthContext";
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl";
import ConfirmModal from "../../components/ConfirmModal";
import { toast, ToastContainer } from "react-toastify";
import {
  Plus,
  Search,
  MoreVertical,
  UserX,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function AddMemberModal({ open, onClose, onConfirm }) {
  const [emails, setEmails] = useState(["", ""]);
  const [uploadName, setUploadName] = useState("");

  if (!open) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,0.35)", zIndex: 1060 }}
    >
      <div className="d-flex align-items-start justify-content-center w-100 h-100 p-3">
        <div
          className="bg-white rounded-3 shadow"
          style={{ width: 560, maxWidth: "100%" }}
        >
          <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
            <div className="fw-semibold">Thêm thành viên</div>
            <button
              className="btn btn-sm btn-light"
              onClick={onClose}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
          <div className="p-3">
            <div className="small text-secondary mb-2">
              Thêm thành viên vào sự kiện, thêm vui!
            </div>
            <div className="mb-2 fw-semibold">Email</div>
            <div className="d-flex flex-column gap-2 mb-2">
              {emails.map((e, idx) => (
                <input
                  key={idx}
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={e}
                  onChange={(ev) =>
                    setEmails((arr) =>
                      arr.map((x, i) => (i === idx ? ev.target.value : x))
                    )
                  }
                />
              ))}
            </div>
            <button
              className="btn btn-link p-0 mb-3"
              onClick={() => setEmails((arr) => [...arr, ""])}
            >
              + Thêm email
            </button>

            <div
              className="text-center border rounded-3 p-4 mb-2"
              style={{ borderStyle: "dashed" }}
            >
              <div className="mb-1">Tải tệp lên hoặc kéo thả tệp</div>
              <div className="text-secondary small">Định dạng Excel</div>
              <input
                type="file"
                accept=".xls,.xlsx"
                className="form-control mt-2"
                onChange={(e) => setUploadName(e.target.files?.[0]?.name || "")}
              />
              {uploadName && (
                <div className="small text-secondary mt-2">
                  Đã chọn: {uploadName}
                </div>
              )}
            </div>
            <a className="small" href="#">
              Tải template Excel mẫu
            </a>
          </div>
          <div className="p-3 d-flex justify-content-end gap-2 border-top">
            <button className="btn btn-light" onClick={onClose}>
              Hủy
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onConfirm({ emails, uploadName })}
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageMemberPage() {
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Tên");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");

  // pagination: chỉ lưu page & limit
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const [eventRole, setEventRole] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [userDepartmentId, setUserDepartmentId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    type: null,
    member: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const location = useLocation();
  const { events: myEvents, fetchEventRole } = useEvents();
  const { user } = useAuth();

  const prefetchedEvent = location.state?.event || null;
  const prefetchedMembersByDepartment =
    location.state?.membersByDepartment || null;

  const currentEventId = useMemo(
    () => getEventIdFromUrl(location.pathname, location.search),
    [location]
  );

  // Xác định event hiện tại
  const currentEvent = useMemo(() => {
    if (prefetchedEvent) return prefetchedEvent;
    const list = Array.isArray(myEvents) ? myEvents : [];
    const idFromUrl = currentEventId;
    const fallbackId = list[0]?._id || list[0]?.id;
    const targetId = idFromUrl || fallbackId;
    return list.find((e) => (e._id || e.id) === targetId) || null;
  }, [prefetchedEvent, myEvents, currentEventId]);

  // Đồng bộ selectedEvent
  useEffect(() => {
    const id = (currentEvent?._id || currentEvent?.id) || "";
    if (id && selectedEvent !== id) setSelectedEvent(id);
  }, [currentEvent, selectedEvent]);

  // Load event role
  useEffect(() => {
    let mounted = true;
    const id = (currentEvent?._id || currentEvent?.id) || currentEventId;
    if (!id) {
      if (mounted) setEventRole("");
      return () => {};
    }
    const loadRole = async () => {
      try {
        const role = await fetchEventRole(id);
        if (mounted) {
          if (typeof role === "string") {
            setEventRole(role);
          } else if (role && typeof role === "object") {
            setEventRole(role.role || "");
            setUserDepartmentId(role.departmentId || null);
          } else {
            setEventRole("");
          }
        }
      } catch (_) {
        if (mounted) setEventRole("");
      }
    };
    loadRole();
    return () => {
      mounted = false;
    };
  }, [currentEvent, currentEventId, fetchEventRole]);

  // Nếu có dữ liệu prefetched
  useEffect(() => {
    const usePrefetched = async () => {
      if (!prefetchedMembersByDepartment) return false;
      setLoading(true);
      try {
        const normalized = Object.entries(
          prefetchedMembersByDepartment
        ).flatMap(([deptName, members]) =>
          (members || []).map((m, idx) => ({
            id: m.id || m._id || m.email || `${deptName}-${idx}`,
            avatar:
              m.avatar ||
              m.avatarUrl ||
              m.photoUrl ||
              "https://i.pravatar.cc/100?u=" + (m.email || m._id || idx),
            name:
              m.name || m.fullName || m.displayName || m.email || "Không rõ",
            dept: deptName || m.department || m.departmentName || "—",
            departmentId:
              m.departmentId ||
              m.department?._id ||
              m.department?.id ||
              null,
            role: m.role || m.membership || "Member",
          }))
        );
        setMembers(normalized);
        setError("");
        return true;
      } catch (e) {
        return false;
      } finally {
        setLoading(false);
      }
    };

    usePrefetched();
  }, [prefetchedMembersByDepartment]);

  // Fallback: không có prefetched thì gọi API
  useEffect(() => {
    const shouldFetch = !prefetchedMembersByDepartment && !!selectedEvent;
    if (!shouldFetch) return;

    const loadMembers = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await eventApi.getMembersByEvent(selectedEvent);
        const raw = Array.isArray(response?.data) ? response.data : response;
        const normalized = (raw || []).map((m, idx) => ({
          id: m._id || m.id || idx,
          avatar:
            m.avatar ||
            m.avatarUrl ||
            m.photoUrl ||
            "https://i.pravatar.cc/100?u=" + (m.email || m._id || idx),
          name:
            m.fullName || m.name || m.displayName || m.email || "Không rõ",
          dept: m.department?.name || m.departmentName || m.dept || "—",
          departmentId:
            m.departmentId ||
            m.department?._id ||
            m.department?.id ||
            null,
          role: m.role || m.membership || "Member",
        }));
        setMembers(normalized);
      } catch (err) {
        console.error("Error loading members:", err);
        setError("Không thể tải danh sách thành viên");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [prefetchedMembersByDepartment, selectedEvent]);

  // Hàm chuyển đổi role sang tên hiển thị
  const getRoleDisplayName = (role) => {
    if (role === "HoOC") return "Trưởng ban Tổ chức";
    if (role === "HoD") return "Trưởng ban";
    if (role === "Member") return "Thành viên";
    return role || "—";
  };

  // Lọc + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members.filter((r) =>
      r.name.toLowerCase().includes(q)
    );

    const compare = (a, b) =>
      (a || "").localeCompare(b || "", "vi", { sensitivity: "base" });

    list.sort((a, b) => {
      if (sort === "Ban") {
        return compare(a.dept, b.dept);
      }
      if (sort === "Vai trò") {
        return compare(getRoleDisplayName(a.role), getRoleDisplayName(b.role));
      }
      // Mặc định: Tên
      return compare(a.name, b.name);
    });

    return list;
  }, [members, query, sort]);

  // ==== Pagination tính toán từ filtered ====
  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pagination.limit));

  // Nếu page > totalPages (vd sau khi lọc), ép về totalPages
  useEffect(() => {
    setPagination((prev) => {
      const safePage = Math.min(prev.page, totalPages) || 1;
      if (safePage === prev.page) return prev;
      return { ...prev, page: safePage };
    });
  }, [totalPages]);

  const startIndex = (pagination.page - 1) * pagination.limit;
  const endIndex = Math.min(startIndex + pagination.limit, totalRows);
  const currentPageRows = filtered.slice(startIndex, endIndex);

  const sidebarType =
    eventRole === "Member"
      ? "Member"
      : eventRole === "HoD"
      ? "HoD"
      : eventRole === "HoOC"
      ? "HoOC"
      : "user";
  const isMember = eventRole === "Member";

  // Close dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdown]);

  const showConfirmRemoveFromEvent = (member) => {
    setConfirmModal({
      show: true,
      type: "removeFromEvent",
      member: member,
    });
  };

  const showConfirmRemoveFromDepartment = (member) => {
    setConfirmModal({
      show: true,
      type: "removeFromDepartment",
      member: member,
    });
  };

  const canManageMember = (member) => {
    if (member.role === "HoOC") return false;
    
    // Prevent ANYONE from managing themselves (HoOC, HoD, Member)
    const currentUserId = user?._id || user?.id || null;
    const memberUserId = member.userId?._id || member.userId?.id || member.userId || null;
    const isViewingSelf = currentUserId && memberUserId && String(currentUserId) === String(memberUserId);
    if (isViewingSelf) {
      return false; // No one can manage/remove themselves
    }
    
    if (eventRole === "HoOC") return true;
    if (eventRole === "HoD") {
      if (!userDepartmentId) return false;
      // Normalize IDs for comparison
      const normalizedUserDeptId = String(userDepartmentId);
      const normalizedMemberDeptId = member.departmentId ? String(member.departmentId) : null;
      // HoD can only manage members in their own department
      return normalizedMemberDeptId === normalizedUserDeptId;
    }
    return false;
  };

  const handleConfirmDelete = async () => {
    const { type, member } = confirmModal;
    if (!member) return;

    const eventId = currentEvent?._id || currentEvent?.id || currentEventId;
    if (!eventId) {
      toast.error("Không tìm thấy ID sự kiện");
      return;
    }

    setIsDeleting(true);
    try {
      if (type === "removeFromEvent") {
        await eventApi.removeMemberFromEvent(eventId, member.id);
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
        toast.success("Đã xóa thành viên khỏi ban tổ chức thành công");
      } else if (type === "removeFromDepartment") {
        if (!member.departmentId) {
          toast.error("Không tìm thấy ID ban");
          return;
        }
        await departmentApi.removeMemberFromDepartment(
          eventId,
          member.departmentId,
          member.id
        );
        setMembers((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, dept: "—", departmentId: null, role: "Member" }
              : m
          )
        );
        toast.success(`Đã xóa thành viên khỏi ban "${member.dept}" thành công`);
      }

      setConfirmModal({ show: false, type: null, member: null });
      setOpenDropdown(null);
    } catch (error) {
      console.error("Error removing member:", error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xóa thành viên";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getConfirmMessage = () => {
    const { type, member } = confirmModal;
    if (!member) return "";

    if (type === "removeFromEvent") {
      return `Bạn có chắc muốn xóa "${member.name}" khỏi ban tổ chức?`;
    } else if (type === "removeFromDepartment") {
      return `Bạn có chắc muốn xóa "${member.name}" khỏi ban "${member.dept}"?`;
    }
    return "";
  };

  return (
    <UserLayout
      title="Quản lý thành viên sự kiện"
      sidebarType={sidebarType}
      activePage="members"
      showSearch={false}
      eventId={currentEventId}
    >
      <ToastContainer position="top-right" autoClose={3000} />
      <style>{`
        .cell-action{cursor:pointer}
        .table thead th{font-size:12px;color:#6b7280;font-weight:600;border-bottom-color:#e5e7eb}
        .dropdown-item{transition:background-color 0.15s ease-in-out}
        .dropdown-item:hover{background-color:#f3f4f6}
        .dropdown-item:active{background-color:#e5e7eb}
      `}</style>
      <div className="container-fluid" style={{ maxWidth: 1150 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="fw-semibold" style={{ color: "#EF4444" }}>
              Danh sách thành viên sự kiện{" "}
              {currentEvent?.name || "Sự kiện của bạn"}
            </div>
          </div>
          {/* <div className="d-flex align-items-center gap-2">
            {!isMember && (
              <button
                className="btn btn-danger d-inline-flex align-items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <Plus size={18} />
                Thêm thành viên
              </button>
            )}
          </div> */}
        </div>

        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="position-relative"
            style={{ maxWidth: 300, width: "100%" }}
          >
            <Search
              size={16}
              className="position-absolute"
              style={{ left: 10, top: 10, color: "#9ca3af" }}
            />
            <input
              className="form-control ps-4"
              placeholder="Tìm kiếm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="text-secondary small">Sắp xếp theo:</span>
            <select
              className="form-select form-select-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="Tên">Tên</option>
              <option value="Ban">Ban</option>
              <option value="Vai trò">Vai trò</option>
            </select>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive" style={{ overflow: "visible" }}>
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th
                    style={{
                      width: 60,
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    STT
                  </th>
                  <th
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Ảnh
                  </th>
                  <th
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Tên
                  </th>
                  <th
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Ban
                  </th>
                  <th
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Vai trò
                  </th>
                  <th
                    style={{
                      width: 56,
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Đang tải danh sách thành viên...
                    </td>
                  </tr>
                )}
                {!loading && totalRows === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Không có thành viên nào
                    </td>
                  </tr>
                )}
                {!loading &&
                  currentPageRows.map((r, index) => {
                    const isDropdownOpen = openDropdown === r.id;
                    const hasDepartment = r.dept && r.dept !== "—";
                    const canManage = canManageMember(r);

                    return (
                      <tr key={r.id}>
                        <td
                          style={{
                            padding: "10px",
                            fontWeight: "500",
                            color: "#6b7280",
                          }}
                        >
                          {startIndex + index + 1}
                        </td>
                        <td>
                          <img
                            src={r.avatar}
                            className="rounded-circle"
                            style={{ width: 28, height: 28, objectFit: "cover" }}
                            alt={r.name}
                          />
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          {r.name}
                        </td>
                        <td>{r.dept}</td>
                        <td>{getRoleDisplayName(r.role)}</td>
                        <td className="cell-action text-end position-relative">
                          {canManage && (
                            <>
                              <MoreVertical
                                size={18}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(
                                    isDropdownOpen ? null : r.id
                                  );
                                }}
                                style={{ cursor: "pointer" }}
                              />
                              {isDropdownOpen && (
                                <div
                                  className="position-absolute bg-white shadow-sm border rounded"
                                  style={{
                                    right: 0,
                                    top: "100%",
                                    minWidth: "220px",
                                    zIndex: 1050,
                                    marginTop: "4px",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {eventRole === "HoOC" && (
                                    <>
                                      <button
                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent w-100 text-start"
                                        style={{ fontSize: "14px" }}
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          showConfirmRemoveFromEvent(r);
                                        }}
                                      >
                                        <UserX
                                          size={16}
                                          className="text-danger"
                                        />
                                        <span>
                                          Xóa khỏi ban tổ chức
                                        </span>
                                      </button>
                                      {hasDepartment && r.departmentId && (
                                        <>
                                          <hr className="my-1" />
                                          <button
                                            className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent w-100 text-start"
                                            style={{ fontSize: "14px" }}
                                            onClick={() => {
                                              setOpenDropdown(null);
                                              showConfirmRemoveFromDepartment(
                                                r
                                              );
                                            }}
                                          >
                                            <LogOut
                                              size={16}
                                              className="text-warning"
                                            />
                                            <span>
                                              Xóa khỏi ban "{r.dept}"
                                            </span>
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                  {eventRole === "HoD" &&
                                    hasDepartment &&
                                    r.departmentId && (
                                      <button
                                        className="dropdown-item d-flex align-items-center gap-2 px-3 py-2 border-0 bg-transparent w-100 text-start"
                                        style={{ fontSize: "14px" }}
                                        onClick={() => {
                                          setOpenDropdown(null);
                                          showConfirmRemoveFromDepartment(r);
                                        }}
                                      >
                                        <LogOut
                                          size={16}
                                          className="text-warning"
                                        />
                                        <span>
                                          Xóa khỏi ban "{r.dept}"
                                        </span>
                                      </button>
                                    )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <div className="text-secondary small">
              {totalRows === 0
                ? "Không có dữ liệu"
                : `Dòng ${startIndex + 1} - ${endIndex} trong tổng số ${totalRows} dòng`}
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary small">Hiển thị</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 80 }}
                value={pagination.limit}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    limit: Number(e.target.value),
                    page: 1, // reset về trang 1 khi đổi page size
                  }))
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  {/* Prev */}
                  <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => {
                        if (pagination.page > 1) {
                          setPagination(prev => ({ ...prev, page: prev.page - 1 }));
                        }
                      }}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </li>
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - pagination.page) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis if needed
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          <li className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page }))}
                            >
                              {page}
                            </button>
                          </li>
                        </React.Fragment>
                      );
                    })}
                  {/* Next */}
                  <li className={`page-item ${pagination.page >= totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => {
                        if (pagination.page < totalPages) {
                          setPagination(prev => ({ ...prev, page: prev.page + 1 }));
                        }
                      }}
                      disabled={pagination.page >= totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        {!isMember && (
          <AddMemberModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={() => setShowModal(false)}
          />
        )}

        <ConfirmModal
          show={confirmModal.show}
          onClose={() =>
            setConfirmModal({ show: false, type: null, member: null })
          }
          onConfirm={handleConfirmDelete}
          message={getConfirmMessage()}
          isLoading={isDeleting}
        />
      </div>
    </UserLayout>
  );
}
