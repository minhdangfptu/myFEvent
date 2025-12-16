import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authController from '../authController.js'

/* -------------------------------------------------------------
 * Mocks
 * ------------------------------------------------------------- */

// User model
vi.mock('../../models/user.js', () => {
  const mockFindById = vi.fn()
  return {
    __esModule: true,
    default: { findById: mockFindById },
    _mockFindById: mockFindById,
  }
})

// UsedResetToken model
vi.mock('../../models/usedResetToken.js', () => {
  const mockFindOne = vi.fn()
  const mockCreate = vi.fn()
  return {
    __esModule: true,
    default: {
      findOne: mockFindOne,
      create: mockCreate,
    },
    _mockFindOne: mockFindOne,
    _mockCreate: mockCreate,
  }
})

// jsonwebtoken mock
vi.mock('jsonwebtoken', () => {
  const mockVerify = vi.fn()
  return {
    __esModule: true,
    default: { verify: mockVerify },
    verify: mockVerify,
    _mockVerify: mockVerify,
  }
})

// bcrypt mock
vi.mock('bcrypt', () => {
  const mockHash = vi.fn().mockResolvedValue('hashed-new')
  const mockGenSalt = vi.fn().mockResolvedValue('salt')
  return {
    __esModule: true,
    default: {
      hash: mockHash,
      genSalt: mockGenSalt,
    },
    hash: mockHash,
    genSalt: mockGenSalt,
    _mockHash: mockHash,
    _mockGenSalt: mockGenSalt,
  }
})

/* -------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------- */

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())


describe('authController.resetPassword', () => {
  it('[Normal] TC01 - should reset password successfully', async () => {
    const { _mockFindById } = await import('../../models/user.js')
    const { _mockFindOne, _mockCreate } = await import('../../models/usedResetToken.js')
    const { _mockVerify } = await import('jsonwebtoken')
    const { _mockGenSalt, _mockHash } = await import('bcrypt')

    const user = { _id: '1', save: vi.fn() }

    _mockVerify.mockReturnValue({ userId: '1' })
    _mockFindById.mockResolvedValue(user)
    _mockFindOne.mockResolvedValue(null)

    const req = { body: { token: 't', newPassword: 'new' } }
    const res = mockRes()

    await authController.resetPassword(req, res)

    expect(_mockGenSalt).toHaveBeenCalled()
    expect(_mockHash).toHaveBeenCalledWith('new', 'salt')
    expect(user.save).toHaveBeenCalled()
    expect(_mockCreate).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Password updated successfully',
    })
  })

  /* -----------------------------------------------------------
   * TC02 - thiếu token hoặc newPassword
   * ----------------------------------------------------------- */
  it('[Abnormal] TC02 - should return 400 when token or newPassword missing', async () => {
    const res = mockRes()
    const req = { body: { token: 't' } } // thiếu newPassword

    await authController.resetPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token and new password are required',
    })
  })

  /* -----------------------------------------------------------
   * TC03 - user không tồn tại
   * ----------------------------------------------------------- */
  it('[Abnormal] TC03 - should return 404 when user not found', async () => {
    const { _mockFindById } = await import('../../models/user.js')
    const { _mockVerify } = await import('jsonwebtoken')

    _mockVerify.mockReturnValue({ userId: '404' })
    _mockFindById.mockResolvedValue(null)

    const req = { body: { token: 't', newPassword: 'n' } }
    const res = mockRes()

    await authController.resetPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' })
  })

  /* -----------------------------------------------------------
   * TC04 - token đã được dùng rồi
   * ----------------------------------------------------------- */
  it('[Abnormal] TC04 - should return 400 when token is already used', async () => {
    const { _mockFindById } = await import('../../models/user.js')
    const { _mockFindOne } = await import('../../models/usedResetToken.js')
    const { _mockVerify } = await import('jsonwebtoken')

    _mockVerify.mockReturnValue({ userId: '1' })
    _mockFindById.mockResolvedValue({ save: vi.fn() })

    _mockFindOne.mockResolvedValue({ tokenHash: 'abc' })

    const req = { body: { token: 't', newPassword: 'n' } }
    const res = mockRes()

    await authController.resetPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message:
        'Liên kết đặt lại mật khẩu đã được sử dụng. Vui lòng tạo yêu cầu mới',
    })
  })

  /* -----------------------------------------------------------
   * TC05 - token expired
   * ----------------------------------------------------------- */
  it('[Abnormal] TC05 - should return 400 when token expired', async () => {
    const { _mockVerify } = await import('jsonwebtoken')

    const expiredError = new Error('Token expired')
    expiredError.name = 'TokenExpiredError'

    _mockVerify.mockImplementation(() => {
      throw expiredError
    })

    const req = { body: { token: 't', newPassword: 'n' } }
    const res = mockRes()

    await authController.resetPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Link đã hết hạn. Vui lòng kiểm tra lại',
    })
  })

  /* -----------------------------------------------------------
   * TC06 - lỗi DB / lỗi bất ngờ
   * ----------------------------------------------------------- */
  it('[Abnormal] TC06 - should return 500 on unexpected error', async () => {
    const { _mockVerify } = await import('jsonwebtoken')

    // verify ném lỗi khác
    _mockVerify.mockImplementation(() => {
      throw new Error('random-db-error')
    })

    const req = { body: { token: 't', newPassword: 'n' } }
    const res = mockRes()

    await authController.resetPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to reset password',
    })
  })
})
