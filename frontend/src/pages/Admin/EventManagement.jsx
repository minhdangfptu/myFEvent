import React, { useState } from 'react';
import { Search, Calendar, Eye, Ban } from 'lucide-react';

const EventManagement = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const events = [
    {
      id: 1,
      name: 'FPT Coding Week 2025',
      subtitle: 'Sánh 2025 - Săp FPT',
      organizer: 'Nguyễn Văn An',
      email: 'an.nguyen@fpt.edu.vn',
      startDate: '15/03/2025',
      endDate: '22/03/2025',
      status: 'upcoming',
      statusText: 'Sắp diễn ra'
    },
    {
      id: 2,
      name: 'Festival Âm nhạc Múa hát',
      subtitle: 'Đường 30m Đại học FPT',
      organizer: 'Trần Văn Minh',
      email: 'minh.tran@email.com',
      startDate: '24/11/2024',
      endDate: '22/03/2025',
      status: 'banned',
      statusText: 'Bị cấm'
    },
    {
      id: 3,
      name: 'Triển lãm Nghệ thuật Đương đại',
      subtitle: 'Bảo tàng Mỹ thuật',
      organizer: 'Phạm Thị Hoa',
      email: 'hoa.pham@email.com',
      startDate: '11/03/2025',
      endDate: '11/03/2025',
      status: 'upcoming',
      statusText: 'Sắp diễn ra'
    },
    {
      id: 4,
      name: 'Khóa học khởi nghiệp',
      subtitle: 'ALSOL - Toà Alpha',
      organizer: 'Lê Hoàng Nam',
      email: 'nam.le@email.com',
      startDate: '12/22/2024',
      endDate: '13/12/2024',
      status: 'upcoming',
      statusText: 'Sắp diễn ra'
    }
  ];

  const getStatusStyle = (status) => {
    if (status === 'upcoming') {
      return {
        backgroundColor: '#E8F5E9',
        color: '#2E7D32',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '500'
      };
    } else if (status === 'banned') {
      return {
        backgroundColor: '#FFEBEE',
        color: '#C62828',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: '500'
      };
    }
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
            placeholder="Tìm kiếm sự kiện theo người tổ chức..."
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
          <option value="upcoming">Sắp diễn ra</option>
          <option value="banned">Bị cấm</option>
        </select>

        {/* Date Input */}
        <input
          type="text"
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

        {/* Filter Button */}
        <button style={{
          padding: '10px 24px',
          backgroundColor: '#2196F3',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>🔍</span>
          Lọc
        </button>

        {/* Calendar Icon */}
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
          <Calendar style={{ width: '18px', height: '18px', color: '#616161' }} />
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
                Người tổ chức
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
            {events.map((event, index) => (
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
                      {getInitials(event.organizer)}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '14px',
                        color: '#212121',
                        fontWeight: '500',
                        marginBottom: '2px'
                      }}>
                        {event.organizer}
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
                  {event.startDate} - {event.endDate}
                </td>
                <td style={{
                  padding: '16px'
                }}>
                  <span style={getStatusStyle(event.status)}>
                    {event.statusText}
                  </span>
                </td>
                <td style={{
                  padding: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                  }}>
                    <button style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.2s'
                    }}>
                      <Eye style={{ width: '18px', height: '18px', color: '#2196F3' }} />
                    </button>
                    <button style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background-color 0.2s'
                    }}>
                      <Ban style={{ width: '18px', height: '18px', color: '#F44336' }} />
                    </button>
                  </div>
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
          Hiển thị 1-4 trong tổng số 12 sự kiện
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button style={{
            padding: '8px 12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#616161'
          }}>
            Trước
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
        </div>
      </div>
    </div>
  );
};

export default EventManagement;