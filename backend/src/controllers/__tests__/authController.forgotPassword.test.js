import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as authController from '../authController.js'

vi.mock('../../models/user.js', () => {
  const mockFindOne = vi.fn()
  const mockFindById = vi.fn()
  const mockCreate = vi.fn()
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
      findById: mockFindById,
      create: mockCreate,
    },
    _mockFindOne: mockFindOne,
    _mockFindById: mockFindById,
    _mockCreate: mockCreate,
  }
})

vi.mock('../../mailer.js', () => {
  const mockSendMail = vi.fn()
  return {
    __esModule: true,
    sendMail: mockSendMail,
    _mockSendMail: mockSendMail,
  }
})

vi.mock('bcrypt', () => {
  const mockCompare = vi.fn().mockResolvedValue(true)
  const mockGenSalt = vi.fn().mockResolvedValue('salt')
  const mockHash = vi.fn().mockResolvedValue('hashed-new')

  return {
    __esModule: true,
    default: {
      compare: mockCompare,
      genSalt: mockGenSalt,
      hash: mockHash,
    },
    compare: mockCompare,
    genSalt: mockGenSalt,
    hash: mockHash,
    _mockCompare: mockCompare,
    _mockGenSalt: mockGenSalt,
    _mockHash: mockHash,
  }
})

vi.mock('jsonwebtoken', () => {
  const mockVerify = vi.fn()
  const mockSign = vi.fn()
  return {
    __esModule: true,
    default: {
      verify: mockVerify,
      sign: mockSign,
    },
    verify: mockVerify,
    sign: mockSign,
    _mockVerify: mockVerify,
    _mockSign: mockSign,
  }
})

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const realDateNow = Date.now

const createOtpEntry = async (email) => {
  const res = mockRes()
  const req = { body: { email }, user: { email } }
  const { _mockSendMail } = await import('../../mailer.js')
  _mockSendMail.mockResolvedValue({})
  await authController.sendDeleteOtp(req, res)
  const { html } = _mockSendMail.mock.calls[0][0]
  const match = html?.match(/>(\d{6})</)
  if (!match) throw new Error('Could not parse OTP from email')
  return match[1]
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  Date.now = realDateNow
})

describe('authController password + OTP flows', () => {
  describe('forgotPassword', () => {
    it('[Normal] sends a reset link when the user exists', async () => {
      const { _mockFindOne } = await import('../../models/user.js')
      const { _mockSendMail } = await import('../../mailer.js')

      const res = mockRes()
      const req = { body: { email: 'user@example.com' } }
      const mockUser = { _id: '123', email: 'user@example.com' }

      _mockFindOne.mockResolvedValue(mockUser)
      _mockSendMail.mockResolvedValue({})

      await authController.forgotPassword(req, res)

      expect(_mockFindOne).toHaveBeenCalledWith({ email: 'user@example.com' })
      expect(_mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('/reset-password?token='),
        })
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: 'Reset email sent' })
    })

    it('[Abnormal] responds 200 without sending email when the user is missing', async () => {
      const { _mockFindOne } = await import('../../models/user.js')
      const res = mockRes()
      const req = { body: { email: 'missing@example.com' } }

      _mockFindOne.mockResolvedValue(null)

      await authController.forgotPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'If the email exists, a reset link has been sent.',
      })
    })

    it('[Abnormal] responds 500 when sending the email fails', async () => {
      const { _mockFindOne } = await import('../../models/user.js')
      const { _mockSendMail } = await import('../../mailer.js')

      const res = mockRes()
      const req = { body: { email: 'user@example.com' } }
      const mockUser = { _id: '123', email: 'user@example.com' }

      _mockFindOne.mockResolvedValue(mockUser)
      _mockSendMail.mockRejectedValue(new Error('SMTP broke'))

      await authController.forgotPassword(req, res)

      expect(_mockSendMail).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Failed to send reset email',
      })
    })
  })

  describe('resetPassword', () => {
    it('updates the password when the token is valid', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const { _mockVerify } = await import('jsonwebtoken')
      const { _mockGenSalt, _mockHash } = await import('bcrypt')

      const res = mockRes()
      const req = { body: { token: 'token-123', newPassword: 'new-pass' } }
      const user = { _id: 'u-1', save: vi.fn() }

      _mockVerify.mockReturnValue({ userId: 'u-1' })
      _mockFindById.mockResolvedValue(user)
      _mockGenSalt.mockResolvedValue('salt')
      _mockHash.mockResolvedValue('hashed-new')

      await authController.resetPassword(req, res)

      expect(_mockVerify).toHaveBeenCalledWith('token-123', expect.any(String))
      expect(user.passwordHash).toBe('hashed-new')
      expect(user.save).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: 'Password updated successfully' })
    })

    it('returns 400 when token or new password is missing', async () => {
      const res = mockRes()
      await authController.resetPassword({ body: { token: 'token' } }, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token and new password are required',
      })
    })

    it('returns 400 when no user is found', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const { _mockVerify } = await import('jsonwebtoken')

      const res = mockRes()
      const req = { body: { token: 'token', newPassword: 'pass' } }

      _mockVerify.mockReturnValue({ userId: 'missing' })
      _mockFindById.mockResolvedValue(null)

      await authController.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' })
    })

    it('returns 400 when the token is expired', async () => {
      const { _mockVerify } = await import('jsonwebtoken')
      const res = mockRes()
      const req = { body: { token: 'expired', newPassword: 'pass' } }

      _mockVerify.mockImplementation(() => {
        const error = new Error('expired')
        error.name = 'TokenExpiredError'
        throw error
      })

      await authController.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' })
    })

    it('returns 500 for unexpected errors', async () => {
      const { _mockVerify } = await import('jsonwebtoken')
      const res = mockRes()
      const req = { body: { token: 'booom', newPassword: 'pass' } }

      _mockVerify.mockImplementation(() => {
        throw new Error('boom')
      })

      await authController.resetPassword(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to reset password' })
    })
  })

  describe('changePassword', () => {
    it('updates password when current password matches', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const { _mockCompare, _mockGenSalt, _mockHash } = await import('bcrypt')

      const res = mockRes()
      const user = { passwordHash: 'old', save: vi.fn() }
      const req = {
        user: { id: 'uid' },
        body: { currentPassword: 'old-pass', newPassword: 'new-pass' },
      }

      _mockFindById.mockResolvedValue(user)
      _mockCompare.mockResolvedValue(true)
      _mockGenSalt.mockResolvedValue('salt-2')
      _mockHash.mockResolvedValue('hashed-new-pass')

      await authController.changePassword(req, res)

      expect(user.passwordHash).toBe('hashed-new-pass')
      expect(user.save).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Đổi mật khẩu thành công',
      })
    })

    it('returns 400 when required fields are missing', async () => {
      const res = mockRes()
      const req = { user: { id: 'uid' }, body: { currentPassword: 'old' } }

      await authController.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Current and new password are required',
      })
    })

    it('returns 404 when user is not found', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const res = mockRes()
      const req = {
        user: { id: 'missing' },
        body: { currentPassword: 'old', newPassword: 'new' },
      }

      _mockFindById.mockResolvedValue(null)

      await authController.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' })
    })

    it('returns 400 when the current password does not match', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const { _mockCompare } = await import('bcrypt')
      const res = mockRes()
      const req = {
        user: { id: 'uid' },
        body: { currentPassword: 'wrong', newPassword: 'new' },
      }
      const user = { passwordHash: 'old', save: vi.fn() }

      _mockFindById.mockResolvedValue(user)
      _mockCompare.mockResolvedValue(false)

      await authController.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mật khẩu hiện tại không đúng',
      })
    })

    it('returns 500 for unexpected errors', async () => {
      const { _mockFindById } = await import('../../models/user.js')
      const res = mockRes()
      const req = {
        user: { id: 'err' },
        body: { currentPassword: 'old', newPassword: 'new' },
      }

      _mockFindById.mockRejectedValue(new Error('boom'))

      await authController.changePassword(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ message: 'Failed to change password' })
    })
  })

  describe('sendDeleteOtp', () => {
    it('sends an OTP to the user email', async () => {
      const { _mockSendMail } = await import('../../mailer.js')
      const res = mockRes()
      const req = { user: { email: 'otp@example.com' }, body: { email: 'otp@example.com' } }

      _mockSendMail.mockResolvedValue({})

      await authController.sendDeleteOtp(req, res)

      expect(_mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'otp@example.com',
          subject: expect.stringContaining('Mã xác nhận'),
        })
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Đã gửi mã xác nhận qua email.',
      })
    })

    it('rejects requests when the user is unauthorized', async () => {
      const res = mockRes()
      const req = { user: { email: 'someone@example.com' }, body: { email: 'other@example.com' } }

      await authController.sendDeleteOtp(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
    })
  })

  describe('verifyDeleteOtp', () => {
    it('verifies the OTP when everything matches', async () => {
      const res = mockRes()
      const email = 'verify@example.com'
      const otp = await createOtpEntry(email)
      const req = { user: { email }, body: { email, otp } }

      await authController.verifyDeleteOtp(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ message: 'Xác thực thành công.' })
    })

    it('returns 400 when email or otp are missing', async () => {
      const res = mockRes()
      await authController.verifyDeleteOtp({ body: {} }, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Thiếu email hoặc mã otp.',
      })
    })

    it('returns 403 when the requester is not the owner', async () => {
      const res = mockRes()
      const req = { user: { email: 'a@example.com' }, body: { email: 'b@example.com', otp: '123456' } }

      await authController.verifyDeleteOtp(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' })
    })

    it('returns 400 when the otp has expired', async () => {
      const res = mockRes()
      const email = 'expired@example.com'
      const otp = await createOtpEntry(email)
      const req = { user: { email }, body: { email, otp } }

      Date.now = () => realDateNow() + 5 * 60 * 1000

      await authController.verifyDeleteOtp(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mã hết hạn. Vui lòng gửi lại!',
      })
    })

    it('returns 400 when the provided otp is invalid', async () => {
      const res = mockRes()
      const email = 'wrong-otp@example.com'
      await createOtpEntry(email)
      const req = { user: { email }, body: { email, otp: '000000' } }

      await authController.verifyDeleteOtp(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        message: 'Mã xác nhận không đúng!',
      })
    })
  })
})
