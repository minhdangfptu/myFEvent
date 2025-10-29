import { useMemo, useState, useEffect } from "react";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import { useLocation } from "react-router-dom";
import { useEvents } from "../../contexts/EventContext";
import { getEventIdFromUrl } from "../../utils/getEventIdFromUrl";

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
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const location = useLocation();
  const { events: myEvents } = useEvents();

  // Prefetched from MemberEvent
  const prefetchedEvent = location.state?.event || null;
  const prefetchedMembersByDepartment = location.state?.membersByDepartment || null;

  const currentEventId = useMemo(
    () => getEventIdFromUrl(location.pathname, location.search),
    [location]
  );

  // Xác định event hiện tại: ưu tiên dữ liệu truyền sang, sau đó đến context, cuối cùng là URL
  const currentEvent = useMemo(() => {
    if (prefetchedEvent) return prefetchedEvent;
    const list = Array.isArray(myEvents) ? myEvents : [];
    const idFromUrl = currentEventId;
    const fallbackId = list[0]?._id || list[0]?.id;
    const targetId = idFromUrl || fallbackId;
    return list.find((e) => (e._id || e.id) === targetId) || null;
  }, [prefetchedEvent, myEvents, currentEventId]);

  // Đồng bộ selectedEvent để dùng khi cần gọi API fallback
  useEffect(() => {
    const id = (currentEvent?._id || currentEvent?.id) || "";
    if (id && selectedEvent !== id) setSelectedEvent(id);
  }, [currentEvent, selectedEvent]);

  // Nếu có dữ liệu prefetched, flatten ngay và không gọi API
  useEffect(() => {
    const usePrefetched = async () => {
      if (!prefetchedMembersByDepartment) return false;
      setLoading(true);
      try {
        const normalized = Object.entries(prefetchedMembersByDepartment).flatMap(
          ([deptName, members]) =>
            (members || []).map((m, idx) => ({
              id: m.id || m._id || m.email || `${deptName}-${idx}`,
              avatar:
                m.avatar ||
                m.avatarUrl ||
                m.photoUrl ||
                "https://i.pravatar.cc/100?u=" + (m.email || m._id || idx),
              name: m.name || m.fullName || m.displayName || m.email || "Không rõ",
              dept: deptName || m.department || m.departmentName || "—",
              role: m.role || m.membership || "Member",
            }))
        );
        setMembers(normalized);
        setPagination((p) => ({
          ...p,
          total: normalized.length,
          totalPages: Math.max(1, Math.ceil(normalized.length / p.limit)),
        }));
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

  // Fallback: nếu không có prefetched thì gọi API
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
          name: m.fullName || m.name || m.displayName || m.email || "Không rõ",
          dept: m.department?.name || m.departmentName || m.dept || "—",
          role: m.role || m.membership || "Member",
        }));
        setMembers(normalized);
        setPagination((p) => ({
          ...p,
          total: normalized.length,
          totalPages: Math.max(1, Math.ceil(normalized.length / p.limit)),
        }));
      } catch (err) {
        console.error("Error loading members:", err);
        setError("Không thể tải danh sách thành viên");
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [prefetchedMembersByDepartment, selectedEvent]);

  const filtered = members.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <UserLayout
      title="Quản lý thành viên sự kiện"
      sidebarType="hooc"
      activePage="members"
      showSearch={false}
    >
      <style>{`
				.cell-action{cursor:pointer}
				.table thead th{font-size:12px;color:#6b7280;font-weight:600;border-bottom-color:#e5e7eb}
			`}</style>
      <div className="container-fluid" style={{ maxWidth: 1150 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="fw-semibold" style={{ color: "#EF4444" }}>
              {" "}
              Danh sách thành viên sự kiện {currentEvent?.name || "Sự kiện của bạn"}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-danger d-inline-flex align-items-center gap-2"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus" />
              Thêm thành viên
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="position-relative"
            style={{ maxWidth: 300, width: "100%" }}
          >
            <i
              className="bi bi-search position-absolute"
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
              <option>Tên</option>
              <option>Ban</option>
              <option>Vai trò</option>
            </select>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: 48, fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                    <input className="form-check-input" type="checkbox" />
                  </th>
                  <th style={{  fontSize: "14px", fontWeight: "500", color: "#374151" }} >Ảnh</th>
                  <th style={{  fontSize: "14px", fontWeight: "500", color: "#374151" }}>Tên</th>
                  <th style={{  fontSize: "14px", fontWeight: "500", color: "#374151" }}>Ban</th>
                  <th style={{  fontSize: "14px", fontWeight: "500", color: "#374151" }}>Vai trò</th>
                  <th style={{ width: 56, fontSize: "14px", fontWeight: "500", color: "#374151" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input  className="form-check-input" type="checkbox" />
                    </td>
                    <td>
                      <img
                        src={r.avatar}
                        className="rounded-circle"
                        style={{ width: 28, height: 28 }}
                      />
                    </td>
                    <td style={{ padding: "10px", fontWeight: "500", color: "#374151" }}>{r.name}</td>
                    <td>{r.dept}</td>
                    <td>{r.role}</td>
                    <td className="cell-action text-end">
                      <i className="bi bi-three-dots" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top">
            <div className="text-secondary small">
              Dòng 1 - 10 trong tổng số {members.length} dòng
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary small">Hiển thị</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 72 }}
                defaultValue={10}
              >
                <option>10</option>
                <option>20</option>
              </select>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className="page-item">
                    <a className="page-link" href="#">
                      «
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      1
                    </a>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">2</span>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      3
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#">
                      »
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>

        <AddMemberModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => setShowModal(false)}
        />
      </div>
    </UserLayout>
  );
}
