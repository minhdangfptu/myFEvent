import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Ban, Calendar, User as UserIcon, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import UserLayout from '~/components/UserLayout';
import adminService from '~/services/adminService';
import { toast, ToastContainer } from 'react-toastify';
import { Toast } from 'bootstrap/dist/js/bootstrap.bundle.min';

const UserDetailManagement = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch user data from API
    const fetchUserData = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await adminService.getUserById(userId);
        setUserData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const handleBanUser = async (userId, banReason) => {
    try {
      const response = await adminService.banUser(userId, banReason);
      setUserData(prev => ({
        ...prev,
        user: { ...prev.user, status: 'banned' }
      }));
      setShowBanModal(false);
      setBanReason('');
      toast.success('Người dùng đã bị cấm thành công');
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleUnbanUser = async () => {
    try {
      const response = await adminService.unbanUser(userId);
      setUserData(prev => ({
        ...prev,
        user: { ...prev.user, status: 'active' }
      }));
      setShowUnbanModal(false);
      toast.success('Người dùng đã được bỏ cấm thành công');
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  };

  if (loading) {
    return (
      <UserLayout activePage="users" sidebarType="admin">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <p style={{ color: '#757575' }}>Đang tải...</p>
        </div>
      </UserLayout>
    );
  }

  if (!userData) {
    return (
      <UserLayout activePage="users" sidebarType="admin">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <p style={{ color: '#757575' }}>Không tìm thấy thông tin người dùng</p>
        </div>
      </UserLayout>
    );
  }

  const { user, events } = userData;
  const isBanned = user.status === 'banned';
  const totalEvents = events.total;
  const currentEventsCount = events.current.length;
  const pastEventsCount = events.past.length;

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name[0];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  // Format role display
  const getRoleDisplay = (role) => {
    const roleMap = {
      'user': 'Người dùng',
      'admin': 'Quản trị viên',
      'Member': 'Thành viên',
      'HoD': 'Trưởng ban',
      'HoOC': 'Trưởng ban tổ chức'
    };
    return roleMap[role] || role;
  };

  return (
    <UserLayout activePage="users" sidebarType="admin">
      <ToastContainer position="top-right" autoClose={3000} />
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: '24px',
        backgroundColor: '#FAFAFA',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <button 
              onClick={() => navigate('/admin/user-management')}
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
              <ArrowLeft style={{ width: '18px', height: '18px' }} />
              Quay lại
            </button>
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#E0E0E0'
            }}></div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#212121',
              margin: 0
            }}>
              Chi tiết người dùng
            </h1>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#424242',
              cursor: 'pointer'
            }}>
              <Edit style={{ width: '16px', height: '16px' }} />
              Chỉnh sửa quyền
            </button>
            {!isBanned ? (
              <button 
                onClick={() => setShowBanModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#D32F2F',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <Ban style={{ width: '16px', height: '16px' }} />
                Cấm người dùng
              </button>
            ) : (
              <button 
                onClick={() => setShowUnbanModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#2E7D32',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck style={{ width: '16px', height: '16px' }} />
                Bỏ cấm người dùng
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '24px'
        }}>
          {/* Left Column - User Profile Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '32px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Avatar */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#E3F2FD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: '600',
              color: '#1976D2',
              marginBottom: '20px',
              overflow: 'hidden'
            }}>
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                getInitials(user.fullName)
              )}
            </div>

            {/* Name */}
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#212121',
              marginBottom: '4px',
              textAlign: 'center'
            }}>
              {user.fullName || 'N/A'}
            </h2>

            {/* Email */}
            <p style={{
              fontSize: '14px',
              color: '#757575',
              marginBottom: '16px',
              textAlign: 'center',
              wordBreak: 'break-word'
            }}>
              {user.email}
            </p>

            {/* Status Badges */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: isBanned ? '#FFEBEE' : '#E8F5E9',
                color: isBanned ? '#C62828' : '#2E7D32',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: isBanned ? '#C62828' : '#2E7D32',
                  borderRadius: '50%'
                }}></span>
                {isBanned ? 'Đã bị cấm' : 'Đang hoạt động'}
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#E3F2FD',
                color: '#1976D2',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                <UserIcon style={{ width: '14px', height: '14px' }} />
                {getRoleDisplay(user.role)}
              </span>
            </div>

            {/* Info Details */}
            <div style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #F0F0F0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#757575'
                }}>
                  Số điện thoại
                </span>
                <span style={{
                  fontSize: '14px',
                  color: '#212121',
                  fontWeight: '500'
                }}>
                  {user.phone || 'Chưa cập nhật'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#757575'
                }}>
                  ID người dùng
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#212121',
                  fontWeight: '500',
                  fontFamily: 'monospace'
                }}>
                  {user.id.slice(-8)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Statistics Card */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#5E35B1',
                  borderRadius: '2px'
                }}></div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#212121',
                  margin: 0
                }}>
                  Thống kê hoạt động
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {/* Total Events */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#EDE7F6',
                  borderRadius: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#5E35B1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar style={{ width: '18px', height: '18px', color: '#FFFFFF' }} />
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#5E35B1',
                    margin: '0 0 8px 0',
                    fontWeight: '500'
                  }}>
                    Tổng số sự kiện
                  </p>
                  <h2 style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#5E35B1',
                    margin: '0 0 4px 0'
                  }}>
                    {totalEvents}
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#7E57C2',
                    margin: 0
                  }}>
                    Đã tham gia
                  </p>
                </div>

                {/* Current Events */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#E0F2F1',
                  borderRadius: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#00897B',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserIcon style={{ width: '18px', height: '18px', color: '#FFFFFF' }} />
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#00897B',
                    margin: '0 0 8px 0',
                    fontWeight: '500'
                  }}>
                    Sự kiện hiện tại
                  </p>
                  <h2 style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#00897B',
                    margin: '0 0 4px 0'
                  }}>
                    {currentEventsCount}
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#26A69A',
                    margin: 0
                  }}>
                    Đang tham gia
                  </p>
                </div>

                {/* Past Events */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#FFF3E0',
                  borderRadius: '12px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#F57C00',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar style={{ width: '18px', height: '18px', color: '#FFFFFF' }} />
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#F57C00',
                    margin: '0 0 8px 0',
                    fontWeight: '500'
                  }}>
                    Sự kiện đã qua
                  </p>
                  <h2 style={{
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#F57C00',
                    margin: '0 0 4px 0'
                  }}>
                    {pastEventsCount}
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#FB8C00',
                    margin: 0
                  }}>
                    Đã hoàn thành
                  </p>
                </div>
              </div>
            </div>

            {/* Current Events List */}
            {events.current.length > 0 && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#00897B',
                    borderRadius: '2px'
                  }}></div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212121',
                    margin: 0
                  }}>
                    Sự kiện đang tham gia
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {events.current.map((event) => (
                    <div 
                      key={event.eventId}
                      style={{
                        padding: '16px',
                        backgroundColor: '#FAFAFA',
                        borderRadius: '8px',
                        border: '1px solid #F0F0F0'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <h4 style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#212121',
                          margin: 0
                        }}>
                          {event.name}
                        </h4>
                        <span style={{
                          padding: '4px 10px',
                          backgroundColor: '#E3F2FD',
                          color: '#1976D2',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {getRoleDisplay(event.role)}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <MapPin style={{ width: '14px', height: '14px', color: '#757575' }} />
                          <span style={{
                            fontSize: '13px',
                            color: '#616161'
                          }}>
                            {event.departmentName}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <Calendar style={{ width: '14px', height: '14px', color: '#757575' }} />
                          <span style={{
                            fontSize: '13px',
                            color: '#616161'
                          }}>
                            {formatDate(event.eventStartDate)} - {formatDate(event.eventEndDate)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <UserIcon style={{ width: '14px', height: '14px', color: '#757575' }} />
                          <span style={{
                            fontSize: '13px',
                            color: '#616161'
                          }}>
                            Tổ chức bởi: {event.organizerName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ban User Modal */}
        {showBanModal && (
          <div 
            style={{
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
            onClick={() => setShowBanModal(false)}
          >
            <div 
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '450px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning Icon and Title */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#FFEBEE',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle style={{
                    width: '22px',
                    height: '22px',
                    color: '#D32F2F'
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212121',
                    margin: '0 0 8px 0'
                  }}>
                    Cấm người dùng
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#616161',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Việc cấm người dùng này sẽ hạn chế mọi quyền truy cập vào nền tảng. Vui lòng cung cấp lý do cấm.
                  </p>
                </div>
              </div>

              {/* Reason Input */}
              <div style={{
                marginBottom: '24px'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#424242',
                  marginBottom: '8px'
                }}>
                  Lý do cấm
                </label>
                <textarea
                  placeholder="Nhập lý do cấm người dùng này..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '12px',
                    border: '1px solid #E0E0E0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setBanReason('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F5F5F5',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#424242',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                >
                  Huỷ
                </button>
                <button
                  onClick={() => handleBanUser(userId, banReason)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#D32F2F',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C62828'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D32F2F'}
                >
                  Xác nhận cấm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unban User Modal */}
        {showUnbanModal && (
          <div 
            style={{
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
            onClick={() => setShowUnbanModal(false)}
          >
            <div 
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Success Icon and Title */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#E8F5E9',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck style={{
                    width: '22px',
                    height: '22px',
                    color: '#2E7D32'
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212121',
                    margin: '0 0 8px 0'
                  }}>
                    Bỏ cấm người dùng
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#616161',
                    margin: 0,
                    lineHeight: '1.5'
                  }}>
                    Hành động này sẽ khôi phục quyền truy cập của người dùng vào hệ thống.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowUnbanModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#F5F5F5',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#424242',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                >
                  Huỷ
                </button>
                <button
                  onClick={handleUnbanUser}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2E7D32',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1B5E20'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E7D32'}
                >
                  Xác nhận bỏ cấm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserDetailManagement;