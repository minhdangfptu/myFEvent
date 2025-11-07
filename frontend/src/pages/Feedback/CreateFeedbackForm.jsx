import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import { feedbackApi } from '../../apis/feedbackApi';
import { eventApi } from '../../apis/eventApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';

export default function CreateFeedbackForm() {
  const { eventId, formId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const isEdit = !!formId;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventRole, setEventRole] = useState('');
  const [event, setEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    openTime: '',
    closeTime: '',
    targetAudience: ['Member', 'HoD'], // Tự động set cho tất cả Member và HoD
    questions: []
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (eventId) {
      const initialize = async () => {
        try {
          await loadEventRole();
          await loadEvent();
          if (isEdit && formId) {
            await loadForm();
          } else {
            // For new form, set loading to false after role and event are loaded
            // Auto-set targetAudience to Member and HoD
            setFormData(prev => ({ ...prev, targetAudience: ['Member', 'HoD'] }));
            setLoading(false);
          }
        } catch (error) {
          console.error('Error initializing:', error);
          setLoading(false);
        }
      };
      initialize();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, formId]);

  const loadEventRole = async () => {
    try {
      const role = await fetchEventRole(eventId);
      setEventRole(role);
      if (role !== 'HoOC') {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/home-page');
        return;
      }
    } catch (error) {
      console.error('Error loading role:', error);
      setLoading(false);
      throw error;
    }
  };

  const loadEvent = async () => {
    try {
      const res = await eventApi.getAllEventDetail(eventId);
      setEvent(res.data);
    } catch (error) {
      console.error('Error loading event:', error);
      // Don't throw, just log - event loading is not critical for form creation
    }
  };

  const loadForm = async () => {
    try {
      setLoading(true);
      const res = await feedbackApi.getFormDetail(eventId, formId);
      const form = res.data;
      setFormData({
        name: form.name || '',
        description: form.description || '',
        openTime: form.openTime ? new Date(form.openTime).toISOString().slice(0, 16) : '',
        closeTime: form.closeTime ? new Date(form.closeTime).toISOString().slice(0, 16) : '',
        targetAudience: ['Member', 'HoD'], // Luôn set cho Member và HoD
        questions: form.questions || []
      });
    } catch (error) {
      toast.error('Không thể tải biểu mẫu');
      navigate(`/events/${eventId}/feedback`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionText: '',
          questionType: 'rating',
          options: [],
          required: false,
          order: prev.questions.length
        }
      ]
    }));
  };

  const handleRemoveQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i }))
    }));
  };

  const handleMoveQuestion = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.questions.length - 1) return;

    const newQuestions = [...formData.questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    newQuestions.forEach((q, i) => { q.order = i; });

    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleAddOption = (questionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: [...(q.options || []), ''] }
          : q
      )
    }));
  };

  const handleRemoveOption = (questionIndex, optionIndex) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
          : q
      )
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { ...q, options: q.options.map((opt, oi) => oi === optionIndex ? value : opt) }
          : q
      )
    }));
  };


  const handleSubmit = async (publish = false) => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên biểu mẫu');
      return;
    }

    if (!formData.openTime || !formData.closeTime) {
      toast.error('Vui lòng chọn thời gian mở và đóng');
      return;
    }

    if (new Date(formData.openTime) >= new Date(formData.closeTime)) {
      toast.error('Thời gian đóng phải sau thời gian mở');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Vui lòng thêm ít nhất một câu hỏi');
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Vui lòng nhập nội dung cho câu hỏi ${i + 1}`);
        return;
      }
      if (q.questionType === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        toast.error(`Câu hỏi ${i + 1} (lựa chọn nhiều) phải có ít nhất 2 lựa chọn`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const submitData = {
        ...formData,
        targetAudience: ['Member', 'HoD'], // Luôn set cho Member và HoD
        openTime: new Date(formData.openTime).toISOString(),
        closeTime: new Date(formData.closeTime).toISOString()
      };

      let createdFormId = formId;
      if (isEdit) {
        await feedbackApi.updateForm(eventId, formId, submitData);
        toast.success('Cập nhật biểu mẫu thành công');
      } else {
        const createRes = await feedbackApi.createForm(eventId, submitData);
        createdFormId = createRes.data._id || createRes.data.id;
        toast.success('Tạo biểu mẫu thành công');
      }

      if (publish) {
        await feedbackApi.publishForm(eventId, createdFormId);
        toast.success('Xuất bản biểu mẫu thành công');
      }

      navigate(`/events/${eventId}/feedback`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <UserLayout title="Tạo form phản hồi" sidebarType="hooc" activePage="feedback" eventId={eventId}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading size={100} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Tạo form phản hồi" sidebarType="hooc" activePage="feedback" eventId={eventId}>
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              {isEdit ? 'Chỉnh sửa biểu mẫu' : 'Tạo form phản hồi'}
            </h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="bi bi-eye"></i>
                Xem trước
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                <i className="bi bi-box-arrow-up"></i>
                Xuất bản
              </button>
            </div>
          </div>

          {!showPreview ? (
            <>
              {/* Basic Information */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
                    <i className="bi bi-exclamation"></i>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Thông tin cơ bản</h2>
                </div>

                <div style={{ marginLeft: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Tên biểu mẫu
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Phản hồi Thành viên"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                      Mô tả
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Nhập mô tả biểu mẫu..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Thời gian mở
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.openTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Thời gian đóng
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.closeTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
                    <i className="bi bi-list"></i>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>Câu hỏi phản hồi</h2>
                </div>

                <div style={{ marginLeft: '32px' }}>
                  {formData.questions.map((question, index) => (
                    <div
                      key={index}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '16px',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                            {index + 1}
                          </div>
                          <span style={{ fontSize: '16px', fontWeight: '600' }}>Câu hỏi {index + 1}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleMoveQuestion(index, 'up')}
                            disabled={index === 0}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          >
                            <i className="bi bi-arrow-up"></i>
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(index, 'down')}
                            disabled={index === formData.questions.length - 1}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          >
                            <i className="bi bi-arrow-down"></i>
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(index)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                          type="text"
                          value={question.questionText}
                          onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                          placeholder="Nhập nội dung câu hỏi..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />

                        <select
                          value={question.questionType}
                          onChange={(e) => handleQuestionChange(index, 'questionType', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="rating">Đánh giá (1-5 sao)</option>
                          <option value="multiple-choice">Lựa chọn nhiều</option>
                          <option value="text">Văn bản</option>
                          <option value="yes-no">Có/Không</option>
                        </select>

                        {question.questionType === 'multiple-choice' && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                              Lựa chọn:
                            </label>
                            {question.options?.map((option, optIndex) => (
                              <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                  placeholder={`Lựa chọn ${optIndex + 1}`}
                                  style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                  }}
                                />
                                <button
                                  onClick={() => handleRemoveOption(index, optIndex)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    fontSize: '18px'
                                  }}
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleAddOption(index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '8px 0'
                              }}
                            >
                              + Thêm lựa chọn
                            </button>
                          </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                          />
                          Bắt buộc
                        </label>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddQuestion}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto'
                    }}
                  >
                    <i className="bi bi-plus-lg"></i>
                    Thêm câu hỏi
                  </button>
                </div>
              </div>

              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu nháp'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h2 style={{ marginBottom: '16px' }}>Xem trước biểu mẫu</h2>
              <h3>{formData.name}</h3>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>{formData.description}</p>
              {formData.questions.map((q, index) => (
                <div key={index} style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <p style={{ fontWeight: '600', marginBottom: '12px' }}>
                    Câu hỏi {index + 1}: {q.questionText} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </p>
                  {q.questionType === 'rating' && (
                    <div>Đánh giá từ 1-5 sao</div>
                  )}
                  {q.questionType === 'multiple-choice' && (
                    <div>
                      {q.options?.map((opt, oi) => (
                        <label key={oi} style={{ display: 'block', marginBottom: '8px' }}>
                          <input type="checkbox" /> {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.questionType === 'text' && (
                    <textarea placeholder="Nhập câu trả lời..." style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                  )}
                  {q.questionType === 'yes-no' && (
                    <div>
                      <label><input type="radio" name={`q${index}`} /> Có</label>
                      <label style={{ marginLeft: '16px' }}><input type="radio" name={`q${index}`} /> Không</label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}

