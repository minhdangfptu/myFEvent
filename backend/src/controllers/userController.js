// controllers/userController.js
import {
  getUserRoleByEventService,
  changePasswordService,
  checkPasswordService,
  getProfileService,
  updateProfileService,
  removeTagService,
} from '../services/userService.js';

// GET /api/users/me/events/:eventId/role hoặc /api/me/events/:eventId/role
export const getUserRoleByEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const result = await getUserRoleByEventService(userId, eventId);

    return res.json(result);
  } catch (err) {
    console.error('Get user role by event error:', err);
    const status = err.status || 500;
    return res.status(status).json({
      message: err.status ? err.message : 'Server Error',
      error: !err.status ? err.message : undefined,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Current and new password are required' });
    }

    await changePasswordService(req.user.id, currentPassword, newPassword);

    return res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? 'Failed to change password' : error.message,
    });
  }
};

export const checkPassWord = async (req, res) => {
  try {
    const { password } = req.body;

    await checkPasswordService(req.user.id, password);

    return res.status(200).json({ message: 'Correct information' });
  } catch (error) {
    console.error('Check password error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? 'Failed to check information' : error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await getProfileService(req.user.id);

    return res.status(200).json({ data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? 'Failed to get profile' : error.message,
      error: status === 500 ? error.message : undefined,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, bio, highlight, tags, avatarUrl } = req.body;

    const result = await updateProfileService(req.user.id, {
      fullName,
      phone,
      bio,
      highlight,
      tags,
      avatarUrl,
    });

    return res.status(200).json({
      message: 'Updated',
      data: result,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      message: status === 500 ? 'Failed to update profile' : error.message,
      error: status === 500 ? error.message : undefined,
    });
  }
};

export const removeTag = async (req, res) => {
  try {
    const { value } = req.body;
    await removeTagService(req.user.id, value);
    return res.status(200).json({ message: 'Tag removed' });
  } catch (error) {
    console.error('Remove tag error:', error);
    return res.status(500).json({ message: 'Failed to remove tag' });
  }
};
