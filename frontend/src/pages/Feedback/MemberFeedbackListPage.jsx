import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import Loading from '../../components/Loading';
import { feedbackApi } from '../../apis/feedbackApi';
import { useEvents } from '../../contexts/EventContext';

const getSidebarType = (role) => {
  if (role === 'HoOC') return 'HoOC';
  if (role === 'HoD') return 'HoD';
  if (role === 'Member') return 'Member';
  return 'user';
};

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('vi-VN');
};

export default function MemberFeedbackListPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [eventRole, setEventRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const role = await fetchEventRole(eventId);
      setEventRole(role);
      const res = await feedbackApi.getAvailableForms(eventId);
      setForms(res.data || []);
      setError('');
    } catch (err) {
      console.error('Error loading feedback forms:', err);
      const message = err.response?.data?.message || 'Không thể tải danh sách biểu mẫu';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (form) => {
    navigate(`/events/${eventId}/feedback/forms/${form._id}/respond`, { state: { form } });
  };

  const now = new Date();

  const content = (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
          Phản hồi sự kiện
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Hãy hoàn thành phản hồi để giúp BTC đánh giá chất lượng sự kiện tốt hơn. Mỗi biểu mẫu chỉ gửi được một lần.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #fca5a5', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {forms.length === 0 && !error ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
          <i className="bi bi-clipboard-check" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
          <p>Hiện chưa có biểu mẫu nào dành cho bạn.</p>
        </div>
      ) : (
        forms.map((form) => {
          const openTime = new Date(form.openTime);
          const closeTime = new Date(form.closeTime);
          const isActive = form.status === 'open' && openTime <= now && closeTime >= now;
          const submitted = form.submitted;

          return (
            <div
              key={form._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '16px',
                backgroundColor: '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                    {form.name}
                  </h3>
                  {form.description && (
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                      {form.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#6b7280' }}>
                    <span><i className="bi bi-clock-history me-1"></i>Mở: {formatDateTime(form.openTime)}</span>
                    <span><i className="bi bi-hourglass me-1"></i>Đóng: {formatDateTime(form.closeTime)}</span>
                    {submitted ? (
                      <span style={{ color: '#10b981', fontWeight: '600' }}>
                        <i className="bi bi-check2-circle me-1"></i>Đã gửi
                      </span>
                    ) : isActive ? (
                      <span style={{ color: '#10b981', fontWeight: '600' }}>
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>Đang mở
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280', fontWeight: '600' }}>
                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>Ngoài thời gian
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => handleOpenForm(form)}
                    disabled={!isActive || submitted}
                    style={{
                      backgroundColor: (!isActive || submitted) ? '#d1d5db' : '#2563eb',
                      color: (!isActive || submitted) ? '#6b7280' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: (!isActive || submitted) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitted ? 'Đã gửi' : isActive ? 'Trả lời ngay' : 'Ngoài thời gian'}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (loading) {
    return (
      <UserLayout title="Phản hồi sự kiện" sidebarType={getSidebarType(eventRole)} activePage="feedback" eventId={eventId}>
        <div style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loading size={90} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Phản hồi sự kiện" sidebarType={getSidebarType(eventRole)} activePage="feedback" eventId={eventId}>
      {content}
    </UserLayout>
  );
}

