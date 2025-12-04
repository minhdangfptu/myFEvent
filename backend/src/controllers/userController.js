import bcrypt from 'bcrypt';
import EventMember from '../models/eventMember.js';
import User from '../models/user.js';
import { config } from '../config/environment.js';
import { uploadImageIfNeeded } from '../services/cloudinaryService.js';

// GET /api/users/me/events/:eventId/role hoặc /api/me/events/:eventId/role
export const getUserRoleByEvent = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy từ middleware xác thực
    const { eventId } = req.params;
    const membership = await EventMember.findOne({ userId, eventId, status: { $ne: 'deactive' } })
      .populate('userId', 'fullName')
      .populate('eventId', 'name')
      .populate('departmentId', 'name')
      .lean();

    if (!membership) {
      return res.status(404).json({ message: 'Không phải thành viên trong event này!' });
    }
    return res.json({
      user: membership.userId,
      event: membership.eventId,
      role: membership.role,
      departmentId: membership.departmentId?._id || membership.departmentId || null,
      eventMemberId: membership._id, // Thêm eventMemberId để frontend có thể dùng
      memberId: membership._id, // Alias cho eventMemberId
      _id: membership._id // Cũng trả về _id trực tiếp
    });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user registered with Google (no password to change)
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'Tài khoản Google không có mật khẩu. Không thể đổi mật khẩu.',
        code: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng, vui lòng kiểm tra lại' });

    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};

export const checkPassWord = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if user registered with Google (no password)
    if (!user.passwordHash) {
      return res.status(400).json({
        message: 'Tài khoản Google không có mật khẩu.',
        code: 'GOOGLE_ACCOUNT_NO_PASSWORD'
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Incorrect information' });
    return res.status(200).json({ message: 'Correct information' });
  } catch (error) {
    console.error('Check password error:', error);
    return res.status(500).json({ message: 'Failed to check information' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const dbUser = await User.findById(req.user.id).lean();
    if (!dbUser) return res.status(404).json({ message: 'User not found' });
    
    // Tính tổng số sự kiện user đã tham gia
    const totalEvents = await EventMember.countDocuments({ userId: req.user.id, status: { $ne: 'deactive' } });
    
    return res.status(200).json({
      data: {
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
        verified: !!dbUser.verified
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Failed to get profile', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, highlight, tags, avatarUrl } = req.body;
    const update = {};
    
    // Xử lý từng field, cho phép empty string và null
    if (fullName !== undefined) {
      const trimmedFullName = fullName?.trim() || '';
      if (!trimmedFullName) {
        return res.status(400).json({ message: 'Họ và tên không được để trống' });
      }
      update.fullName = trimmedFullName;
    }
    if (phone !== undefined) {
      // Cho phép empty string hoặc null để xóa phone
      const phoneValue = phone?.trim() || null;
      // Kiểm tra phone đã tồn tại chưa (trừ chính user hiện tại)
      if (phoneValue) {
        const existingUser = await User.findOne({ 
          phone: phoneValue, 
          _id: { $ne: req.user.id } 
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng bởi tài khoản khác' });
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
      // Đảm bảo tags là array và loại bỏ duplicates
      update.tags = Array.isArray(tags) ? [...new Set(tags.filter(t => t && t.trim()))] : [];
    }
    if (avatarUrl !== undefined) {
      update.avatarUrl = avatarUrl
        ? await uploadImageIfNeeded(avatarUrl, 'avatars')
        : null;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: update }, 
      { new: true, runValidators: true }
    ).lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Tính tổng số sự kiện user đã tham gia
    const totalEvents = await EventMember.countDocuments({ userId: req.user.id, status: { $ne: 'deactive' } });

    return res.status(200).json({
      message: 'Updated',
      data: {
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
        authProvider: user.authProvider || 'local'
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

export const removeTag = async (req, res) => {
  try {
    const { value } = req.body;
    await User.findByIdAndUpdate(req.user.id, { $pull: { tags: value } });
    return res.status(200).json({ message: 'Tag removed' });
  } catch {
    return res.status(500).json({ message: 'Failed to remove tag' });
  }
};
