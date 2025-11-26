import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import UserLayout from "../../components/UserLayout";
import { eventApi } from "../../apis/eventApi";
import Loading from "~/components/Loading";
import { useEvents } from "~/contexts/EventContext";

function MemberCard({
  name = "Thành viên",
  role = "Măng Định",
  avatar,
  department,
  eventName,
  onClick,
}) {
  return (
    <div 
      className="d-flex align-items-center gap-3"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <img
        src={avatar || "https://i.pravatar.cc/100?img=12"}
        className="rounded-circle"
        style={{ width: 56, height: 56 }}
      />
      <div className="lh-sm">
        <div className="fw-semibold text-dark">{name}</div>
        <div className="small text-muted">{role}</div>
        {department && <div className="small text-muted">{department}</div>}
        {eventName && <div className="small text-muted">{eventName}</div>}
      </div>
    </div>
  );
}

function Accordion({ title, count = 0, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-3 mb-3" style={{ borderColor: "#e5e7eb" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-100 d-flex align-items-center justify-content-between px-3 py-3 bg-white"
        style={{ border: 0 }}
      >
        <span className="fw-semibold text-dark">
          {title} ({count})
        </span>
        <span
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && <div className="px-3 pb-3 bg-white">{children}</div>}
    </div>
  );
}

export default function MemberPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [allMembersByDepartment, setAllMembersByDepartment] = useState({});
  const [filteredMembersByDepartment, setFilteredMembersByDepartment] =
    useState({});
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventRole, setEventRole] = useState('');
  const { fetchEventRole } = useEvents();

  // Load members once when component mounts
  useEffect(() => {
    const loadMembers = async () => {
      if (!eventId) return;

      setLoading(true);
      setError("");
      try {
        const response = await eventApi.getMembersByEvent(eventId);
        setAllMembersByDepartment(response.data || {});
        setEvent(response.event);
      } catch (err) {
        console.error("Error loading members:", err.message);
        setError("Không thể tải danh sách thành viên");
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, [eventId]);

  // Filter members based on search term
  useEffect(() => {
    if (!search.trim()) {
      setFilteredMembersByDepartment(allMembersByDepartment);
      return;
    }

    const filtered = {};
    const searchLower = search.toLowerCase();

    Object.entries(allMembersByDepartment).forEach(([deptName, members]) => {
      const filteredMembers = members.filter(
        (member) =>
          member.name.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.department.toLowerCase().includes(searchLower) ||
          member.role.toLowerCase().includes(searchLower)
      );

      if (filteredMembers.length > 0) {
        filtered[deptName] = filteredMembers;
      }
    });

    setFilteredMembersByDepartment(filtered);
  }, [search, allMembersByDepartment]);

  useEffect(() => {
      fetchEventRole(eventId).then(role => {
        setEventRole(role);
      });
    }, [eventId]);
    
  const getSidebarType = () => {
    if (eventRole === 'HoOC') return 'HoOC';
    if (eventRole === 'HoD') return 'HoD';
    if (eventRole === 'Member') return 'Member';
    return 'user';
  };
  
  const handleMemberClick = (memberId) => {
    navigate(`/events/${eventId}/members/${memberId}`);
  };

  if (loading) {
    return (
      <UserLayout title="Thành viên" activePage="members" sidebarType={getSidebarType()} eventId={eventId}>
        <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Loading />
          <div className="text-muted mt-3" style={{ fontSize: 16, fontWeight: 500 }}>Đang tải danh sách thành viên...</div>
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout title="Thành viên" activePage="members" sidebarType={getSidebarType()} eventId={eventId}>
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      title={`Thành viên - Sự kiện ${event?.name}`}
      activePage="members"
      sidebarType={getSidebarType()}
      eventId={eventId}
    >
      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="position-relative">
            <input
              placeholder="Tìm kiếm thành viên..."
              className="form-control ps-5"
              style={{ width: 320, background: "#F9FAFB" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
              🔍
            </span>
          </div>
          {eventRole === 'HoOC' && (
            <div className="ms-auto d-flex align-items-center gap-2">
              <Link
                className="btn btn-danger"
                to={`/events/${eventId}/hooc-manage-member`}
                state={{ event, membersByDepartment: allMembersByDepartment }}
              >
                Quản lý thành viên
              </Link>
            </div>
          )}
        </div>

        {Object.keys(filteredMembersByDepartment).length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">
              {search
                ? "Không tìm thấy thành viên nào phù hợp"
                : "Chưa có thành viên nào trong sự kiện này"}
            </p>
          </div>
        ) : (
          <>
            {/* Accordion cho Trưởng ban tổ chức (HoOC) */}
            {(() => {
              const hocMembers = [];
              Object.values(filteredMembersByDepartment).forEach((members) => {
                members.forEach((member) => {
                  if (member.role === "HoOC") {
                    hocMembers.push(member);
                  }
                });
              });

              return hocMembers.length > 0 ? (
                <Accordion
                  title="Đội Core (Core Team)"
                  count={hocMembers.length}
                >
                  <div className="row g-3 pt-2">
                    {hocMembers.map((member) => (
                      <div
                        key={member.id}
                        className="col-sm-6 col-lg-4 col-xl-3"
                      >
                        <div className="card h-100 p-3" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <MemberCard
                            name={member.name}
                            role={member.role === "HoOC" ? "Trưởng ban Tổ chức" : member.role === "HoD" ? "Trưởng ban" : "Thành viên"}
                            avatar={member.avatar}
                            department="Core Team"
                            onClick={() => handleMemberClick(member.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Accordion>
              ) : null;
            })()}

            {/* Accordion cho các ban khác (loại trừ HoOC) */}
            {Object.entries(filteredMembersByDepartment).map(
              ([departmentName, members]) => {
                const nonHocMembers = members.filter(
                  (member) => member.role !== "HoOC"
                );
                if (nonHocMembers.length === 0) return null;

                return (
                  <Accordion
                    key={departmentName}
                    title={departmentName}
                    count={nonHocMembers.length}
                  >
                    <div className="row g-3 pt-2">
                      {nonHocMembers.map((member) => (
                        <div
                          key={member.id}
                          className="col-sm-6 col-lg-4 col-xl-3"
                        >
                          <div className="card h-100 p-3" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                          >
                            <MemberCard
                              name={member.name}
                              role={member.role === "HoOC" ? "Trưởng ban Tổ chức" : member.role === "HoD" ? "Trưởng ban" : "Thành viên"}
                              avatar={member.avatar}
                              department={member.department}
                              onClick={() => handleMemberClick(member.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                );
              }
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}