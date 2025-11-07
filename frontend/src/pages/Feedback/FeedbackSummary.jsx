import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from '../../components/UserLayout';
import { feedbackApi } from '../../apis/feedbackApi';
import Loading from '../../components/Loading';
import { useEvents } from '../../contexts/EventContext';

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

  const exportCSV = () => {
    if (!summaryData) return;
    
    let csv = 'Câu hỏi,Loại,Thống kê\n';
    summaryData.questionStats.forEach((stat, index) => {
      csv += `"${stat.questionText}",${stat.questionType},`;
      if (stat.questionType === 'rating') {
        csv += `Trung bình: ${stat.statistics.average}\n`;
        Object.keys(stat.statistics.distribution).forEach(rating => {
          csv += `,${rating} sao,${stat.statistics.distribution[rating]} (${stat.statistics.percentages[rating]}%)\n`;
        });
      } else if (stat.questionType === 'multiple-choice') {
        Object.keys(stat.statistics.distribution).forEach(option => {
          csv += `,${option},${stat.statistics.distribution[option]} (${stat.statistics.percentages[option]}%)\n`;
        });
      } else {
        csv += `${JSON.stringify(stat.statistics)}\n`;
      }
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `feedback-summary-${formId}.csv`;
    link.click();
  };

  const exportPDF = () => {
    toast.info('Tính năng xuất PDF đang được phát triển');
  };

  if (loading || !summaryData) {
    return (
      <UserLayout title="Summary" sidebarType="hooc" activePage="feedback" eventId={eventId}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading size={100} />
        </div>
      </UserLayout>
    );
  }

  const { form, summary, questionStats } = summaryData;

  return (
    <UserLayout title="Summary" sidebarType="hooc" activePage="feedback" eventId={eventId}>
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                Summary
              </h1>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Tổng hợp phản hồi
              </h2>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                Kết quả thống kê phản hồi cho biểu mẫu này
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={exportCSV}
                style={{
                  backgroundColor: '#dc2626',
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
                <i className="bi bi-file-earmark-spreadsheet"></i>
                Xuất CSV
              </button>
              <button
                onClick={exportPDF}
                style={{
                  backgroundColor: '#dc2626',
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
                <i className="bi bi-file-pdf"></i>
                Xuất PDF
              </button>
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
                <i className="bi bi-check-circle" style={{ color: '#10b981', fontSize: '20px' }}></i>
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>Tỷ lệ hoàn thành</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {summary.completionRate}%
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <i className="bi bi-clock" style={{ color: '#2563eb', fontSize: '20px' }}></i>
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

              {stat.questionType === 'multiple-choice' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc2626' }}></div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>
                      Tỷ lệ sử dụng
                    </h4>
                  </div>
                  <div style={{ position: 'relative', height: '300px', padding: '20px 0 40px 60px' }}>
                    {/* Y-axis labels */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: '40px', width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      {Object.keys(stat.statistics.distribution).reverse().map((option, idx) => (
                        <span key={idx} style={{ fontSize: '12px', color: '#374151', textAlign: 'right', paddingRight: '8px' }}>
                          {option}
                        </span>
                      ))}
                    </div>
                    {/* Chart area */}
                    <div style={{ height: '100%', position: 'relative', paddingLeft: '20px' }}>
                      {/* Grid lines */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
                        {[0, 20, 40, 60, 80, 100].map((val, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '1px' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '1px', backgroundColor: '#e5e7eb' }}></div>
                            <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Line chart */}
                      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: '20px', right: 0, bottom: 0, overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Area under line */}
                        <polygon
                          points={(() => {
                            const options = Object.keys(stat.statistics.distribution);
                            const width = 100;
                            const height = 100;
                            const stepX = options.length > 1 ? width / (options.length - 1) : 0;
                            const points = options.map((option, idx) => {
                              const percentage = parseFloat(stat.statistics.percentages[option] || '0');
                              const x = idx * stepX;
                              const y = height - (percentage / 100) * height;
                              return `${x},${y}`;
                            });
                            // Add bottom points for area
                            const lastX = (options.length - 1) * stepX;
                            return `${points.join(' ')} ${lastX},${height} 0,${height}`;
                          })()}
                          fill="url(#lineGradient)"
                        />
                        {/* Line */}
                        <polyline
                          points={(() => {
                            const options = Object.keys(stat.statistics.distribution);
                            const width = 100;
                            const height = 100;
                            const stepX = options.length > 1 ? width / (options.length - 1) : 0;
                            return options.map((option, idx) => {
                              const percentage = parseFloat(stat.statistics.percentages[option] || '0');
                              const x = idx * stepX;
                              const y = height - (percentage / 100) * height;
                              return `${x},${y}`;
                            }).join(' ');
                          })()}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Data points */}
                        {Object.keys(stat.statistics.distribution).map((option, idx) => {
                          const options = Object.keys(stat.statistics.distribution);
                          const width = 100;
                          const height = 100;
                          const stepX = options.length > 1 ? width / (options.length - 1) : 0;
                          const percentage = parseFloat(stat.statistics.percentages[option] || '0');
                          const x = idx * stepX;
                          const y = height - (percentage / 100) * height;
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#dc2626"
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        })}
                      </svg>
                      {/* X-axis labels */}
                      <div style={{ position: 'absolute', bottom: '-30px', left: '20px', right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                        {Object.keys(stat.statistics.distribution).map((option, idx) => {
                          const percentage = stat.statistics.percentages[option] || '0';
                          return (
                            <span key={idx} style={{ textAlign: 'center' }}>
                              {percentage}%
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stat.questionType === 'yes-no' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Pie Chart */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="40"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="40"
                        strokeDasharray={`${(stat.statistics.yes / (stat.statistics.yes + stat.statistics.no)) * 251.2} 251.2`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="40"
                        strokeDasharray={`${(stat.statistics.no / (stat.statistics.yes + stat.statistics.no)) * 251.2} 251.2`}
                        strokeDashoffset={`-${(stat.statistics.yes / (stat.statistics.yes + stat.statistics.no)) * 251.2}`}
                      />
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
              )}

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
                        // Calculate time ago (mock for now, should come from backend)
                        const timeAgo = ai === 0 ? '2 giờ trước' : ai === 1 ? '5 giờ trước' : ai === 2 ? '1 ngày trước' : ai === 3 ? '2 ngày trước' : `${ai + 1} ngày trước`;
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
                              "{typeof answer === 'string' ? answer : answer.text || answer}"
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <i className="bi bi-clock"></i>
                              {timeAgo}
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

