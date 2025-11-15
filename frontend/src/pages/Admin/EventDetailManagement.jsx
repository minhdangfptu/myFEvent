import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, Info, Phone, Mail, Users, X } from 'lucide-react';

const EventDetailManagement = () => {
  const [showModal, setShowModal] = useState(false);

  const teamMembers = [
    {
      id: 1,
      name: 'Nguyễn Văn An',
      email: 'an.nguyen@fpt.edu.vn',
      role: 'Trưởng ban Tổ Chức',
      avatar: 'NA'
    },
    {
      id: 2,
      name: 'Demi Wilkinson',
      email: 'demi@untitledui.com',
      role: 'Trưởng ban Hậu Cần',
      avatar: 'DW'
    },
    {
      id: 3,
      name: 'Drew Cano',
      email: 'drew@untitledui.com',
      role: 'Trưởng Ban Truyền Thông',
      avatar: 'DC'
    }
  ];

  const getAvatarColor = (index) => {
    const colors = ['#E3F2FD', '#F3E5F5', '#FFF3E0'];
    return colors[index % colors.length];
  };

  return (
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
        <span style={{ cursor: 'pointer' }}>Tất cả sự kiện</span>
        <span style={{ margin: '0 8px' }}>{'>'}</span>
        <span>FPT Coding Week 2025</span>
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
              FPT Coding Week 2025
            </h1>
            <span style={{
              backgroundColor: '#E8F5E9',
              color: '#2E7D32',
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
                backgroundColor: '#2E7D32',
                borderRadius: '50%'
              }}></span>
              Sắp diễn ra
            </span>
          </div>
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
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Quay lại Tất cả sự kiện
          </button>
        </div>
        <button style={{
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
          <span style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            ⊗
          </span>
          Cấm sự kiện
        </button>
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
                FPT Coding Week 2025
              </div>
            </div>

            {/* Organizer */}
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
                Người tổ chức:
              </div>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#E3F2FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#424242'
                }}>
                  NA
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    color: '#212121',
                    fontWeight: '500'
                  }}>
                    Nguyễn Văn An
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#757575'
                  }}>
                    an.nguyen@fpt.edu.vn
                  </div>
                </div>
              </div>
            </div>

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
                    15/03/2025 - 22/03/2025
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock style={{
                    width: '16px',
                    height: '16px',
                    color: '#5E35B1'
                  }} />
                  <span style={{
                    fontSize: '14px',
                    color: '#212121'
                  }}>
                    08:00 - 17:00
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
                  Đại học FPT Hà Nội, Khu Công nghệ cao Hòa Lạc
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
                Tuần lễ lập trình FPT Coding Week 2025 là sự kiện thường niên dành cho sinh viên ngành Công nghệ thông tin. Sự kiện bao gồm các buổi workshop, hackathon, và các cuộc thi lập trình với tổng giải thưởng lên đến 100 triệu đồng. Đây là cơ hội tuyệt vời để sinh viên giao lưu, học hỏi và thể hiện kỹ năng lập trình của mình.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Organizer */}
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
              NA
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#212121',
              marginBottom: '4px'
            }}>
              Nguyễn Văn An
            </div>
            <div style={{
              fontSize: '13px',
              color: '#757575',
              marginBottom: '20px'
            }}>
              Trưởng ban tổ chức
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
                  color: '#424242'
                }}>
                  an.nguyen@fpt.edu.vn
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                backgroundColor: '#F5F5F5',
                borderRadius: '6px'
              }}>
                <Phone style={{
                  width: '16px',
                  height: '16px',
                  color: '#616161'
                }} />
                <span style={{
                  fontSize: '13px',
                  color: '#424242'
                }}>
                  0987 654 321
                </span>
              </div>
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
                  +5 người khác trong Core Team
                </span>
              </div>
            </div>
          </div>
        </div>
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
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <Users style={{
                width: '20px',
                height: '20px',
                color: '#616161'
              }} />
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#212121',
                margin: 0
              }}>
                Ban tổ chức
              </h2>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#757575',
              marginBottom: '20px',
              marginTop: '4px'
            }}>
              Dưới đây là danh sách bộ Core Team sự kiện:
            </p>

            {/* Team Members List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {teamMembers.map((member, index) => (
                <div key={member.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#F9F9F9',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: getAvatarColor(index),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#424242',
                    flexShrink: 0
                  }}>
                    {member.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#212121',
                      marginBottom: '2px'
                    }}>
                      {member.name}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#757575',
                      marginBottom: '2px'
                    }}>
                      {member.email}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#D32F2F',
                      fontWeight: '500'
                    }}>
                      {member.role}
                    </div>
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
                backgroundColor: '#F5F5F5',
                color: '#424242',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EEEEEE'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F5'}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailManagement;