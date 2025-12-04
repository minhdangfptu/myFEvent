import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import UserLayout from '~/components/UserLayout';
import adminService from '~/services/adminService';
import Loading from '~/components/Loading';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, totalUsers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [activeTab, searchText, currentPage]);

  const fetchUsers = async () => {
    // Implement API call to fetch users
    try {
      setLoading(true);
      const response = await adminService.getPaginatedUsers(currentPage, 8, searchText, activeTab);
      setUsers(response.data);

      setTotalUsers(response.total);
      setPage(response.page);
      setLimit(response.limit);

    } catch (error) {
      console.error("❌ Lỗi khi gọi API:", error.message);
      setError('Không thể tải danh sách người dùng!');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / limit);

  const getAvatarColor = (index) => {
    const colors = ['#E3F2FD', '#F3E5F5', '#E8F5E9', '#FFF3E0', '#FCE4EC', '#E0F2F1'];
    return colors[index % colors.length];
  };

  const getRoleBadgeStyle = (role) => {
    if (role === 'admin') {
      return {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#F3E5F5',
        color: '#7B1FA2',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500'
      };
    } else {
      return {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#E3F2FD',
        color: '#1976D2',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500'
      };
    }
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 'active') {
      return {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#E8F5E9',
        color: '#2E7D32',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500'
      };
    } else if (status === 'banned') {
      return {
        display: 'inline-block',
        padding: '4px 12px',
        backgroundColor: '#FFEBEE',
        color: '#C62828',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '500'
      };
    }
  };

  return (
    <UserLayout activePage="users" sidebarType="admin">
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
              backgroundColor: activeTab === 'all' ? '#0d6efd' : 'transparent',
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
              backgroundColor: activeTab === 'active' ? '#0d6efd' : 'transparent',
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
              backgroundColor: activeTab === 'banned' ? '#0d6efd' : 'transparent',
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
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          {loading ? (
            <div
              style={{
                padding: "40px", textAlign: "center"
              }}
            >
              <Loading />
            </div>
          ) : (
            <>
              <table style={{
                width: "100%", borderCollapse: "collapse"
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
                    <tr key={user._id} style={{
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
                            color: '#424242',
                            overflow: 'hidden'
                          }}>
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              user.avatar
                            )}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#212121',
                            fontWeight: '500'
                          }}>
                            {user.fullName}
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
                        padding: '16px'
                      }}>
                        <span style={getRoleBadgeStyle(user.role)}>
                          {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                        </span>
                      </td>
                      <td style={{
                        padding: '16px'
                      }}>
                        <span style={getStatusBadgeStyle(user.status)}>
                          {user.status === 'active' ? 'Đang hoạt động' : 'Đã bị cấm'}
                        </span>
                      </td>
                      <td style={{
                        padding: '16px'
                      }}>
                        <a
                          href={`/admin/user-management/${user._id}`}
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

              {/* Pagination */}
              <div
                style={{
                  padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E0E0E0"
                }}
              >
                {/* Left side: Display info */}
                <div style={{ fontSize: '14px', color: '#616161' }}>
                  {totalUsers === 0
                    ? "Không có người dùng nào"
                    : `Hiển thị ${start}–${end} trong tổng số ${totalUsers} người dùng`}
                </div>

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
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserManagement;