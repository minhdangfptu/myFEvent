/**
 * Unit tests for controller: login
 * Only tests business logic, not third-party libraries or DB failures.
 */

import { vi, beforeEach, describe, test, expect } from 'vitest'

// ==== Mock dependencies ====
vi.mock('../../models/user.js', () => ({
  default: {
    findOne: vi.fn(),
  }
}))

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  }
}))

vi.mock('../tokenUtils.js', () => ({
  createTokens: vi.fn(),
  saveRefreshToken: vi.fn(),
}))

// ==== Import after mocking ====
import * as authControllerModule from '../authController.js'
import User from '../../models/user.js'
import bcrypt from 'bcrypt'
import { createTokens, saveRefreshToken } from '../tokenUtils.js'

// ==== Mock Express response ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authController - login', () => {

  // TC01 - User not found
  test('TC01 - Invalid email -> 404', async () => {
    User.findOne.mockResolvedValue(null)
    const req = { body: { email: 'a@p.com', password: 'p' } }
    const res = mockRes()

    await authControllerModule.login(req, res)

    expect(User.findOne).toHaveBeenCalledWith({ email: 'a@p.com' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Email or password is incorrect'
    }))
  })

  // TC02 - Wrong password
  test('TC02 - Wrong password -> 400', async () => {
    User.findOne.mockResolvedValue({
      _id: 'u1',
      email: 'a@p.com',
      passwordHash: 'p',
      verified: true,
      status: 'active'
    })
    bcrypt.compare.mockResolvedValue(false)

    const req = { body: { email: 'a@p.com', password: 'wrong' } }
    const res = mockRes()

    await authControllerModule.login(req, res)

    expect(bcrypt.compare).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Email or password is incorrect'
    }))
  })

  // TC03 - Unverified or inactive user
  test('TC03 - User not verified or inactive -> 403', async () => {
    User.findOne.mockResolvedValue({
      _id: 'u2',
      email: 'b@x.com',
      passwordHash: 'p',
      status: 'pending'
    })
    bcrypt.compare.mockResolvedValue(true)

    const req = { body: { email: 'b@x.com', password: 'p' } }
    const res = mockRes()

    await authControllerModule.login(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Account is not active'
    }))
  })

  // TC04 - Successful login
  test('TC04 - Success -> 200', async () => {
    User.findOne.mockResolvedValue({
      _id: 'u3',
      email: 'c@x.com',
      passwordHash: 'hashed',
      fullName: 'User C',
      role: 'user',
      status: 'active'
    })
    bcrypt.compare.mockResolvedValue(true)
    createTokens.mockReturnValue({
      accessToken: 'access',
      refreshToken: 'refresh'
    })
    saveRefreshToken.mockResolvedValue()

    const req = { body: { email: 'c@x.com', password: 'p' } }
    const res = mockRes()

    await authControllerModule.login(req, res)

    expect(User.findOne).toHaveBeenCalledWith({ email: 'c@x.com' })
    expect(createTokens).toHaveBeenCalledWith('u3', 'c@x.com')
    expect(saveRefreshToken).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Login successful!',
      user: expect.objectContaining({
        email: 'c@x.com',
        fullName: 'User C',
        role: 'user',
      }),
      tokens: {
        accessToken: 'access',
        refreshToken: 'refresh'
      }
    }))
  })
})
