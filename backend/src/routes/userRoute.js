import express from 'express';
import { validationResult } from 'express-validator';
import { 
  getUserRoleByEvent, 
  changePassword, 
  checkPassWord, 
  getProfile, 
  updateProfile, 
  removeTag 
} from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { changePasswordValidation } from '../validations/authValidation.js';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

router.get('/events/:eventId/role', authenticateToken, getUserRoleByEvent);
router.post('/check-password', authenticateToken, checkPassWord);
router.post('/change-password', authenticateToken, changePasswordValidation, handleValidationErrors, changePassword);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.delete('/profile/tag', authenticateToken, removeTag);

export default router;