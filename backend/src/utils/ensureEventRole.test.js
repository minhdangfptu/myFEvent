/**
 * Unit tests for util: ensureEventRole
 * Focus: business logic (mock DB layer only)
 */

import { vi, describe, test, expect, beforeEach } from 'vitest'

// ==== Mock dependencies ====
vi.mock('../models/eventMember.js', () => ({
  default: { findOne: vi.fn() }
}))

import ensureEventRole from './ensureEventRole.js'
import EventMember from '../models/eventMember.js'

beforeEach(() => vi.clearAllMocks())

describe('utils - ensureEventRole', () => {
  test('[Normal] TC01 - Return membership when user has allowed role', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'm1', role: 'HoOC' })
    })

    const result = await ensureEventRole('u1', 'e1', ['HoOC', 'HoD'])

    expect(EventMember.findOne).toHaveBeenCalledWith({
      userId: 'u1',
      eventId: 'e1',
      role: { $in: ['HoOC', 'HoD'] },
    })
    expect(result).toEqual({ _id: 'm1', role: 'HoOC' })
  })

  test('[Abnormal] TC02 - Return null when user has no allowed role', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    })

    const result = await ensureEventRole('u1', 'e1', ['HoOC'])

    expect(result).toBeNull()
  })

  test('[Abnormal] TC03 - Return null when DB throws error', async () => {
    EventMember.findOne.mockImplementation(() => {
      throw new Error('DB error')
    })

    const result = await ensureEventRole('u1', 'e1', ['HoOC'])

    expect(result).toBeNull()
  })

  test('[Normal] TC04 - Use default roles when not provided', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'm2', role: 'member' })
    })

    const result = await ensureEventRole('u2', 'e2')

    expect(EventMember.findOne).toHaveBeenCalledWith({
      userId: 'u2',
      eventId: 'e2',
      role: { $in: ['HoOC', 'HoD', 'member'] },
    })
    expect(result).toEqual({ _id: 'm2', role: 'member' })
  })
})
