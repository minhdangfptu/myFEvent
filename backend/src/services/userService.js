// services/userService.js
import bcrypt from 'bcrypt';
import User from '../models/user.js';
import EventMember from '../models/eventMember.js';
import { config } from '../config/environment.js';
import { uploadImageIfNeeded } from './cloudinaryService.js';

export const getPaginatedUsers = async (page, limit, search, status) => {
  const filter = {role: 'user'};
  if (search && search.trim() !== '') {
    // Trim search term to remove leading/trailing spaces
    const searchTerm = search.trim();
    const regex = { $regex: searchTerm, $options: 'i' };
    // Search in fullName and email only (username field doesn't exist in User model)
    filter.$or = [
      { email: regex },
      { fullName: regex }
    ];
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const data = await User.find(filter)
    .select('fullName email role status avatarUrl')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  return {
    data,
    total,
    page,
    limit,
  };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select(
    'fullName email role status avatarUrl'
  );
  return user;
};

export const updateUser = async (userId, updateData) => {
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
  }).select('fullName email role status avatarUrl');
  return updatedUser;
};

export const getUserProfileWithEvents = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const memberships = await EventMember.find({
    userId,
    status: { $ne: 'deactive' },
  })
    .populate({
      path: 'eventId',
      select: 'name eventStartDate eventEndDate organizerName status banInfo createdAt ',
    })
    .populate('departmentId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const pastEvents = [];
  const currentEvents = [];

  memberships.forEach((membership) => {
    if (!membership.eventId) return;

    const eventData = {
      eventId: membership.eventId._id,
      name: membership.eventId.name,
      eventStartDate: membership.eventId.eventStartDate,
      eventEndDate: membership.eventId.eventEndDate,
      organizerName: membership.eventId.organizerName,
      banInfo: membership.eventId.banInfo,
      role: membership.role,
      departmentName: membership.departmentId?.name || null,
      joinedAt: membership.createdAt,
    };

    if (
      membership.eventId.status === 'completed' ||
      membership.eventId.status === 'cancelled'
    ) {
      pastEvents.push(eventData);
    } else if (
      membership.eventId.status === 'ongoing' ||
      membership.eventId.status === 'scheduled'
    ) {
      currentEvents.push(eventData);
    }
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || '',
      status: user.status,
      role: user.role,
    },
    events: {
      past: pastEvents,
      current: currentEvents,
      total: memberships.length,
    },
  };
};

//Các hàm mới

// Lấy vai trò user trong 1 event
export const getUserRoleByEventService = async (userId, eventId) => {
  const membership = await EventMember.findOne({
    userId,
    eventId,
    status: { $ne: 'deactive' },
  })
    .populate('userId', 'fullName')
    .populate('eventId', 'name')
    .populate('departmentId', 'name')
    .lean();

  if (!membership) {
    const err = new Error('Không phải thành viên trong event này!');
    err.status = 404;
    throw err;
  }

  return {
    user: membership.userId,
    event: membership.eventId,
    role: membership.role,
    departmentId:
      membership.departmentId?._id || membership.departmentId || null,
    eventMemberId: membership._id,
    memberId: membership._id,
    _id: membership._id,
  };
};

// Đổi mật khẩu
export const changePasswordService = async (
  userId,
  currentPassword,
  newPassword
) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (!user.passwordHash) {
    const err = new Error(
      'Tài khoản Google không có mật khẩu. Không thể đổi mật khẩu.'
    );
    err.status = 400;
    throw err;
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    const err = new Error(
      'Mật khẩu hiện tại không đúng, vui lòng kiểm tra lại'
    );
    err.status = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return true;
};

// Check mật khẩu
export const checkPasswordService = async (userId, password) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (!user.passwordHash) {
    const err = new Error('Tài khoản Google không có mật khẩu.');
    err.status = 400;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Incorrect information');
    err.status = 400;
    throw err;
  }

  return true;
};

// Get profile (không cần list events chi tiết, chỉ tổng)
export const getProfileService = async (userId) => {
  const dbUser = await User.findById(userId).lean();
  if (!dbUser) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const totalEvents = await EventMember.countDocuments({
    userId,
    status: { $ne: 'deactive' },
  });

  return {
    id: dbUser._id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    avatarUrl: dbUser.avatarUrl || '',
    username: '',
    phone: dbUser.phone || '',
    bio: dbUser.bio || '',
    highlight: dbUser.highlight || '',
    tags: dbUser.tags || [],
    totalEvents: totalEvents || 0,
    verified: !!dbUser.verified,
  };
};

// Update profile
export const updateProfileService = async (userId, payload) => {
  const { fullName, phone, bio, highlight, tags, avatarUrl } = payload;
  const update = {};

  // Fullname (giống logic cũ)
  if (fullName !== undefined) {
    const trimmedFullName = fullName?.trim() || '';
    if (!trimmedFullName) {
      const err = new Error('Họ và tên không được để trống');
      err.status = 400;
      throw err;
    }
    update.fullName = trimmedFullName;
  }

  // Phone – kiểm tra trùng
  if (phone !== undefined) {
    const phoneValue = phone?.trim() || null;

    if (phoneValue) {
      const existingUser = await User.findOne({
        phone: phoneValue,
        _id: { $ne: userId },
      });
      if (existingUser) {
        const err = new Error(
          'Số điện thoại này đã được sử dụng bởi tài khoản khác'
        );
        err.status = 400;
        throw err;
      }
    }

    update.phone = phoneValue;
  }

  if (bio !== undefined) {
    update.bio = bio?.trim() || '';
  }

  if (highlight !== undefined) {
    update.highlight = highlight?.trim() || '';
  }

  if (tags !== undefined) {
    update.tags = Array.isArray(tags)
      ? [...new Set(tags.filter((t) => t && t.trim()))]
      : [];
  }

  if (avatarUrl !== undefined) {
    update.avatarUrl = avatarUrl
      ? await uploadImageIfNeeded(avatarUrl, 'avatars')
      : null;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const totalEvents = await EventMember.countDocuments({
    userId,
    status: { $ne: 'deactive' },
  });

  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl || '',
    phone: user.phone || '',
    bio: user.bio || '',
    highlight: user.highlight || '',
    tags: user.tags || [],
    totalEvents: totalEvents || 0,
    verified: !!user.verified,
    role: user.role || 'user',
    authProvider: user.authProvider || 'local',
  };
};

// Remove tag
export const removeTagService = async (userId, value) => {
  await User.findByIdAndUpdate(userId, { $pull: { tags: value } });
  return true;
};
