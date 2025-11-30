import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as authController from '../authController.js'

vi.mock('../../models/user.js', () => {
  const mockFindOne = vi.fn()
  return {
    __esModule: true,
    default: { findOne: mockFindOne },
    _mockFindOne: mockFindOne,
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

const mockRes = () => {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('authController.forgotPassword', () => {
  it('sends email when user exists', async () => {
    const { _mockFindOne } = await import('../../models/user.js')
    const { _mockSendMail } = await import('../../mailer.js')

    const res = mockRes()
    const req = { body: { email: 'user@example.com' } }

    _mockFindOne.mockResolvedValue({ _id: '123', email: 'user@example.com' })
    _mockSendMail.mockResolvedValue({})

    await authController.forgotPassword(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('returns error when user not found', async () => {
    const { _mockFindOne } = await import('../../models/user.js')
    const res = mockRes()

    _mockFindOne.mockResolvedValue(null)

    await authController.forgotPassword({ body: { email: 'missing@example.com' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})
