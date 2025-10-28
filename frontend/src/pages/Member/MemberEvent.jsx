import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';

function MemberCard({ name = 'Thành viên', role = 'Măng Định', avatar, department, eventName }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <img src={avatar || "https://i.pravatar.cc/100?img=12"} className="rounded-circle" style={{ width: 56, height: 56 }} />
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
    <div className="border rounded-3 mb-3" style={{ borderColor: '#e5e7eb' }}>
      <button onClick={() => setOpen(!open)} className="w-100 d-flex align-items-center justify-content-between px-3 py-3 bg-white" style={{ border: 0 }}>
        <span className="fw-semibold text-dark">{title} ({count})</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>
      {open && <div className="px-3 pb-3 bg-white">{children}</div>}
    </div>
  );
}

export default function MemberPage() {
  const { eventId } = useParams();
  const [allMembersByDepartment, setAllMembersByDepartment] = useState({});
  const [filteredMembersByDepartment, setFilteredMembersByDepartment] = useState({});
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Load members once when component mounts
  useEffect(() => {
    const loadMembers = async () => {
      if (!eventId) return;
      
      setLoading(true);
      setError('');
      try {
        const response = await eventApi.getMembersByEvent(eventId);
        setAllMembersByDepartment(response.data || {});
        setEvent(response.event);
      } catch (err) {
        console.error('Error loading members:', err.message);
        setError('Không thể tải danh sách thành viên');
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
      const filteredMembers = members.filter(member => 
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

  if (loading) {
    return (
      <UserLayout title="Thành viên" activePage="members" sidebarType="hooc">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error) {
    return (
      <UserLayout title="Thành viên" activePage="members" sidebarType="hooc">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title={`Thành viên - Sự kiện ${event?.name}`} activePage="members" sidebarType="hooc">
      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="position-relative">
            <input 
              placeholder="Tìm kiếm thành viên..." 
              className="form-control ps-5" 
              style={{ width: 320, background: '#F9FAFB' }} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">🔍</span>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <a className="btn btn-danger" href="/manage-member">Quản lý thành viên</a>
          </div>
        </div>

        {Object.keys(filteredMembersByDepartment).length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">
              {search ? 'Không tìm thấy thành viên nào phù hợp' : 'Chưa có thành viên nào trong sự kiện này'}
            </p>
          </div>
        ) : (
          Object.entries(filteredMembersByDepartment).map(([departmentName, members]) => (
            <Accordion key={departmentName} title={departmentName} count={members.length}>
              <div className="row g-3 pt-2">
                {members.map((member) => (
                  <div key={member.id} className="col-sm-6 col-lg-4 col-xl-3">
                    <div className="card h-100 p-3">
                      <MemberCard 
                        name={member.name}
                        role={member.role}
                        avatar={member.avatar}
                        department={member.department}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>
          ))
        )}

        <div className="mt-3">
          <button className="btn" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
            Rời sự kiện
          </button>
        </div>
      </div>
    </UserLayout>
  );
}


