import express from 'express';
import { validationResult } from 'express-validator';
import { 
    signup, 
    login, 
    loginWithGoogle, 
    refreshToken, 
    logout, 
    logoutAll 
} from '../controllers/authController.js';
import { authenticateToken, authenticateRefreshToken } from '../middlewares/authMiddleware.js';
import {
    signupValidation,
    loginValidation,
    googleLoginValidation,
    refreshTokenValidation,
    logoutValidation
} from '../validations/authValidation.js';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

router.post('/signup', signupValidation, handleValidationErrors, signup);
router.post('/login', loginValidation, handleValidationErrors, login);
router.post('/google', googleLoginValidation, handleValidationErrors, loginWithGoogle);
router.post('/refresh-token', refreshTokenValidation, handleValidationErrors, authenticateRefreshToken, refreshToken);
router.post('/logout', logoutValidation, handleValidationErrors, logout);
router.post('/logout-all', authenticateToken, logoutAll);

export default router;