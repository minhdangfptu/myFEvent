import { vi, beforeEach, describe, test, expect } from 'vitest'

vi.mock('../../models/milestone.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../models/task.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}))

import * as milestoneController from '../milestoneController.js'
import Milestone from '../../models/milestone.js'
import Task from '../../models/task.js'
import ensureEventRole from '../../utils/ensureEventRole.js'

function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('milestoneController - getMilestoneDetail', () => {
  test('[Abnormal] TC01 - No permission -> 403', async () => {
    ensureEventRole.mockResolvedValue(null)
    const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' } }
    const res = mockRes()

    await milestoneController.getMilestoneDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Can not view milestone detail!' })
  })

  test('[Abnormal] TC02 - Milestone not found -> 404', async () => {
    ensureEventRole.mockResolvedValue(true)
    Milestone.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    })

    const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' } }
    const res = mockRes()

    await milestoneController.getMilestoneDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone not found' })
  })

  test('[Normal] TC03 - Success -> 200', async () => {
    ensureEventRole.mockResolvedValue(true)
    Milestone.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'm1',
        eventId: 'e1',
        name: 'MS1',
        targetDate: '2025-11-01',
        status: 'done',
        description: 'desc',
      })
    })
    Task.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: 't1', name: 'Task1', status: 'open' },
        { _id: 't2', name: 'Task2', status: 'done' },
      ])
    })

    const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' } }
    const res = mockRes()

    await milestoneController.getMilestoneDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'MS1', status: 'done' }),
    }))
  })

  test('[Abnormal] TC04 - Internal error -> 500', async () => {
    ensureEventRole.mockRejectedValue(new Error('DB error'))
    const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' } }
    const res = mockRes()

    await milestoneController.getMilestoneDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to get milestone detail' })
  })
})
