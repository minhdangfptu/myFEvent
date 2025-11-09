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
        .optional()
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
    body('credential')
        .notEmpty()
        .withMessage('Google credential is required'),
    body('g_csrf_token')
        .optional()
        .isString()
        .withMessage('CSRF token must be a string')
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

export const sendDeleteOtpValidation = [
  body('email').isEmail().withMessage('Email is not valid')
];

export const verifyDeleteOtpValidation = [
  body('email').isEmail().withMessage('Email is not valid'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be at least 6 characters')
];


