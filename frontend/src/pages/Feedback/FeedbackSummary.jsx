import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import UserLayout from '../../components/UserLayout';
import { feedbackApi } from '../../apis/feedbackApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';
import { CheckCircle, Clock } from "lucide-react";
import { timeAgo } from '../../utils/timeAgo';


export default function FeedbackSummary() {
  const { eventId, formId } = useParams();
  const navigate = useNavigate();
  const { fetchEventRole } = useEvents();
  const [loading, setLoading] = useState(true);
  const [eventRole, setEventRole] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [expandedTextQuestions, setExpandedTextQuestions] = useState(new Set());

  useEffect(() => {
    if (eventId && formId) {
      loadEventRole();
      loadSummary();
    }
  }, [eventId, formId]);

  const loadEventRole = async () => {
    try {
      const role = await fetchEventRole(eventId);
      setEventRole(role);
      if (role !== 'HoOC') {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/home-page');
      }
    } catch (error) {
      console.error('Error loading role:', error);
    }
  };

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await feedbackApi.getFormSummary(eventId, formId);
      setSummaryData(res.data);
    } catch (error) {
      console.error('Error loading summary:', error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) {
      return `Hôm nay ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleString('vi-VN');
  };



  const exportExcel = async () => {
    try {
      toast.info('Đang tải dữ liệu...');
      const res = await feedbackApi.exportFormResponses(eventId, formId);
      const { data, formName } = res;

      if (!data || data.length === 0) {
        toast.warning('Không có dữ liệu để xuất');
        return;
      }

      // Prepare data for Excel
      const excelData = data.map((item) => ({
        'Thời gian gửi': new Date(item.submittedAt).toLocaleString('vi-VN'),
        'Người gửi': item.userFullName,
        'Câu hỏi': item.questionText,
        'Loại câu hỏi': item.questionType === 'rating' ? 'Đánh giá' : 
                       item.questionType === 'multiple-choice' ? 'Lựa chọn nhiều' :
                       item.questionType === 'yes-no' ? 'Có/Không' :
                       item.questionType === 'text' ? 'Văn bản' : item.questionType,
        'Câu trả lời': item.answer
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Thời gian gửi
        { wch: 25 }, // Người gửi
        { wch: 40 }, // Câu hỏi
        { wch: 15 }, // Loại câu hỏi
        { wch: 50 }  // Câu trả lời
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Phản hồi');

      // Generate filename with form name and current date
      const dateStr = new Date().toISOString().split('T')[0];
      const sanitizedFormName = (formName || 'feedback').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
      const filename = `Phan_hoi_${sanitizedFormName}_${dateStr}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      toast.success('Xuất Excel thành công!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error(error.response?.data?.message || 'Không thể xuất file Excel');
    }
  };

  if (loading || !summaryData) {
    return (
      <UserLayout title="Tổng kết" sidebarType="hooc" activePage="feedback" eventId={eventId}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading size={100} />
        </div>
      </UserLayout>
    );
  }

  const { form, summary, questionStats } = summaryData;

  return (
    <UserLayout title="Tổng kết" sidebarType="hooc" activePage="feedback" eventId={eventId}>
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                Tổng kết 
              </h1>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Tổng hợp phản hồi
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Kết quả thống kê phản hồi cho biểu mẫu này
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '20px', 
            marginBottom: '32px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="bi bi-graph-up" style={{ color: '#dc2626', fontSize: '20px' }}></i>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Tổng số phản hồi</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {summary.totalResponses}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckCircle size={28} style={{ color: "#10b981" }} />
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Tỷ lệ hoàn thành</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {summary.completionRate}%
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={28} style={{ color: "#2563eb" }} />
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Ngày cập nhật cuối</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {formatDate(summary.lastUpdated)}
              </div>
            </div>
          </div>

          {/* Question Statistics */}
          {questionStats.map((stat, index) => (
            <div key={index} style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                Câu hỏi {index + 1}: {stat.questionText}
              </h3>

              {stat.questionType === 'rating' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Column Chart */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '16px' }}>
                      Phân bố đánh giá
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '12px', height: '200px', padding: '0 20px' }}>
                      {[1, 2, 3, 4, 5].map(rating => {
                        const count = stat.statistics.distribution[rating] || 0;
                        const maxCount = Math.max(...Object.values(stat.statistics.distribution));
                        const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={rating} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                              <div
                                style={{
                                  width: '100%',
                                  height: `${barHeight}%`,
                                  backgroundColor: '#dc2626',
                                  borderRadius: '4px 4px 0 0',
                                  transition: 'height 0.3s ease',
                                  minHeight: count > 0 ? '4px' : '0'
                                }}
                                title={`${count} phản hồi`}
                              />
                            </div>
                            <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{count}</span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{rating} sao</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Average and Breakdown */}
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Điểm trung bình</div>
                      <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#dc2626' }}>
                        {stat.statistics.average}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <i
                            key={star}
                            className={`bi ${star <= Math.floor(stat.statistics.average) ? 'bi-star-fill' : star <= stat.statistics.average ? 'bi-star-half' : 'bi-star'}`}
                            style={{ color: star <= stat.statistics.average ? '#fbbf24' : '#d1d5db', fontSize: '20px' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>Chi tiết</div>
                      {[5, 4, 3, 2, 1].map(rating => {
                        const percentage = stat.statistics.percentages[rating] || '0';
                        return (
                          <div key={rating} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ width: '40px', fontSize: '14px' }}>{rating}★</span>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${percentage}%`,
                                  backgroundColor: '#dc2626'
                                }}
                              />
                            </div>
                            <span style={{ width: '50px', fontSize: '14px', textAlign: 'right' }}>{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {stat.questionType === 'multiple-choice' && (() => {
                // Sắp xếp các lựa chọn theo phần trăm giảm dần để dễ so sánh
                const sortedOptions = Object.keys(stat.statistics.distribution).sort((a, b) => {
                  const percentageA = parseFloat(stat.statistics.percentages[a] || '0');
                  const percentageB = parseFloat(stat.statistics.percentages[b] || '0');
                  return percentageB - percentageA;
                });

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div>
                      <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                        Tỷ lệ sử dụng
                      </h4>
                    </div>
                    
                    {/* Horizontal Bar Chart */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {sortedOptions.map((option, idx) => {
                        const percentage = parseFloat(stat.statistics.percentages[option] || '0');
                        const count = stat.statistics.distribution[option] || 0;
                        const maxPercentage = Math.max(...sortedOptions.map(opt => parseFloat(stat.statistics.percentages[opt] || '0')));
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Option label */}
                              <div style={{ 
                                minWidth: '120px', 
                                fontSize: '14px', 
                                color: '#374151', 
                                fontWeight: '500',
                                textAlign: 'left',
                                wordBreak: 'break-word'
                              }}>
                                {option}
                              </div>
                              
                              {/* Bar container */}
                              <div style={{ flex: 1, position: 'relative', height: '32px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                                {/* Bar */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0}%`,
                                    backgroundColor: '#dc2626',
                                    borderRadius: '6px',
                                    transition: 'width 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    paddingRight: '8px'
                                  }}
                                >
                                  {/* Percentage inside bar if bar is wide enough */}
                                  {percentage > 15 && (
                                    <span style={{ fontSize: '12px', color: 'white', fontWeight: '600' }}>
                                      {percentage}%
                                    </span>
                                  )}
                                </div>
                                
                                {/* Percentage outside bar if bar is too narrow */}
                                {percentage <= 15 && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    left: `${maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0}%`, 
                                    top: '50%', 
                                    transform: 'translateY(-50%)',
                                    marginLeft: '8px',
                                    fontSize: '12px',
                                    color: '#374151',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {percentage}%
                                  </div>
                                )}
                              </div>
                              
                              {/* Count and percentage info */}
                              <div style={{ 
                                minWidth: '80px', 
                                fontSize: '12px', 
                                color: '#6b7280',
                                textAlign: 'right',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end'
                              }}>
                                <span style={{ fontWeight: '600', color: '#374151' }}>
                                  {percentage}%
                                </span>
                                <span style={{ fontSize: '11px' }}>
                                  ({count} {count === 1 ? 'lần' : 'lần'})
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {stat.questionType === 'yes-no' && (() => {
                const total = stat.statistics.yes + stat.statistics.no;
                const circumference = 2 * Math.PI * 80; // 2πr với r=80
                const yesPercentage = total > 0 ? (stat.statistics.yes / total) : 0;
                const noPercentage = total > 0 ? (stat.statistics.no / total) : 0;
                const yesDashLength = yesPercentage * circumference;
                const noDashLength = noPercentage * circumference;
                
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Pie Chart */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background circle */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="40"
                        />
                        {/* Yes segment - chỉ hiển thị nếu yes > 0 */}
                        {stat.statistics.yes > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#dc2626"
                            strokeWidth="40"
                            strokeDasharray={`${yesDashLength} ${circumference}`}
                            strokeDashoffset="0"
                          />
                        )}
                        {/* No segment - chỉ hiển thị nếu no > 0 */}
                        {stat.statistics.no > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="40"
                            strokeDasharray={`${noDashLength} ${circumference}`}
                            strokeDashoffset={stat.statistics.yes > 0 ? `-${yesDashLength}` : '0'}
                          />
                        )}
                      </svg>
                      </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '16px', height: '16px', backgroundColor: '#dc2626', borderRadius: '4px' }}></div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Có</span>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {stat.statistics.yesPercentage}% ({stat.statistics.yes})
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '16px', height: '16px', backgroundColor: '#f59e0b', borderRadius: '4px' }}></div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Không</span>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {stat.statistics.noPercentage}% ({stat.statistics.no})
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {stat.questionType === 'text' && (() => {
                const allAnswers = stat.statistics.sampleAnswers || [];
                const isExpanded = expandedTextQuestions.has(index);
                const displayedAnswers = isExpanded ? allAnswers : allAnswers.slice(0, 6);
                
                return (
                  <div>
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        maxHeight: isExpanded ? 'none' : '480px', // ~6 items * 80px each
                        overflowY: 'auto',
                        paddingRight: '8px'
                      }}
                    >
                      {displayedAnswers.map((answer, ai) => {
                        // Lấy thời gian thực từ backend
                        const answerText = typeof answer === 'string' ? answer : answer.text || answer;
                        const submittedAt = typeof answer === 'object' && answer.submittedAt ? answer.submittedAt : null;
                        const timeAgoText = submittedAt ? timeAgo(submittedAt) : 'Không xác định';
                        
                        return (
                          <div key={ai} style={{ 
                            padding: '16px', 
                            backgroundColor: '#f9fafb', 
                            borderRadius: '8px', 
                            fontSize: '14px', 
                            color: '#374151',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                              "{answerText}"
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={18} />
                              {timeAgoText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {!isExpanded && allAnswers.length > 6 && (
                      <button
                        style={{
                          marginTop: '16px',
                          background: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          textAlign: 'left',
                          padding: 0
                        }}
                        onClick={() => {
                          setExpandedTextQuestions(prev => new Set([...prev, index]));
                        }}
                      >
                        Xem thêm phản hồi
                      </button>
                    )}
                  </div>
                );
              })()}

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', fontSize: '14px', color: '#6b7280' }}>
                Số phản hồi: {stat.totalAnswers}
              </div>
            </div>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}

