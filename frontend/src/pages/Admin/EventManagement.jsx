import React, { useEffect, useState } from 'react';
import { Search, Calendar, Eye, Ban, ChevronRight, ChevronLeft, Globe, Lock } from 'lucide-react';
import UserLayout from '~/components/UserLayout';
import adminService from '~/services/adminService';
import { formatDate } from '~/utils/formatDate';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BanEventModal from '~/components/BanEventModal';
import UnbanEventModal from '~/components/UnBanEventModal';

const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [limit, setLimit] = useState(8);
  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, totalEvents);
  const navigate = useNavigate();
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isUnBanModalOpen, setIsUnBanModalOpen] = useState(false);
  useEffect(() => {
    // setEvents(eventsMock);
    fetchEvents();
  }, [searchText, statusFilter, dateFilter, currentPage]);


  const fetchEvents = async () => {
    try {
      const response = await adminService.getPaginatedEvents(currentPage, limit, searchText, statusFilter, dateFilter);
      setEvents(response.data);
      setCurrentPage(response.page);
      setTotalPages(response.totalPages);
      setTotalEvents(response.total);
    } catch (error) {
      console.error('Error fetching events:', error.message);
      setError('Không thể tải danh sách sự kiện. Vui lòng thử lại sau.');
    }
  }
  const getStatusStyle = (status) => {
    if (status === 'scheduled') {
      return {
        backgroundColor: '#ffe7a1ff',
        color: '#9f7c10ff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: "nowrap",
        display: "inline-block"
      };
    } else if (status === 'ongoing') {
      return {
        backgroundColor: '#dcfce7',
        color: '#22c55e',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: "nowrap",
        display: "inline-block"
      };
    } else if (status === 'completed') {
      return {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: "nowrap",
        display: "inline-block"
      };
    }
    else if (status === 'cancelled') {
      return {
        backgroundColor: '#fee2e2',
        color: '#ef4444',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: "nowrap",
        display: "inline-block"
      };
    } else if (status === 'banned') {
      return {
        backgroundColor: '#f8d7da',
        color: '#842029',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: "nowrap",
        display: "inline-block"
      };
    }
  };

  const getTypeStyle = (type) => {
    const baseStyle = {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 14px",
      borderRadius: "16px",
      fontSize: "13px",
      fontWeight: "500",
      border: "1px solid transparent"
    };

    if (type === "public") {
      return {
        ...baseStyle,
        backgroundColor: "rgba(16, 185, 129, 0.15)",  // xanh ngọc nhạt
        color: "#059669",
        borderColor: "rgba(16, 185, 129, 0.3)",
        icon: <Globe size={14} strokeWidth={2} />
      };
    }

    if (type === "private") {
      return {
        ...baseStyle,
        backgroundColor: "rgba(239, 68, 68, 0.15)", // đỏ nhạt
        color: "#DC2626",
        borderColor: "rgba(239, 68, 68, 0.3)",
        icon: <Lock size={14} strokeWidth={2} />
      };
    }

    return baseStyle;
  };

  const getInitials = (name) => {
    const parts = name.split(' ');
    return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (index) => {
    const colors = ['#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0'];
    return colors[index % colors.length];
  };


  return (
    <UserLayout activePage="events" sidebarType="admin" >
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '24px',
        backgroundColor: '#FAFAFA',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#D32F2F',
          marginBottom: '24px',
          marginTop: 0
        }}>
          Tất cả sự kiện
        </h1>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            flex: '1',
            minWidth: '250px'
          }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#9E9E9E'
            }} />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện theo tên hoặc đơn vị tổ chức..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 32px 10px 12px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '16px'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="scheduled">Sắp diễn ra</option>
            <option value="completed">Hoàn thành</option>
            <option value="ongoing">Đang diễn ra</option>
            <option value="cancelled">Đã hủy</option>
            <option value="banned">Bị cấm</option>
          </select>

          {/* Date Input */}
          <input
            type="date"
            placeholder="mm/dd/yyyy"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              width: '140px'
            }}
          />
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#F5F5F5',
                borderBottom: '1px solid #E0E0E0'
              }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '30%'
                }}>
                  Tên sự kiện
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '25%'
                }}>
                  Đơn vị tổ chức
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '20%'
                }}>
                  Kiểu
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '20%'
                }}>
                  Ngày diễn ra
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '15%'
                }}>
                  Trạng thái
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#616161',
                  width: '10%'
                }}>
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                {/*  )})}*/ }
                const typeInfo = getTypeStyle(event.type);
                return (
                  <tr key={event.id} style={{
                    borderBottom: '1px solid #F0F0F0'
                  }}>
                    <td style={{
                      padding: '16px'
                    }}>
                      <div style={{
                        fontWeight: '500',
                        color: '#212121',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {event.name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#757575'
                      }}>
                        {event.subtitle}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: getAvatarColor(index),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#424242'
                        }}>
                          {getInitials(event.organizerName)}
                        </div>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            color: '#212121',
                            fontWeight: '500',
                            marginBottom: '2px'
                          }}>
                            {event.organizerName}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#757575'
                          }}>
                            {event.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: '#424242'
                    }}>
                      <span style={typeInfo}>
                        {event.type === 'public' ? 'Công khai' : 'Riêng tư'}
                      </span>
                    </td>
                    <td style={{
                      padding: '16px',
                      fontSize: '14px',
                      color: '#424242'
                    }}>
                      {!event.eventStartDate
                        ? "Không rõ"
                        : event.eventEndDate
                          ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
                          : formatDate(event.eventStartDate)
                      }
                    </td>
                    <td style={{
                      padding: '16px'
                    }}>
                      {event.banInfo?.isBanned
                        ? (
                          <span style={{
                            backgroundColor: '#FFEBEE',
                            color: '#C62828',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: "inline-flex",
                            whiteSpace: "nowrap",
                            alignItems: "center"
                          }}>
                            Bị cấm
                          </span>
                        )
                        : (
                          <span style={getStatusStyle(event.status)}>
                            {event.status === 'scheduled' ? 'Sắp diễn ra' :
                              event.status === 'ongoing' ? 'Đang diễn ra' :
                                event.status === 'completed' ? 'Hoàn thành' :
                                  event.status === 'cancelled' ? 'Đã hủy' : 'Không xác định'}
                          </span>
                        )
                      }
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center'
                      }}>
                        {/* View Button */}
                        <button
                          onClick={() => { navigate(`/admin/event-management/${event._id}`) }}
                          style={{
                            padding: '4px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#2196F3',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          <Eye style={{ width: '18px', height: '18px' }} />
                          Xem
                        </button>

                        {/* Ban/Unban Button */}
                        {event.banInfo?.isBanned ? (
                          <button
                            onClick={() => { setIsUnBanModalOpen(true); setSelectedEvent(event); }}
                            style={{
                              padding: '4px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '14px',
                              fontWeight: '400',
                              color: '#4CAF50',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.7';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Gỡ cấm
                          </button>
                        ) : (
                          event.type === 'public' && (
                            <button
                              onClick={() => { setIsBanModalOpen(true); setSelectedEvent(event); }}
                              style={{
                                padding: '4px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '14px',
                                fontWeight: '400',
                                color: '#F44336',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.7';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                            >
                              <Ban style={{ width: '18px', height: '18px' }} />
                              Cấm
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#616161' }}>
            {totalEvents === 0
              ? "Không có sự kiện nào"
              : `Hiển thị ${start}–${end} trong tổng số ${totalEvents} sự kiện`}
          </div>

          {/* Pagination */}
          <div
            style={{
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #E0E0E0'
            }}
          >

            {/* Right side: Pagination buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Prev */}
              <button
                disabled={currentPage === 1}
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                style={{
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronLeft style={{ width: '16px', height: '16px', color: '#616161' }} />
              </button>

              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: currentPage === pageNum ? '#2196F3' : '#FFFFFF',
                    color: currentPage === pageNum ? '#FFFFFF' : '#616161',
                    border: currentPage === pageNum ? 'none' : '1px solid #E0E0E0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              {/* Next */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                style={{
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronRight style={{ width: '16px', height: '16px', color: '#616161' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {selectedEvent && (
        <BanEventModal
          isOpen={isBanModalOpen}
          onClose={() => {
            setIsBanModalOpen(false);
            setSelectedEvent(null);
          }}
          eventData={{
            eventId: selectedEvent._id,
            name: selectedEvent.name,
            hooc: selectedEvent.members?.[0]?.userId?.fullName ?? "Không xác định",
            date: selectedEvent.eventStartDate
              ? selectedEvent.eventEndDate
                ? `${formatDate(selectedEvent.eventStartDate)} - ${formatDate(selectedEvent.eventEndDate)}`
                : formatDate(selectedEvent.eventStartDate)
              : "Chưa xác định"
          }}
          onBanSuccess={() => {
            toast.success('Cấm sự kiện thành công');
            setIsBanModalOpen(false);
            setSelectedEvent(null);
            fetchEvents();
          }}
        />
      )}
      {selectedEvent && (
        <UnbanEventModal
          isOpen={isUnBanModalOpen}
          onClose={() => {
            setIsUnBanModalOpen(false);
            setSelectedEvent(null);
          }}
          eventData={{
            eventId: selectedEvent._id,
            name: selectedEvent.name,
            hooc: selectedEvent.members?.[0]?.userId?.fullName ?? "Không xác định",
            date: selectedEvent.eventStartDate
              ? selectedEvent.eventEndDate
                ? `${formatDate(selectedEvent.eventStartDate)} - ${formatDate(selectedEvent.eventEndDate)}`
                : formatDate(selectedEvent.eventStartDate)
              : "Chưa xác định"
          }}
          onUnbanSuccess={() => {
            toast.success('Gỡ cấm sự kiện thành công');
            setIsUnBanModalOpen(false);
            setSelectedEvent(null);
            fetchEvents();
          }}
        />
      )}
    </UserLayout>
  );
};

export default EventManagement;