import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import { feedbackApi } from '../../apis/feedbackApi';
import { eventApi } from '../../apis/eventApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';
import { ArrowDown, ArrowUp, Eye, Menu, RotateCw, Trash, X } from "lucide-react";


const formatDateLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10); // Only date, no time
};

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
  const [formStatus, setFormStatus] = useState('draft');
  const [currentMinDate, setCurrentMinDate] = useState(formatDateLocal(new Date()));

  const getDefaultCloseTime = () => {
    const now = new Date();
    const plusOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return formatDateLocal(plusOneDay);
  };

  const clampToFuture = (value) => {
    if (!value) return currentMinDate;
    const date = new Date(value);
    const minDate = new Date(currentMinDate);
    minDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < minDate) {
      toast.info('Ngày mở không được trước hiện tại, đã tự động điều chỉnh.');
      return currentMinDate;
    }
    return value;
  };
  const clampCloseTime = (value) => {
    if (!value) return getDefaultCloseTime();
    const closeDate = new Date(value);
    closeDate.setHours(0, 0, 0, 0);
    const openDate = formData.openTime ? new Date(formData.openTime) : new Date(currentMinDate);
    openDate.setHours(0, 0, 0, 0);
    if (closeDate <= openDate) {
      const nextDay = new Date(openDate);
      nextDay.setDate(nextDay.getDate() + 1);
      toast.info('Ngày đóng phải sau ngày mở, đã tự động điều chỉnh.');
      return formatDateLocal(nextDay);
    }
    return value;
  };

  const handleOpenTimeChange = (value) => {
    const adjusted = clampToFuture(value);
    setFormData(prev => ({
      ...prev,
      openTime: adjusted,
      closeTime: clampCloseTime(prev.closeTime)
    }));
  };

  const handleCloseTimeChange = (value) => {
    const adjusted = clampCloseTime(value);
    setFormData(prev => ({ ...prev, closeTime: adjusted }));
  };

  const closeTimeMinimum = formData.openTime
    ? (() => {
        const openDate = new Date(formData.openTime);
        openDate.setDate(openDate.getDate() + 1);
        return formatDateLocal(openDate);
      })()
    : getDefaultCloseTime();

  useEffect(() => {
    if (eventId) {
      const initialize = async () => {
        try {
          await loadEventRole();
          await loadEvent();
          if (isEdit && formId) {
            await loadForm();
          } else {
            const nowLocal = formatDateLocal(new Date());
            const defaultClose = getDefaultCloseTime();
            setFormData(prev => ({
              ...prev,
              targetAudience: ['Member', 'HoD'],
              openTime: nowLocal,
              closeTime: defaultClose
            }));
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
      // Normalize response shape: backend may return { data: { event } } or { data: event }
      const fetchedEvent = res?.data?.event || res?.data || res?.event || res;
      setEvent(fetchedEvent);
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
      setFormStatus(form.status || 'draft');
      setFormData({
        name: form.name || '',
        description: form.description || '',
        openTime: formatDateLocal(form.openTime),
        closeTime: formatDateLocal(form.closeTime),
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
    setFormData(prev => {
      const question = prev.questions[questionIndex];
      if (!question) return prev;

      // Before adding new option, clean up any duplicates in existing options
      const cleanedOptions = [];
      const seenValues = new Set();
      
      question.options?.forEach((opt) => {
        const trimmed = opt.trim().toLowerCase();
        if (trimmed === '' || !seenValues.has(trimmed)) {
          cleanedOptions.push(opt);
          if (trimmed !== '') {
            seenValues.add(trimmed);
          }
        }
      });

      // Add new empty option
      cleanedOptions.push('');

      // If we removed duplicates, show a message
      const hadDuplicates = question.options?.length !== cleanedOptions.length - 1;
      if (hadDuplicates) {
        setTimeout(() => {
          toast.info('Đã tự động xóa các lựa chọn trùng lặp.', {
            position: "top-right",
            autoClose: 2000,
          });
        }, 0);
      }

      return {
        ...prev,
        questions: prev.questions.map((q, i) => 
          i === questionIndex 
            ? { ...q, options: cleanedOptions }
            : q
        )
      };
    });
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
    setFormData(prev => {
      const question = prev.questions[questionIndex];
      if (!question || !question.options) return prev;

      const oldValue = question.options[optionIndex] || '';
      const oldTrimmedValue = oldValue.trim().toLowerCase();
      const trimmedValue = value.trim();
      const trimmedValueLower = trimmedValue.toLowerCase();
      
      // Check if the old value was a duplicate (before change)
      const wasDuplicate = oldTrimmedValue !== '' && question.options.some((opt, oi) => 
        oi !== optionIndex && opt.trim().toLowerCase() === oldTrimmedValue
      );

      // Find all duplicate option indices (if any) for the new value
      const duplicateIndices = [];
      if (trimmedValue !== '') {
        question.options.forEach((opt, oi) => {
          if (oi !== optionIndex && opt.trim().toLowerCase() === trimmedValueLower && opt.trim() !== '') {
            duplicateIndices.push(oi);
          }
        });
      }

      // If value is being set and it's a duplicate, show warning
      if (trimmedValue !== '' && duplicateIndices.length > 0) {
        setTimeout(() => {
          toast.warning('Lựa chọn này đã tồn tại. Vui lòng nhập lựa chọn khác.', {
            position: "top-right",
            autoClose: 3000,
          });
        }, 0);
      }

      // Update options
      let updatedOptions = question.options.map((opt, oi) => {
        if (oi === optionIndex) {
          return value; // Update current option
        }
        // If the old value was a duplicate and we're clearing/changing it, 
        // clear all other options that had the same value
        if (wasDuplicate && trimmedValue === '' && opt.trim().toLowerCase() === oldTrimmedValue) {
          return ''; // Clear all duplicates when the original is cleared
        }
        return opt;
      });

      return {
        ...prev,
        questions: prev.questions.map((q, i) => 
          i === questionIndex 
            ? { ...q, options: updatedOptions }
            : q
        )
      };
    });
  };

  const handleOptionBlur = (questionIndex, optionIndex) => {
    setFormData(prev => {
      const question = prev.questions[questionIndex];
      if (!question || !question.options) return prev;

      const currentValue = question.options[optionIndex] || '';
      const trimmedValue = currentValue.trim();
      
      if (trimmedValue === '') return prev;

      // Find all duplicate option indices (including the current one)
      const duplicateIndices = [];
      question.options.forEach((opt, oi) => {
        if (opt.trim().toLowerCase() === trimmedValue.toLowerCase() && opt.trim() !== '') {
          duplicateIndices.push(oi);
        }
      });

      // If there are duplicates, keep only the first one (lowest index), clear the rest
      if (duplicateIndices.length > 1) {
        const firstIndex = Math.min(...duplicateIndices);
        const updatedOptions = question.options.map((opt, oi) => {
          // Keep the first duplicate, clear all others
          if (duplicateIndices.includes(oi) && oi !== firstIndex) {
            return '';
          }
          return opt;
        });

        toast.info('Đã tự động xóa các lựa chọn trùng lặp.', {
          position: "top-right",
          autoClose: 2000,
        });

        return {
          ...prev,
          questions: prev.questions.map((q, i) => 
            i === questionIndex 
              ? { ...q, options: updatedOptions }
              : q
          )
        };
      }

      return prev;
    });
  };


  const isReadOnly = isEdit && formStatus !== 'draft';
  const canEditCloseTime = isEdit && (formStatus === 'open' || formStatus === 'closed');

  const handleSubmit = async (publish = false) => {
    // Allow updating closeTime for published forms
    if (isReadOnly && !canEditCloseTime) {
      toast.error('Biểu mẫu đã xuất bản, không thể chỉnh sửa');
      return;
    }
    
    // If only updating closeTime for published form
    if (canEditCloseTime && publish) {
      toast.error('Biểu mẫu đã xuất bản, chỉ có thể cập nhật thời gian đóng');
      return;
    }
    // Validation
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên biểu mẫu');
      return;
    }

    if (!formData.openTime || !formData.closeTime) {
      toast.error('Vui lòng chọn ngày mở và đóng');
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const openTimeDate = new Date(formData.openTime);
    openTimeDate.setHours(0, 0, 0, 0);
    const closeTimeDate = new Date(formData.closeTime);
    closeTimeDate.setHours(23, 59, 59, 999); // Set to end of day

    if (openTimeDate >= closeTimeDate) {
      toast.error('Ngày đóng phải sau ngày mở');
      return;
    }

    // Cho phép chọn ngày hôm nay (so sánh chỉ theo ngày, không theo giờ phút)
    if (openTimeDate < now) {
      toast.error('Ngày mở phải ở hiện tại hoặc tương lai');
      return;
    }

    // Ngày đóng phải sau ngày hôm nay (cho phép ngày mai trở đi)
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    if (closeTimeDate <= todayEnd) {
      toast.error('Ngày đóng phải ở tương lai');
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
      if (q.questionType === 'multiple-choice') {
        if (!q.options || q.options.length < 2) {
          toast.error(`Câu hỏi ${i + 1} (lựa chọn nhiều) phải có ít nhất 2 lựa chọn`);
          return;
        }
        const trimmedNonEmpty = q.options.map(opt => opt.trim()).filter(opt => opt !== '');
        if (trimmedNonEmpty.length < 2) {
          toast.error(`Câu hỏi ${i + 1} cần ít nhất 2 lựa chọn hợp lệ`);
          return;
        }
        const uniqueOptions = new Set(trimmedNonEmpty.map(opt => opt.toLowerCase()));
        if (trimmedNonEmpty.length !== uniqueOptions.size) {
          toast.error(`Câu hỏi ${i + 1} có lựa chọn trùng lặp. Vui lòng sửa lại.`);
          return;
        }
        if (trimmedNonEmpty.length !== q.options.length) {
          toast.error(`Câu hỏi ${i + 1} không được để trống lựa chọn`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      
      // If updating only closeTime for published form
      if (canEditCloseTime) {
        const submitData = {
          closeTime: closeTimeDate.toISOString()
        };
        await feedbackApi.updateForm(eventId, formId, submitData);
        toast.success('Cập nhật thời gian đóng thành công');
        navigate(`/events/${eventId}/feedback`);
        return;
      }
      
      const normalizedQuestions = formData.questions.map((q) => {
        if (q.questionType !== 'multiple-choice') return q;
        return {
          ...q,
          options: q.options.map(opt => opt.trim()).filter(opt => opt !== '')
        };
      });
      
      // Set openTime to start of day, closeTime to end of day
      const openTimeStart = new Date(openTimeDate);
      openTimeStart.setHours(0, 0, 0, 0);
      const closeTimeEnd = new Date(closeTimeDate);
      closeTimeEnd.setHours(23, 59, 59, 999);
      
      const submitData = {
        ...formData,
        targetAudience: ['Member', 'HoD'], // Luôn set cho Member và HoD
        openTime: openTimeStart.toISOString(),
        closeTime: closeTimeEnd.toISOString(),
        questions: normalizedQuestions
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
                  gap: '8px',
                  opacity: isReadOnly ? 0.6 : 1
                }}
                disabled={isReadOnly}
              >
                <Eye size={18} />
                Xem trước
              </button>
              {!isReadOnly && (
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
                  {submitting ? (
                    <i className="bi bi-arrow-clockwise spin-animation"></i>
                  ) : (
                    <i className="bi bi-box-arrow-up"></i>
                  )}
                  {submitting ? 'Đang xuất bản...' : 'Xuất bản'}
                </button>
              )}
            </div>
          </div>

          {isReadOnly && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fff7ed', borderRadius: '8px', color: '#c2410c', marginBottom: '16px' }}>
              {canEditCloseTime 
                ? 'Biểu mẫu đã được xuất bản. Bạn chỉ có thể thay đổi thời gian đóng.'
                : 'Biểu mẫu đã được xuất bản hoặc đóng. Bạn chỉ có thể xem nội dung mà không thể chỉnh sửa.'}
            </div>
          )}

          {!showPreview ? (
            <fieldset disabled={isReadOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                        Ngày mở
                      </label>
                    <input
                      type="date"
                      value={formData.openTime}
                      onChange={(e) => handleOpenTimeChange(e.target.value)}
                      min={currentMinDate}
                      disabled={isReadOnly}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          opacity: isReadOnly ? 0.6 : 1,
                          cursor: isReadOnly ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                        Ngày đóng
                      </label>
                    <input
                      type="date"
                      value={formData.closeTime}
                      onChange={(e) => handleCloseTimeChange(e.target.value)}
                      min={closeTimeMinimum}
                      disabled={isReadOnly && !canEditCloseTime}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          opacity: (isReadOnly && !canEditCloseTime) ? 0.6 : 1,
                          cursor: (isReadOnly && !canEditCloseTime) ? 'not-allowed' : 'text'
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
                    <Menu size={18} />
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
                            <ArrowUp size={18} />
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(index, 'down')}
                            disabled={index === formData.questions.length - 1}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                          >
                            <ArrowDown size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(index)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ef4444' }}
                          >
                            <Trash size={18} />
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
                            {question.options?.map((option, optIndex) => {
                              // Check if this option is duplicate
                              const trimmedOption = option.trim();
                              const isDuplicate = question.options.some((opt, oi) => 
                                oi !== optIndex && opt.trim().toLowerCase() === trimmedOption.toLowerCase() && trimmedOption !== ''
                              );
                              
                              return (
                                <div key={optIndex} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                    onBlur={() => handleOptionBlur(index, optIndex)}
                                    placeholder={`Lựa chọn ${optIndex + 1}`}
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: isDuplicate ? '2px solid #ef4444' : '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      backgroundColor: isDuplicate ? '#fef2f2' : 'white'
                                    }}
                                  />
                                  {isDuplicate && (
                                    <span style={{ color: '#ef4444', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                      <i className="bi bi-exclamation-circle"></i> Trùng lặp
                                    </span>
                                  )}
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
                                    <X size={18} />
                                  </button>
                                </div>
                              );
                            })}
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

              {(!isReadOnly || canEditCloseTime) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    style={{
                      backgroundColor: canEditCloseTime ? '#2563eb' : '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 24px',
                      fontSize: '14px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {submitting && <i className="bi bi-arrow-clockwise spin-animation"></i>}
                    {submitting ? 'Đang lưu...' : canEditCloseTime ? 'Cập nhật thời gian đóng' : 'Lưu nháp'}
                  </button>
                </div>
              )}
            </fieldset>
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

