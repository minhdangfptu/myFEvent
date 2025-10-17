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

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email must be valid')
]

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]

export const resendVerificationValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email must be valid')
]

export const verifyCodeValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email must be valid'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
]

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
]


