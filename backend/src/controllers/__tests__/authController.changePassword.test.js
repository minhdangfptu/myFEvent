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

vi.mock('bcrypt', () => {
  const mockCompare = vi.fn()
  const mockHash = vi.fn()
  const mockGenSalt = vi.fn()
  return {
    __esModule: true,
    compare: mockCompare,
    hash: mockHash,
    genSalt: mockGenSalt,
    _mockCompare: mockCompare,
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

describe('authController.changePassword', () => {
  it('updates password when current correct', async () => {
    const { _mockFindById } = await import('../../models/user.js')
    const { _mockCompare, _mockHash, _mockGenSalt } = await import('bcrypt')

    const user = { passwordHash: 'old', save: vi.fn() }

    _mockFindById.mockResolvedValue(user)
    _mockCompare.mockResolvedValue(true)
    _mockGenSalt.mockResolvedValue('salt')
    _mockHash.mockResolvedValue('hashed')

    const req = {
      user: { id: '1' },
      body: { currentPassword: 'old', newPassword: 'new' },
    }

    await authController.changePassword(req, mockRes())
  })
})
