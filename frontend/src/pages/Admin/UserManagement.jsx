import React, { useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const users = [
    {
      id: 1,
      name: 'Nguyễn Thị Lan',
      email: 'nguyenlan@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'NL'
    },
    {
      id: 2,
      name: 'Trần Văn Minh',
      email: 'tranminh@email.com',
      role: 'admin',
      roleText: 'Quản trị viên',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'TM'
    },
    {
      id: 3,
      name: 'Phạm Thị Hương',
      email: 'phamhuong@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'banned',
      statusText: 'Đã bị cấm',
      avatar: 'PH'
    },
    {
      id: 4,
      name: 'Lê Quang Huy',
      email: 'lequanghuy@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'LH'
    },
    {
      id: 5,
      name: 'Hoàng Thị Mai',
      email: 'hoangmai@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'HM'
    },
    {
      id: 6,
      name: 'Đỗ Văn Tùng',
      email: 'dovantung@email.com',
      role: 'admin',
      roleText: 'Quản trị viên',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'DT'
    },
    {
      id: 7,
      name: 'Vũ Thị Linh',
      email: 'vuthilinh@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'banned',
      statusText: 'Đã bị cấm',
      avatar: 'VL'
    },
    {
      id: 8,
      name: 'Bùi Đức Anh',
      email: 'buiducanh@email.com',
      role: 'user',
      roleText: 'Người dùng',
      status: 'active',
      statusText: 'Đang hoạt động',
      avatar: 'BA'
    }
  ];

  const getAvatarColor = (index) => {
    const colors = ['#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0', '#FCE4EC', '#E0F2F1'];
    return colors[index % colors.length];
  };

  const getStatusStyle = (status) => {
    if (status === 'active') {
      return {
        color: '#2E7D32',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px'
      };
    } else if (status === 'banned') {
      return {
        color: '#C62828',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px'
      };
    }
  };

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
        alignItems: 'flex-start',
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid #E0E0E0'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#212121',
            marginBottom: '4px',
            marginTop: 0
          }}>
            Quản lý người dùng
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#757575',
            margin: 0
          }}>
            Quản lý tất cả người dùng trong hệ thống
          </p>
        </div>

        {/* Search and Filter */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'relative',
            width: '300px'
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
              placeholder="Tìm kiếm người dùng..."
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
          <button style={{
            padding: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Filter style={{ width: '18px', height: '18px', color: '#616161' }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 16px',
            backgroundColor: activeTab === 'all' ? '#2196F3' : 'transparent',
            color: activeTab === 'all' ? '#FFFFFF' : '#616161',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '10px 16px',
            backgroundColor: activeTab === 'active' ? 'primary' : 'transparent',
            color: activeTab === 'active' ? '#FFFFFF' : '#616161',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Đang hoạt động
        </button>
        <button
          onClick={() => setActiveTab('banned')}
          style={{
            padding: '10px 16px',
            backgroundColor: activeTab === 'banned' ? '#2196F3' : 'transparent',
            color: activeTab === 'banned' ? '#FFFFFF' : '#616161',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Đã bị cấm
        </button>
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
              backgroundColor: '#F9F9F9',
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
                Họ tên
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#616161',
                width: '25%'
              }}>
                Email
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#616161',
                width: '15%'
              }}>
                Vai trò
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#616161',
                width: '20%'
              }}>
                Trạng thái
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
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
            {users.map((user, index) => (
              <tr key={user.id} style={{
                borderBottom: '1px solid #F0F0F0'
              }}>
                <td style={{
                  padding: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: getAvatarColor(index),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#424242'
                    }}>
                      {user.avatar}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#212121',
                      fontWeight: '500'
                    }}>
                      {user.name}
                    </div>
                  </div>
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: '#616161'
                }}>
                  {user.email}
                </td>
                <td style={{
                  padding: '16px',
                  fontSize: '14px',
                  color: user.role === 'admin' ? '#5E35B1' : '#2196F3'
                }}>
                  {user.roleText}
                </td>
                <td style={{
                  padding: '16px'
                }}>
                  <div style={getStatusStyle(user.status)}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      backgroundColor: user.status === 'active' ? '#2E7D32' : '#C62828',
                      borderRadius: '50%'
                    }}></span>
                    {user.statusText}
                  </div>
                </td>
                <td style={{
                  padding: '16px'
                }}>
                  <a
                    href="#"
                    style={{
                      color: '#5E35B1',
                      fontSize: '14px',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Xem chi tiết
                  </a>
                </td>
              </tr>
            ))}
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
        <div style={{
          fontSize: '14px',
          color: '#616161'
        }}>
          Hiển thị trong tổng số người dùng 1-8 47
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button style={{
            padding: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ChevronLeft style={{ width: '16px', height: '16px', color: '#616161' }} />
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#2196F3',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            1
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#616161'
          }}>
            2
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#616161'
          }}>
            3
          </button>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#616161'
          }}>
            4
          </button>
          <button style={{
            padding: '8px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ChevronRight style={{ width: '16px', height: '16px', color: '#616161' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;