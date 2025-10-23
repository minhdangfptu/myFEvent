import { useEffect, useMemo, useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { eventApi } from '../../apis/eventApi';
import { useLocation } from 'react-router-dom';

export default function EventDetailPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const eventId = params.get('id');

  const [event, setEvent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const res = await eventApi.getById(eventId);
        if (!ignore) {
          setEvent(res.data.event);
          setMembers(res.data.members || []);
        }
      } catch (e) {
        if (!ignore) setError(e.response?.data?.message || 'Không thể tải sự kiện');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [eventId]);

  // ====== TRẠNG THÁI ĐÁNH GIÁ ======
  const [comments, setComments] = useState([
    { id: 1, name: 'Minh', rating: 5, content: 'Không khí rất tuyệt, trang trí ấn tượng!', createdAt: new Date('2025-10-10T15:24:00') },
    { id: 2, name: 'Lan', rating: 4, content: 'Âm thanh ổn, nhưng hơi đông ở khu check-in.', createdAt: new Date('2025-10-12T09:10:00') },
  ]);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userName, setUserName] = useState('');
  const [userComment, setUserComment] = useState('');

  const averageRating =
    comments.length === 0
      ? 0
      : Math.round(
          (comments.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / comments.length) * 10
        ) / 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userRating || !userComment.trim()) return;

    setComments(prev => [
      {
        id: Date.now(),
        name: userName.trim() || 'Bạn',
        rating: userRating,
        content: userComment.trim(),
        createdAt: new Date(),
      },
      ...prev,
    ]);
    // reset
    setUserRating(0);
    setHoverRating(0);
    setUserName('');
    setUserComment('');
  };

  const formatDateTime = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${day}/${month}/${year} ${hh}:${mm}`;
  };

  return (
    <UserLayout title="Trang chi tiết sự kiện" activePage="home">
      <style>{`
        .hero {
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          border: 1px solid #E5E7EB;
          box-shadow: 0 2px 10px rgba(0,0,0,.05);
        }
        .hero-cover {
          height: 320px;
          background: #f3f4f6;
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .hero-cover::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(to top, rgba(0,0,0,.35), rgba(0,0,0,0));
        }
        .hero-body {
          padding: 18px 18px 8px 18px;
          background: #fff;
        }

        .chip { 
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px; border-radius: 999px; font-size: 12px;
          border: 1px solid #E5E7EB; background: #F9FAFB; color: #374151;
        }

        .card-soft {
          background:#fff; border:1px solid #E5E7EB; border-radius:16px;
          box-shadow:0 1px 2px rgba(16,24,40,.04);
        }

        .section-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .muted { color:#6B7280; }

        /* ĐÁNH GIÁ */
        .stars { display:flex; gap:6px; }
        .star {
          font-size: 24px; cursor: pointer; line-height: 1;
          transition: transform .1s ease-in-out;
        }
        .star:hover { transform: translateY(-1px) scale(1.05); }

        .active-red { background:#FEE2E2 !important; color:#991B1B !important; }
        .btn-danger-soft {
          background:#EF4444; color:#fff; border:none; padding:10px 16px; border-radius:10px;
        }
        .btn-danger-soft:hover { background:#DC2626; }

        .comment-item { border-bottom: 1px solid #F1F5F9; padding-bottom: 12px; margin-bottom: 12px; }
        .rounded-12 { border-radius: 12px; }
      `}</style>

      {/* ====== HERO / TỔNG QUAN SỰ KIỆN ====== */}
      {loading && <div className="alert alert-info">Đang tải sự kiện...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && event && (
      <div className="hero mb-4">
        <div
          className="hero-cover"
          style={{ backgroundImage: `url(${event.cover || '/api/placeholder/1200/600'})` }}
        />
        <div className="hero-body">
          <div className="row g-3 align-items-center">
            <div className="col-lg-8">
              <h2 className="mb-1">{event.name || event.title}</h2>
              {event.description && <p className="muted mb-2">{event.description}</p>}
              <div className="d-flex flex-wrap gap-2">
                <span className="chip">
                  <i className="bi bi-lightning-charge-fill"></i>
                  {event.status || 'scheduled'}
                </span>
                <span className="chip">
                  <i className="bi bi-calendar-event"></i>
                  {new Date(event.eventDate || Date.now()).toLocaleDateString('vi-VN')}
                </span>
                <span className="chip">
                  <i className="bi bi-geo-alt"></i>
                  {event.location || 'FPT University'}
                </span>
                <span className="chip">
                  <i className="bi bi-people-fill"></i>
                  Đơn vị tổ chức: <b className="text-danger">{event.organizer || 'HoOC'}</b>
                </span>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card-soft p-3">
                <div className="fw-semibold mb-2">Thành viên ({members.length})</div>
                <div className="d-flex flex-wrap gap-2">
                  {members.slice(0, 9).map((m, i) => (
                    <img key={m._id || i} src={`https://i.pravatar.cc/100?img=${(i+7)%70}`} className="rounded-circle" style={{ width:32, height:32 }} title={m.userId?.fullName || m.userId?.email || 'Member'} />
                  ))}
                  {members.length > 9 && (
                    <div className="rounded-circle d-flex align-items-center justify-content-center bg-light border" style={{ width:32, height:32 }}>+{members.length - 9}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ====== CHI TIẾT SỰ KIỆN ====== */}
      <div className="card-soft p-4 mb-4">
        <div className="section-title">Chi tiết sự kiện</div>
        <div className="row g-3">
          <div className="col-lg-6">
            <p className="muted">
              Sự kiện nhằm tạo sân chơi kết nối sinh viên, lan tỏa tinh thần sáng tạo và tinh thần cộng đồng.
            </p>
            <p className="muted">
              Khu vực hoạt động chính: check-in, gian hàng, sân khấu biểu diễn và không gian trải nghiệm.
            </p>
          </div>
          <div className="col-lg-6">
            <div className="p-3 rounded-12" style={{ background:'#FFF7ED', border:'1px solid #FED7AA' }}>
              <div className="fw-semibold mb-1">Lưu ý từ Ban tổ chức</div>
              <div className="muted">Vui lòng theo dõi thông báo từ Ban tổ chức để cập nhật timeline chi tiết và sơ đồ khu vực.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== ĐÁNH GIÁ ====== */}
      <div className="card-soft p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="section-title mb-0">Đánh giá</div>
          <div className="d-flex align-items-center gap-2">
            <span className="muted">Điểm trung bình:</span>
            <strong>{averageRating.toFixed(1)}/5</strong>
            <div className="stars ms-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const idx = i + 1;
                return (
                  <i
                    key={idx}
                    className={`bi ${averageRating >= idx ? 'bi-star-fill' : (averageRating >= idx - 0.5 ? 'bi-star-half' : 'bi-star')}`}
                    style={{ fontSize: 18, color: '#F59E0B' }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Form đánh giá */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="row g-3">
            <div className="col-lg-4">
              <label className="form-label">Tên của bạn (tuỳ chọn)</label>
              <input
                className="form-control"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nhập tên..."
              />
            </div>
            <div className="col-lg-8">
              <label className="form-label">Chấm sao</label>
              <div className="stars">
                {Array.from({ length: 5 }).map((_, i) => {
                  const index = i + 1;
                  const filled = (hoverRating || userRating) >= index;
                  return (
                    <i
                      key={index}
                      className={`star bi ${filled ? 'bi-star-fill' : 'bi-star'}`}
                      style={{ color: filled ? '#F59E0B' : '#9CA3AF' }}
                      onMouseEnter={() => setHoverRating(index)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(index)}
                      role="button"
                      aria-label={`Chấm ${index} sao`}
                    />
                  );
                })}
                <span className="ms-2 muted">{userRating ? `${userRating}/5` : 'Chưa chấm'}</span>
              </div>
            </div>
            <div className="col-12">
              <label className="form-label">Nhận xét của bạn</label>
              <textarea
                className="form-control"
                rows={3}
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận về sự kiện..."
                required
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button type="submit" className="btn btn-danger-soft">
                Gửi đánh giá
              </button>
            </div>
          </div>
        </form>

        {/* Danh sách bình luận */}
        <div>
          {comments.length === 0 ? (
            <div className="text-center muted py-3">
              Chưa có đánh giá nào. Hãy là người đầu tiên!
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="comment-item">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <div className="fw-semibold">{c.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{formatDateTime(c.createdAt)}</div>
                </div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="stars" aria-label={`${c.rating} trên 5 sao`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={`bi ${c.rating >= i + 1 ? 'bi-star-fill' : 'bi-star'}`}
                        style={{ color: '#F59E0B', fontSize: 16 }}
                      />
                    ))}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{c.rating}/5</span>
                </div>
                <div className="muted">{c.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </UserLayout>
  );
}
