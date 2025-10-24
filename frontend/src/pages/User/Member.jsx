import { useState, useMemo } from 'react';
import UserLayout from '../../components/UserLayout';

function MemberCard({ name = 'Thành viên', role = 'Măng Định' }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <img src="https://i.pravatar.cc/100?img=12" className="rounded-circle" style={{ width: 56, height: 56 }} />
      <div className="lh-sm">
        <div className="fw-semibold text-dark">{name}</div>
        <div className="small text-muted">{role}</div>
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

export default function ThanhVienPage() {
  const banNoiDung = useMemo(() => Array.from({ length: 5 }), []);
  const banHauCan = useMemo(() => Array.from({ length: 9 }), []);

  return (
    <UserLayout title="Thành viên" activePage="members">
      <div className="container-fluid" style={{ maxWidth: 1100 }}>
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="position-relative">
            <input placeholder="Search" className="form-control ps-5" style={{ width: 320, background: '#F9FAFB' }} />
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">🔍</span>
          </div>
          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="small text-muted">Sort by:</span>
            <select className="form-select form-select-sm" style={{ width: 160 }}>
              <option>Newest</option>
              <option>Oldest</option>
            </select>
            <a className="btn btn-danger" href="/manage-member">Quản lý thành viên</a>
          </div>
        </div>

        <Accordion title="TBTC" count={1}>
          <div className="row g-3 pt-2">
            <div className="col-sm-6 col-lg-4 col-xl-3">
              <div className="card h-100 p-3">
                <MemberCard name="Trưởng ban" />
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion title="Ban nội dung" count={5}>
          <div className="row g-3 pt-2">
            {banNoiDung.map((_, i) => (
              <div key={i} className="col-sm-6 col-lg-4 col-xl-3">
                <div className="card h-100 p-3">
                  <MemberCard />
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion title="Ban hậu cần" count={9}>
          <div className="row g-3 pt-2">
            {banHauCan.map((_, i) => (
              <div key={i} className="col-sm-6 col-lg-4 col-xl-3">
                <div className="card h-100 p-3">
                  <MemberCard />
                </div>
              </div>
            ))}
          </div>
        </Accordion>

        <div className="mt-3">
          <button className="btn" style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
            Rời sự kiện
          </button>
        </div>
      </div>
    </UserLayout>
  );
}


