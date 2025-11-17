import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Info, Phone, Mail, Users, X, Ban } from 'lucide-react';
import UserLayout from '~/components/UserLayout';
import adminService from '~/services/adminService';
import { formatDate } from '~/utils/formatDate';
import { useParams, useNavigate } from 'react-router-dom';
import BanEventModal from '~/components/BanEventModal';
import UnbanEventModal from '~/components/UnBanEventModal';
import { t } from 'i18next';
import { toast } from 'react-toastify';

const EventDetailManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isUnbanModalOpen, setIsUnbanModalOpen] = useState(false);

  useEffect(() => {
    fetchEventDetail();
  }, [eventId]);

  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      const response = await adminService.getEventDetails(eventId);
      setEvent(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError('Không thể tải thông tin sự kiện. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status, banInfo) => {
    if (banInfo?.isBanned) {
      return {
        text: 'Bị cấm',
        color: '#C62828',
        bgColor: '#FFEBEE'
      };
    }

    switch (status) {
      case 'scheduled':
        return { text: 'Sắp diễn ra', color: '#2E7D32', bgColor: '#E8F5E9' };
      case 'ongoing':
        return { text: 'Đang diễn ra', color: '#1976D2', bgColor: '#E3F2FD' };
      case 'completed':
        return { text: 'Hoàn thành', color: '#616161', bgColor: '#F5F5F5' };
      case 'cancelled':
        return { text: 'Đã hủy', color: '#D32F2F', bgColor: '#FFEBEE' };
      default:
        return { text: 'Không xác định', color: '#757575', bgColor: '#F5F5F5' };
    }
  };

  const getAvatarColor = (index) => {
    const colors = ['#E3F2FD', '#F3E5F5', '#FFF3E0'];
    return colors[index % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  // Combine all leaders (HoOC + HoD)
  const getAllLeaders = () => {
    if (!event?.leaders) return [];
    const hoocLeaders = event.leaders.hooc || [];
    const hodLeaders = event.leaders.hod || [];
    return [...hoocLeaders, ...hodLeaders];
  };

  const getPrimaryLeader = () => {
    const allLeaders = getAllLeaders();
    // Prioritize HoOC as primary leader
    return allLeaders.find(leader => leader.role === 'HoOC') || allLeaders[0];
  };

  const eventData = {
    eventId: event?._id,
    name: event?.name,
    hooc: getPrimaryLeader()?.fullName,
    date: event?.eventStartDate
      ? event.eventEndDate
        ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
        : formatDate(event.eventStartDate)
      : 'Chưa xác định'
  };

  if (loading) {
    return (
      <UserLayout activePage="events" sidebarType="admin">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontSize: '16px',
          color: '#616161'
        }}>
          Đang tải...
        </div>
      </UserLayout>
    );
  }

  if (error || !event) {
    return (
      <UserLayout activePage="events" sidebarType="admin">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px'
        }}>
          <div style={{ fontSize: '16px', color: '#D32F2F' }}>
            {error || 'Không tìm thấy sự kiện'}
          </div>
          <button
            onClick={() => navigate('/admin/event-management')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Quay lại danh sách
          </button>
        </div>
      </UserLayout>
    );
  }

  const statusInfo = getStatusInfo(event.status, event.banInfo);
  const primaryLeader = getPrimaryLeader();
  const allLeaders = getAllLeaders();

  return (
    <UserLayout activePage="events" sidebarType="admin">
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: '#FAFAFA',
        minHeight: '100vh',
        padding: '24px'
      }}>
        {/* Breadcrumb */}
        <div style={{
          fontSize: '14px',
          color: '#757575',
          marginBottom: '16px'
        }}>
          <span
            onClick={() => navigate('/admin/event-management')}
            style={{ cursor: 'pointer' }}
          >
            Tất cả sự kiện
          </span>
          <span style={{ margin: '0 8px' }}>{'>'}</span>
          <span>{event.name}</span>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: '#D32F2F',
                margin: 0
              }}>
                {event.name}
              </h1>
              <span style={{
                backgroundColor: statusInfo.bgColor,
                color: statusInfo.color,
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: statusInfo.color,
                  borderRadius: '50%'
                }}></span>
                {statusInfo.text}
              </span>
            </div>
            <button
              onClick={() => navigate('/admin/event-management')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#616161',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <ArrowLeft style={{ width: '16px', height: '16px' }} />
              Quay lại Tất cả sự kiện
            </button>
          </div>
          {event.type === 'public' && !event.banInfo?.isBanned && (
            <button
              onClick={() => setIsBanModalOpen(true)}
              style={{
                backgroundColor: '#D32F2F',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
              <Ban style={{ width: '18px', height: '18px' }} />
              Cấm sự kiện
            </button>
          )}
          {event.banInfo?.isBanned && (
            <button
              onClick={() => setIsUnbanModalOpen(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
              Gỡ cấm sự kiện
            </button>
          )}
        </div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '24px'
        }}>
          {/* Left Column - Event Information */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <Info style={{
                width: '20px',
                height: '20px',
                color: '#2196F3'
              }} />
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#212121',
                margin: 0
              }}>
                Thông tin sự kiện
              </h2>
            </div>

            {/* Event Details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Event Name */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '120px',
                  fontSize: '14px',
                  color: '#757575',
                  fontWeight: '500'
                }}>
                  Tên sự kiện:
                </div>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#212121'
                }}>
                  {event.name}
                </div>
              </div>

              {/* Event Type */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '120px',
                  fontSize: '14px',
                  color: '#757575',
                  fontWeight: '500'
                }}>
                  Loại sự kiện:
                </div>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#212121'
                }}>
                  {event.type === 'public' ? 'Công khai' : 'Riêng tư'}
                </div>
              </div>

              {/* Organizer */}
              {primaryLeader && (
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '120px',
                    fontSize: '14px',
                    color: '#757575',
                    fontWeight: '500'
                  }}>
                    Đơn vị tổ chức:
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        color: '#212121',
                        fontWeight: '500'
                      }}>
                        {event.organizerName}
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* Date */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '120px',
                  fontSize: '14px',
                  color: '#757575',
                  fontWeight: '500'
                }}>
                  Ngày giờ:
                </div>
                <div style={{
                  flex: 1
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <Calendar style={{
                      width: '16px',
                      height: '16px',
                      color: '#5E35B1'
                    }} />
                    <span style={{
                      fontSize: '14px',
                      color: '#212121'
                    }}>
                      {event.eventStartDate && event.eventEndDate
                        ? `${formatDate(event.eventStartDate)} - ${formatDate(event.eventEndDate)}`
                        : event.eventStartDate
                          ? formatDate(event.eventStartDate)
                          : 'Chưa xác định'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '120px',
                  fontSize: '14px',
                  color: '#757575',
                  fontWeight: '500'
                }}>
                  Địa điểm:
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MapPin style={{
                    width: '16px',
                    height: '16px',
                    color: '#5E35B1'
                  }} />
                  <span style={{
                    fontSize: '14px',
                    color: '#212121'
                  }}>
                    {event.location || 'Chưa xác định'}
                  </span>
                </div>
              </div>
              {/* Description */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '120px',
                  fontSize: '14px',
                  color: '#757575',
                  fontWeight: '500'
                }}>
                  Mô tả:
                </div>
                <div style={{
                  flex: 1,
                  fontSize: '14px',
                  color: '#212121',
                  lineHeight: '1.6'
                }}>
                  {event.description || 'Chưa có mô tả'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Organizer */}
          {primaryLeader && (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              height: 'fit-content'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <Users style={{
                  width: '20px',
                  height: '20px',
                  color: '#2196F3'
                }} />
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#212121',
                  margin: 0
                }}>
                  Ban tổ chức
                </h2>
              </div>

              {/* Organizer Card */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '12px'
              }}>
                {primaryLeader.avatarUrl ? (
                  <img
                    src={primaryLeader.avatarUrl}
                    alt={primaryLeader.fullName}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      marginBottom: '16px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#E3F2FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#424242',
                    marginBottom: '16px'
                  }}>
                    {getInitials(primaryLeader.fullName)}
                  </div>
                )}
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#212121',
                  marginBottom: '4px'
                }}>
                  {primaryLeader.fullName}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#757575',
                  marginBottom: '20px'
                }}>
                  {primaryLeader.role === 'HoOC' ? 'Trưởng ban tổ chức' :
                    primaryLeader.role === 'HoD' ? `Trưởng ${primaryLeader.departmentName || 'ban'}` :
                      'Thành viên'}
                </div>

                {/* Contact Info */}
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#F5F5F5',
                    borderRadius: '6px'
                  }}>
                    <Mail style={{
                      width: '16px',
                      height: '16px',
                      color: '#616161'
                    }} />
                    <span style={{
                      fontSize: '13px',
                      color: '#424242',
                      wordBreak: 'break-all'
                    }}>
                      {primaryLeader.email}
                    </span>
                  </div>

                  {allLeaders.length > 1 && (
                    <div
                      onClick={() => setShowModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        backgroundColor: '#F5F5F5',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                    >
                      <Users style={{
                        width: '16px',
                        height: '16px',
                        color: '#616161'
                      }} />
                      <span style={{
                        fontSize: '13px',
                        color: '#424242'
                      }}>
                        +{allLeaders.length - 1} người khác trong Core Team
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '32px',
                width: '90%',
                maxWidth: '540px',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}
              >
                <X style={{ width: '20px', height: '20px', color: '#616161' }} />
              </button>

              {/* Modal Header */}
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#212121',
                margin: '0 0 8px 0'
              }}>
                Ban tổ chức
              </h2>

              <p style={{
                fontSize: '14px',
                color: '#757575',
                marginBottom: '24px',
                marginTop: '0'
              }}>
                Dưới đây là danh sách toàn bộ Core Team sự kiện.
              </p>

              {/* Team Members List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {allLeaders.map((member, index) => (
                  <div key={member.userId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(index),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#424242',
                        flexShrink: 0
                      }}>
                        {getInitials(member.fullName)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#212121',
                        marginBottom: '2px'
                      }}>
                        {member.fullName}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#757575'
                      }}>
                        {member.email}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#D32F2F',
                      fontWeight: '500',
                      textAlign: 'right'
                    }}>
                      {member.role === 'HoOC' ? 'Trưởng Ban Tổ Chức' :
                        member.role === 'HoD' ? `Trưởng Ban ${member.departmentName || ''}` :
                          member.role}
                    </div>
                  </div>
                ))}
              </div>

              {/* Close Button at bottom */}
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  color: '#424242',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
      <BanEventModal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        eventData={eventData}
        onBanSuccess={() => {
          toast.success("Cấm sự kiện thành công.");
          fetchEventDetail();
        }}
      />
      <UnbanEventModal
        isOpen={isUnbanModalOpen}
        onClose={() => setIsUnbanModalOpen(false)}
        eventData={eventData}
        onUnbanSuccess={() => {
          toast.success("Gỡ cấm sự kiện thành công");
          fetchEventDetail();
        }}
      />
    </UserLayout>
  );
};

export default EventDetailManagement;