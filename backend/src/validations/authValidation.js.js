import { body } from 'express-validator';

export const signupValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be valid'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('fullName')
        .notEmpty()
        .trim()
        .withMessage('Full name is required'),
    body('phone')
        .isMobilePhone()
        .withMessage('Phone number must be valid')
];

export const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email must be valid'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

export const googleLoginValidation = [
    body('token')
        .notEmpty()
        .withMessage('Google token is required')
];

export const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
];

export const logoutValidation = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
];