import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import Loading from '../../components/Loading';
import { feedbackApi } from '../../apis/feedbackApi';
import { useEvents } from '../../contexts/EventContext';
import { ArrowLeft, Clock, Star } from "lucide-react";


const getSidebarType = (role) => {
  if (role === 'HoOC') return 'HoOC';
  if (role === 'HoD') return 'HoD';
  if (role === 'Member') return 'Member';
  return 'user';
};


export default function SubmitFeedbackResponsePage() {
  const { eventId, formId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchEventRole } = useEvents();

  const [eventRole, setEventRole] = useState('');
  const [form, setForm] = useState(location.state?.form || null);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(!location.state?.form);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRatings, setHoveredRatings] = useState({});

  useEffect(() => {
    if (!eventId || !formId) return;
    const initialize = async () => {
      const role = await fetchEventRole(eventId);
      setEventRole(role);
      if (!form) {
        await loadForm();
      }
    };
    initialize().catch((err) => {
      console.error('Init feedback respond error:', err);
      toast.error('Không thể tải biểu mẫu');
      navigate(`/events/${eventId}/feedback/member`, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, formId]);

  const loadForm = async () => {
    setLoading(true);
    try {
      const res = await feedbackApi.getAvailableForms(eventId);
      const available = res.data || [];
      const target = available.find((item) => item._id === formId);
      if (!target) {
        toast.error('Biểu mẫu không còn khả dụng');
        navigate(`/events/${eventId}/feedback/member`, { replace: true });
        return;
      }
      setForm(target);
    } catch (err) {
      console.error('Error fetching member form:', err);
      toast.error(err.response?.data?.message || 'Không thể tải biểu mẫu');
      navigate(`/events/${eventId}/feedback/member`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const isSubmitted = form?.submitted;

  const handleAnswerChange = (index, value) => {
    setResponses((prev) => ({ ...prev, [index]: value }));
  };

  const handleMultipleChoiceToggle = (index, option) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[index]) ? prev[index] : [];
      if (current.includes(option)) {
        return { ...prev, [index]: current.filter((opt) => opt !== option) };
      }
      return { ...prev, [index]: [...current, option] };
    });
  };

  const canSubmit = useMemo(() => {
    if (!form || isSubmitted) return false;
    const now = new Date();
    const openTime = new Date(form.openTime);
    const closeTime = new Date(form.closeTime);
    return form.status === 'open' && openTime <= now && closeTime >= now;
  }, [form, isSubmitted]);

  const handleSubmit = async () => {
    if (!form) return;
    if (!canSubmit) {
      toast.error('Biểu mẫu đã đóng hoặc không còn hiệu lực');
      return;
    }

    const payload = [];
    for (let i = 0; i < form.questions.length; i += 1) {
      const question = form.questions[i];
      const answer = responses[i];

      if (question.required) {
        const isEmptyArray = Array.isArray(answer) && answer.length === 0;
        if (
          answer === undefined ||
          answer === null ||
          answer === '' ||
          isEmptyArray
        ) {
          toast.error(`Vui lòng trả lời câu hỏi ${i + 1}`);
          return;
        }
      }

      if (answer !== undefined && answer !== null && answer !== '') {
        if (question.questionType === 'rating') {
          const ratingValue = Number(answer);
          if (Number.isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            toast.error(`Điểm đánh giá ở câu hỏi ${i + 1} không hợp lệ`);
            return;
          }
          payload.push({ questionId: i.toString(), answer: ratingValue });
        } else if (question.questionType === 'multiple-choice') {
          const selections = Array.isArray(answer) ? answer : [];
          if (selections.length === 0 && question.required) {
            toast.error(`Vui lòng chọn ít nhất một lựa chọn cho câu hỏi ${i + 1}`);
            return;
          }
          if (selections.length > 0) {
            payload.push({ questionId: i.toString(), answer: selections });
          }
        } else if (question.questionType === 'yes-no') {
          payload.push({ questionId: i.toString(), answer: Boolean(answer) });
        } else {
          payload.push({ questionId: i.toString(), answer });
        }
      }
    }

    if (payload.length === 0) {
      toast.error('Vui lòng điền ít nhất một câu trả lời');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackApi.submitResponse(eventId, formId, payload);
      toast.success('Gửi phản hồi thành công');
      navigate(`/events/${eventId}/feedback/member`, { replace: true });
    } catch (err) {
      console.error('Submit feedback error:', err);
      toast.error(err.response?.data?.message || 'Không thể gửi phản hồi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) {
    return (
      <UserLayout title="Phản hồi sự kiện" sidebarType={getSidebarType(eventRole)} activePage="feedback" eventId={eventId}>
        <div style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loading size={90} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title={form.name} sidebarType={getSidebarType(eventRole)} activePage="feedback" eventId={eventId}>
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginBottom: '16px', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={18} />
              Quay lại danh sách
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>{form.name}</h1>
            {form.description && <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>{form.description}</p>}
            <div style={{ color: '#6b7280', fontSize: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span><i className="bi bi-clock me-1"></i>Mở: {new Date(form.openTime).toLocaleString('vi-VN')}</span>
              <span><i className="bi bi-hourglass me-1"></i>Đóng: {new Date(form.closeTime).toLocaleString('vi-VN')}</span>
              {isSubmitted && (
                <span style={{ color: '#10b981', fontWeight: '600' }}>
                  <i className="bi bi-check2-circle me-1"></i>Đã gửi
                </span>
              )}
            </div>
          </div>

          {form.questions.map((question, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '16px',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                {question.questionText} {question.required && <span style={{ color: '#dc2626' }}>*</span>}
              </div>
              {question.questionType === 'rating' && (
                <div 
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                  onMouseLeave={() => setHoveredRatings(prev => ({ ...prev, [index]: null }))}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const currentRating = responses[index];
                    const hoveredValue = hoveredRatings[index];
                    const displayValue = hoveredValue !== null ? hoveredValue : currentRating;
                    const isSelected = displayValue >= value;
                    
                    return (
                      <button
                        key={value}
                        onClick={() => handleAnswerChange(index, value)}
                        onMouseEnter={() => {
                          if (canSubmit && !isSubmitted) {
                            setHoveredRatings(prev => ({ ...prev, [index]: value }));
                          }
                        }}
                        disabled={!canSubmit || isSubmitted}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '4px',
                          cursor: (!canSubmit || isSubmitted) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title={`${value} sao`}
                      >
                        <Star
                          size={32}
                          fill={isSelected ? '#fbbf24' : 'none'}
                          stroke={isSelected ? '#fbbf24' : '#d1d5db'}
                          strokeWidth={isSelected ? 0 : 2}
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {question.questionType === 'multiple-choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {question.options?.map((option, optIndex) => {
                    const isChecked = Array.isArray(responses[index]) && responses[index].includes(option);
                    return (
                      <label
                        key={optIndex}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          background: isChecked ? '#eff6ff' : '#fff',
                          cursor: (!canSubmit || isSubmitted) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMultipleChoiceToggle(index, option)}
                          disabled={!canSubmit || isSubmitted}
                        />
                        <span style={{ color: '#111827' }}>{option}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {question.questionType === 'text' && (
                <textarea
                  rows={4}
                  value={responses[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  disabled={!canSubmit || isSubmitted}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Nhập câu trả lời..."
                />
              )}

              {question.questionType === 'yes-no' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                  {[
                    { label: 'Có', value: true },
                    { label: 'Không', value: false },
                  ].map((item) => (
                    <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: (!canSubmit || isSubmitted) ? 'not-allowed' : 'pointer' }}>
                      <input
                        type="radio"
                        checked={responses[index] === item.value}
                        onChange={() => handleAnswerChange(index, item.value)}
                        disabled={!canSubmit || isSubmitted}
                      />
                      <span style={{ color: '#111827' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting || isSubmitted}
              style={{
                backgroundColor: (!canSubmit || submitting || isSubmitted) ? '#d1d5db' : '#2563eb',
                color: (!canSubmit || submitting || isSubmitted) ? '#6b7280' : 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (!canSubmit || submitting || isSubmitted) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitted ? 'Bạn đã gửi phản hồi' : submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

