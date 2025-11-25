import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import { feedbackApi } from '../../apis/feedbackApi';
import { eventApi } from '../../apis/eventApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';

export default function ManageFeedbackEventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);
  const [eventRole, setEventRole] = useState('');
  const [event, setEvent] = useState(null);
  const [forms, setForms] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [actionState, setActionState] = useState({ id: null, type: '' });

  useEffect(() => {
    if (eventId) {
      loadEventRole();
      loadEvent();
      loadForms();
    }
  }, [eventId, currentPage]);

  const loadEventRole = async () => {
    try {
      const role = await fetchEventRole(eventId);
      setEventRole(role);
      if (role !== 'HoOC') {
        navigate(`/events/${eventId}/feedback/member`, { replace: true });
      }
    } catch (error) {
      console.error('Error loading role:', error);
    }
  };

  const loadEvent = async () => {
    try {
      const res = await eventApi.getAllEventDetail(eventId);
      // backend may return { data: { event } } or { data: event }
      const fetchedEvent = res?.data?.event || res?.data || res?.event || res;
      setEvent(fetchedEvent);
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Không thể tải thông tin sự kiện');
    }
  };

  const loadForms = async () => {
    try {
      setLoading(true);
      const res = await feedbackApi.listFormsByEvent(eventId, currentPage, 10);
      setForms(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1 });
    } catch (error) {
      console.error('Error loading forms:', error);
      toast.error('Không thể tải danh sách biểu mẫu');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = async (formId) => {
    try {
      setActionState({ id: formId, type: 'close' });
      await feedbackApi.closeForm(eventId, formId);
      toast.success('Đóng biểu mẫu thành công');
      loadForms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể đóng biểu mẫu');
    } finally {
      setActionState({ id: null, type: '' });
    }
  };

  const handleReopenForm = async (formId) => {
    try {
      setActionState({ id: formId, type: 'reopen' });
      const res = await feedbackApi.reopenForm(eventId, formId);
      toast.success(res?.message || 'Mở lại biểu mẫu thành công');
      loadForms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể mở lại biểu mẫu');
    } finally {
      setActionState({ id: null, type: '' });
    }
  };

  const handleDeleteForm = async (formId) => {
    const confirm = window.confirm('Bạn chắc chắn muốn xoá biểu mẫu này? Hành động không thể hoàn tác.');
    if (!confirm) return;
    try {
      setActionState({ id: formId, type: 'delete' });
      await feedbackApi.deleteForm(eventId, formId);
      toast.success('Đã xoá biểu mẫu');
      loadForms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xoá biểu mẫu');
    } finally {
      setActionState({ id: null, type: '' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    if (status === 'open') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
          Đang mở
        </span>
      );
    } else if (status === 'closed') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b7280' }}></span>
          Đã đóng
        </span>
      );
    } else {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9ca3af' }}></span>
          Nháp
        </span>
      );
    }
  };

  if (loading && !forms.length) {
    return (
      <UserLayout title="Phản hồi/Đánh giá sự kiện" sidebarType="hooc" activePage="feedback" eventId={eventId}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading size={100} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Phản hồi/Đánh giá sự kiện" sidebarType="hooc" activePage="feedback" eventId={eventId}>
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                Biểu mẫu phản hồi sự kiện
              </h1>
              {event && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                  <i className="bi bi-calendar-event"></i>
                  <span>Sự kiện: {event.name}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(`/events/${eventId}/feedback/create`)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="bi bi-plus-lg"></i>
              Tạo biểu mẫu mới
            </button>
          </div>

          {forms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <i className="bi bi-inbox" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
              <p>Chưa có biểu mẫu phản hồi nào</p>
              <button
                onClick={() => navigate(`/events/${eventId}/feedback/create`)}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                Tạo biểu mẫu đầu tiên
              </button>
            </div>
          ) : (
            <>
              {forms.map((form) => (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                        {form.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                          <i className="bi bi-calendar"></i>
                          <span>Tạo ngày {formatDate(form.createdAt)}</span>
                        </div>
                        {getStatusBadge(form.status)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {(form.status === 'open' || form.status === 'closed') && (
                        <button
                          onClick={() => navigate(`/events/${eventId}/feedback/${form._id}/summary`)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '6px 12px'
                          }}
                        >
                          Xem phản hồi
                        </button>
                      )}
                      {form.status === 'draft' && (
                        <>
                          <button
                            onClick={() => navigate(`/events/${eventId}/feedback/${form._id}/edit`)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '6px 12px'
                            }}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={async () => {
                              setActionState({ id: form._id, type: 'publish' });
                              try {
                                await feedbackApi.publishForm(eventId, form._id);
                                toast.success('Xuất bản biểu mẫu thành công');
                                loadForms();
                              } catch (err) {
                                toast.error(err.response?.data?.message || 'Không thể xuất bản biểu mẫu');
                              } finally {
                                setActionState({ id: null, type: '' });
                              }
                            }}
                            disabled={actionState.id === form._id && actionState.type === 'publish'}
                            style={{
                              backgroundColor: '#dc2626',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '6px',
                              padding: '6px 16px',
                              fontSize: '14px',
                              cursor: actionState.id === form._id && actionState.type === 'publish' ? 'not-allowed' : 'pointer',
                              opacity: actionState.id === form._id && actionState.type === 'publish' ? 0.7 : 1
                            }}
                          >
                            {actionState.id === form._id && actionState.type === 'publish' ? 'Đang xuất bản...' : 'Xuất bản'}
                          </button>
                        </>
                      )}
                      {form.status !== 'draft' && (
                        <button
                          onClick={() => navigate(`/events/${eventId}/feedback/${form._id}/edit`)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#2563eb',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '6px 12px'
                          }}
                        >
                          Xem mẫu
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteForm(form._id)}
                        disabled={actionState.id === form._id && actionState.type === 'delete'}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid #9ca3af',
                          color: '#6b7280',
                          borderRadius: '6px',
                          padding: '6px 16px',
                          fontSize: '14px',
                          cursor: actionState.id === form._id && actionState.type === 'delete' ? 'not-allowed' : 'pointer',
                          opacity: actionState.id === form._id && actionState.type === 'delete' ? 0.6 : 1
                        }}
                      >
                        {actionState.id === form._id && actionState.type === 'delete' ? 'Đang xoá...' : 'Xoá'}
                      </button>
                      {form.status === 'open' && (
                        <button
                          onClick={() => handleCloseForm(form._id)}
                          disabled={actionState.id === form._id && actionState.type === 'close'}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            borderRadius: '6px',
                            padding: '6px 16px',
                            fontSize: '14px',
                            cursor: actionState.id === form._id && actionState.type === 'close' ? 'not-allowed' : 'pointer',
                            opacity: actionState.id === form._id && actionState.type === 'close' ? 0.6 : 1
                          }}
                        >
                          {actionState.id === form._id && actionState.type === 'close' ? 'Đang đóng...' : 'Đóng form'}
                        </button>
                      )}
                      {form.status === 'closed' && (
                        <button
                          onClick={() => handleReopenForm(form._id)}
                          disabled={actionState.id === form._id && actionState.type === 'reopen'}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #10b981',
                            color: '#10b981',
                            borderRadius: '6px',
                            padding: '6px 16px',
                            fontSize: '14px',
                            cursor: actionState.id === form._id && actionState.type === 'reopen' ? 'not-allowed' : 'pointer',
                            opacity: actionState.id === form._id && actionState.type === 'reopen' ? 0.6 : 1
                          }}
                        >
                          {actionState.id === form._id && actionState.type === 'reopen' ? 'Đang mở...' : 'Mở lại'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    &lt;
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        background: currentPage === i + 1 ? '#2563eb' : 'white',
                        color: currentPage === i + 1 ? 'white' : '#111827',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: '6px',
                      cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === pagination.totalPages ? 0.5 : 1
                    }}
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
}


