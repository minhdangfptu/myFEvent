import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  vi: {
    translation: {
      general: 'Cài đặt chung',
      language: 'Ngôn ngữ hệ thống',
      theme: 'Màu nền',
      light: 'Sáng',
      dark: 'Tối',
      notifications: 'Thông báo',
      allowNotifications: 'Cho phép thông báo',
      save: 'Lưu cài đặt',
      searchPlaceholder: 'Tìm kiếm sự kiện...',
      joinEvent: 'Tham gia sự kiện',
      createEvent: 'Tạo sự kiện',
      languages: { vi: 'Tiếng Việt', en: 'English' },
      settings: {
        title: 'Cài đặt',
        subtitle: 'Chỉnh sửa các cài đặt hệ thống của bạn.',
        tabs: {
          general: 'General Settings',
          agents: "Agents' Settings",
          users: "Users' Settings",
          maintenance: 'Maintenance',
          security: 'Security'
        }
      },
      sections: { main: 'CHÍNH', settings: 'CÀI ĐẶT' },
      nav: {
        home: 'Trang chủ',
        profile: 'Hồ sơ',
        members: 'Thành viên',
        stats: 'Số liệu',
        calendar: 'Lịch',
        task: 'Công việc',
        risk: 'Rủi ro',
        documents: 'Tài liệu',
        notifications: 'Thông báo',
        settings: 'Cài đặt',
        events: 'Sự kiện'
      },
      actions: {
        editProfile: 'Chỉnh sửa hồ sơ',
        saveChanges: 'Lưu thay đổi',
        cancel: 'Hủy',
        viewDetails: 'Xem chi tiết',
        join: 'Tham gia',
        createEvent: 'Tạo sự kiện',
        logout: 'Đăng xuất'
      },
      profile: {
        title: 'Hồ sơ của tôi',
        fullName: 'Họ và tên',
        email: 'Email',
        phone: 'Số điện thoại',
        bio: 'Bio',
        details: 'Thông tin chi tiết',
        highlight: 'Điểm sáng về bạn',
        tags: 'Ban tham gia',
        totalEvents: 'Tổng số sự kiện đã tham gia',
        accountStatus: 'Trạng thái tài khoản',
        verified: '✓ Đã xác thực',
        notVerified: '⏳ Chưa xác thực'
      },
      membersPage: { title: 'Thành viên', search: 'Search', sortBy: 'Sắp xếp', newest: 'Mới nhất', oldest: 'Cũ nhất' },
      avatar: { view: 'Xem ảnh đại diện', change: 'Thay đổi ảnh đại diện' },
      footer: {
        product: 'Sản phẩm',
        support: 'Hỗ trợ',
        follow: 'Theo dõi chúng tôi',
        eventAtFPT: 'Nền tảng quản lý sự kiện dành cho sinh viên FPT',
        login: 'Đăng nhập',
        signup: 'Đăng ký',
        contact: 'Liên hệ',
        about: 'Về chúng tôi',
        policy: 'Chính sách',
        copyright: '© 2025 myFEvent. Tất cả đã được bảo hộ.'
      },
      home: {
        title: 'Trang chủ',
        allEvents: 'Các sự kiện tại trường ĐH FPT',
        blog: 'Blog',
        status: 'Trạng thái',
        sort: 'Sắp xếp',
        noEvents: 'Không có sự kiện phù hợp.',
        noPosts: 'Chưa có bài viết nào.',
        statuses: { all: 'Tất cả', upcoming: 'Sắp diễn ra', ongoing: 'Đang diễn ra', past: 'Đã kết thúc' },
        sorts: { newest: 'Mới nhất', oldest: 'Cũ nhất', az: 'A-Z' }
      },
      riskPage: {
        title: 'Rủi ro',
        headerTitle: '⚠️ Quản lý Rủi ro',
        headerSubtitle: 'Theo dõi, giảm thiểu và xử lý rủi ro của sự kiện',
        stats: { high: 'Mức độ cao', resolved: 'Đã xử lý' },
        search: 'Tìm kiếm rủi ro...',
        sortBy: 'Sắp xếp theo',
        filters: { allStatus: 'Tất cả trạng thái', allLevel: 'Tất cả mức độ' },
        add: 'Thêm rủi ro',
        columns: { name: 'Tên rủi ro', owner: 'Người chịu trách nhiệm', status: 'Trạng thái', level: 'Mức độ' },
        statuses: { processing: 'Đang xử lý', done: 'Đã xử lý', hold: 'Tạm hoãn' }
      },
      taskPage: {
        title: 'Công việc',
        headerTitle: '📋 Quản lý Nhiệm vụ',
        headerSubtitle: 'Theo dõi và quản lý tất cả các nhiệm vụ của sự kiện',
        stats: { completed: 'Hoàn thành', high: 'Ưu tiên cao' },
        searchPlaceholder: '🔍 Tìm kiếm nhiệm vụ...',
        search: 'Tìm kiếm',
        sortBy: 'Sắp xếp theo',
        filters: { allStatus: 'Tất cả trạng thái', allPriority: 'Tất cả mức độ' },
        add: 'Thêm nhiệm vụ',
        columns: { name: 'Tên nhiệm vụ', owner: 'Người phụ trách', due: 'Hạn chót', status: 'Trạng thái', priority: 'Mức độ' },
        detail: {
          title: 'Chi tiết nhiệm vụ',
          name: 'Tên nhiệm vụ',
          description: 'Mô tả',
          owner: 'Người phụ trách',
          due: 'Hạn chót',
          status: 'Trạng thái',
          priority: 'Mức độ',
          delete: 'Xóa nhiệm vụ',
          noDesc: 'Chưa có mô tả'
        },
        statuses: { doing: 'Đang làm', done: 'Hoàn thành', hold: 'Tạm hoãn' },
        empty: 'Không tìm thấy nhiệm vụ nào'
      }
    }
  },
  en: {
    translation: {
      general: 'General',
      language: 'System language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      notifications: 'Notifications',
      allowNotifications: 'Allow notifications',
      save: 'Save settings',
      searchPlaceholder: 'Search events...',
      joinEvent: 'Join event',
      createEvent: 'Create event',
      languages: { vi: 'Vietnamese', en: 'English' },
      settings: {
        title: 'Settings',
        subtitle: 'Change your system preferences.',
        tabs: {
          general: 'General Settings',
          agents: "Agents' Settings",
          users: "Users' Settings",
          maintenance: 'Maintenance',
          security: 'Security'
        }
      },
      sections: { main: 'MAIN', settings: 'SETTINGS' },
      nav: {
        home: 'Home',
        profile: 'Profile',
        members: 'Members',
        stats: 'Dashboard',
        calendar: 'Calendar',
        task: 'Tasks',
        risk: 'Risks',
        documents: 'Documents',
        notifications: 'Notifications',
        settings: 'Settings',
        events: 'Events'
      },
      actions: {
        editProfile: 'Edit profile',
        saveChanges: 'Save changes',
        cancel: 'Cancel',
        viewDetails: 'View details',
        join: 'Join',
        createEvent: 'Create event',
        logout: 'Logout'
      },
      profile: {
        title: 'My profile',
        fullName: 'Full name',
        email: 'Email',
        phone: 'Phone',
        bio: 'Bio',
        details: 'Details',
        highlight: 'Your highlights',
        tags: 'Teams',
        totalEvents: 'Total events joined',
        accountStatus: 'Account status',
        verified: '✓ Verified',
        notVerified: '⏳ Not verified'
      },
      membersPage: { title: 'Members', search: 'Search', sortBy: 'Sort by', newest: 'Newest', oldest: 'Oldest' },
      avatar: { view: 'View avatar', change: 'Change avatar' },
      footer: {
        product: 'Product',
        support: 'Support',
        follow: 'Follow us',
        eventAtFPT: 'Event management platform for FPT students',
        login: 'Login',
        signup: 'Sign up',
        contact: 'Contact',
        about: 'About us',
        policy: 'Policy',
        copyright: '© 2025 myFEvent. All rights reserved.'
      },
      home: {
        title: 'Home',
        allEvents: 'Events at FPT University',
        blog: 'Blog',
        status: 'Status',
        sort: 'Sort',
        noEvents: 'No matching events.',
        noPosts: 'No posts yet.',
        statuses: { all: 'All', upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Ended' },
        sorts: { newest: 'Newest', oldest: 'Oldest', az: 'A-Z' }
      },
      riskPage: {
        title: 'Risks',
        headerTitle: '⚠️ Risk Management',
        headerSubtitle: 'Track, mitigate and handle event risks',
        stats: { high: 'High level', resolved: 'Resolved' },
        search: 'Search risks...',
        sortBy: 'Sort by',
        filters: { allStatus: 'All statuses', allLevel: 'All levels' },
        add: 'Add risk',
        columns: { name: 'Risk name', owner: 'Owner', status: 'Status', level: 'Level' },
        statuses: { processing: 'Processing', done: 'Resolved', hold: 'On hold' }
      },
      taskPage: {
        title: 'Tasks',
        headerTitle: '📋 Task Management',
        headerSubtitle: 'Track and manage all event tasks',
        stats: { completed: 'Completed', high: 'High priority' },
        searchPlaceholder: '🔍 Search tasks...',
        search: 'Search',
        sortBy: 'Sort by',
        filters: { allStatus: 'All statuses', allPriority: 'All priorities' },
        add: 'Add task',
        columns: { name: 'Task name', owner: 'Assignee', due: 'Deadline', status: 'Status', priority: 'Priority' },
        detail: {
          title: 'Task details',
          name: 'Task name',
          description: 'Description',
          owner: 'Assignee',
          due: 'Deadline',
          status: 'Status',
          priority: 'Priority',
          delete: 'Delete task',
          noDesc: 'No description'
        },
        statuses: { doing: 'Doing', done: 'Done', hold: 'On hold' },
        empty: 'No tasks found'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;


