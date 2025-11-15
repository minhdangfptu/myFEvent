import React, { useState } from 'react';
import { ArrowLeft, Edit, Ban, Calendar, User as UserIcon, AlertTriangle, ShieldCheck } from 'lucide-react';

const UserDetailManagement = () => {
  const [showBanModal, setShowBanModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isBanned, setIsBanned] = useState(false); // Set to true to test unban button

  return (
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
          gap: '12px'
        }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#616161',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '4px 0'
          }}>
            <ArrowLeft style={{ width: '18px', height: '18px' }} />
            Quay lại
          </button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#212121',
            margin: 0,
            marginLeft: '8px'
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
            color: '#424242',
            marginBottom: '20px',
            overflow: 'hidden'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop" 
              alt="Avatar"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Name */}
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#212121',
            marginBottom: '4px',
            textAlign: 'center'
          }}>
            Nguyễn Thị Mai Anh
          </h2>

          {/* Email */}
          <p style={{
            fontSize: '14px',
            color: '#757575',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            maianh.nguyen@email.com
          </p>

          {/* Status Badges */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px'
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
              User
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
                +84 912 345 678
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
                Ngày tham gia
              </span>
              <span style={{
                fontSize: '14px',
                color: '#212121',
                fontWeight: '500'
              }}>
                15/03/2024
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
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              {/* Created Events */}
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
                  Sự kiện đã tạo
                </p>
                <h2 style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#5E35B1',
                  margin: '0 0 4px 0'
                }}>
                  12
                </h2>
                <p style={{
                  fontSize: '12px',
                  color: '#7E57C2',
                  margin: 0
                }}>
                  Tổng số sự kiện
                </p>
              </div>

              {/* Joined Events */}
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
                  Sự kiện đã tham gia
                </p>
                <h2 style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#00897B',
                  margin: '0 0 4px 0'
                }}>
                  28
                </h2>
                <p style={{
                  fontSize: '12px',
                  color: '#26A69A',
                  margin: 0
                }}>
                  Tổng số sự kiện
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Information Card */}
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
                backgroundColor: '#2196F3',
                borderRadius: '2px'
              }}></div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#212121',
                margin: 0
              }}>
                Thông tin chi tiết
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              <div>
                <p style={{
                  fontSize: '13px',
                  color: '#757575',
                  margin: '0 0 6px 0'
                }}>
                  Họ và tên
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#212121',
                  fontWeight: '500',
                  margin: 0
                }}>
                  Nguyễn Thị Mai Anh
                </p>
              </div>

              <div>
                <p style={{
                  fontSize: '13px',
                  color: '#757575',
                  margin: '0 0 6px 0'
                }}>
                  Email
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#212121',
                  fontWeight: '500',
                  margin: 0
                }}>
                  maianh.nguyen@email.com
                </p>
              </div>

              <div>
                <p style={{
                  fontSize: '13px',
                  color: '#757575',
                  margin: '0 0 6px 0'
                }}>
                  Số điện thoại
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#212121',
                  fontWeight: '500',
                  margin: 0
                }}>
                  +84 912 345 678
                </p>
              </div>

              <div>
                <p style={{
                  fontSize: '13px',
                  color: '#757575',
                  margin: '0 0 6px 0'
                }}>
                  Vai trò
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#212121',
                  fontWeight: '500',
                  margin: 0
                }}>
                  User
                </p>
              </div>
            </div>
          </div>
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
                onClick={() => {
                  // Handle ban user logic here
                  console.log('Ban reason:', banReason);
                  setIsBanned(true);
                  setShowBanModal(false);
                  setBanReason('');
                }}
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
                onClick={() => {
                  // Handle unban user logic here
                  console.log('User unbanned');
                  setIsBanned(false);
                  setShowUnbanModal(false);
                }}
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
  );
};

export default UserDetailManagement;