import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authController from '../authController.js'

vi.mock('../../models/user.js', () => {
  const mockFindById = vi.fn()
  return {
    __esModule: true,
    default: { findById: mockFindById },
    _mockFindById: mockFindById,
  }
})

vi.mock('jsonwebtoken', () => {
  const mockVerify = vi.fn()
  return {
    __esModule: true,
    verify: mockVerify,
    _mockVerify: mockVerify,
  }
})

vi.mock('bcrypt', () => {
  const mockHash = vi.fn().mockResolvedValue('hashed-new')
  const mockGenSalt = vi.fn().mockResolvedValue('salt')
  return {
    __esModule: true,
    hash: mockHash,
    genSalt: mockGenSalt,
    _mockHash: mockHash,
    _mockGenSalt: mockGenSalt,
  }
})

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('authController.resetPassword', () => {
  it('updates password when token valid', async () => {
    const { _mockFindById } = await import('../../models/user.js')
    const { _mockVerify } = await import('jsonwebtoken')
    const { _mockGenSalt, _mockHash } = await import('bcrypt')

    const user = { save: vi.fn() }
    _mockVerify.mockReturnValue({ userId: '1' })
    _mockFindById.mockResolvedValue(user)

    const res = mockRes()
    const req = { body: { token: 't', newPassword: 'n' } }

    await authController.resetPassword(req, res)

    expect(user.save).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
