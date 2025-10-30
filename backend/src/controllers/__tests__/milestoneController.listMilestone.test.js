/**
 * Unit tests for controller: listMilestones
 * Focus: business logic only.
 */

import { vi, beforeEach, describe, test, expect } from 'vitest'

// ==== Mock dependencies ====
vi.mock('../../models/milestone.js', () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../../models/event.js', () => ({
  default: {
    exists: vi.fn(),
  },
}))

// ==== Import after mocks ====
import * as milestoneController from '../milestoneController.js'
import Milestone from '../../models/milestone.js'
import Event from '../../models/event.js'

// ==== Mock Express res ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('milestoneController - listMilestones', () => {
  // TC01 - Event not found
  test('TC01 - Event not found -> 404', async () => {
    Event.exists.mockResolvedValue(false)
    const req = { params: { eventId: 'e1' }, query: {} }
    const res = mockRes()

    await milestoneController.listMilestones(req, res)

    expect(Event.exists).toHaveBeenCalledWith({ _id: 'e1' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' })
  })

  // TC02 - Success (no filter)
  test('TC02 - Success without filter -> 200', async () => {
    Event.exists.mockResolvedValue(true)
    const fakeItems = [
      { _id: 'm1', name: 'MS1' },
      { _id: 'm2', name: 'MS2' },
    ]
    Milestone.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeItems),
    })
    Milestone.countDocuments.mockResolvedValue(2)

    const req = { params: { eventId: 'e1' }, query: {} }
    const res = mockRes()

    await milestoneController.listMilestones(req, res)

    expect(Event.exists).toHaveBeenCalledWith({ _id: 'e1' })
    expect(Milestone.find).toHaveBeenCalledWith({ eventId: 'e1', isDeleted: false })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: fakeItems,
      pagination: expect.objectContaining({ total: 2 }),
    }))
  })

  // TC03 - With status filter and sortBy custom
  test('TC03 - Filter by status, custom sort -> 200', async () => {
    Event.exists.mockResolvedValue(true)
    Milestone.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    })
    Milestone.countDocuments.mockResolvedValue(0)

    const req = {
      params: { eventId: 'e1' },
      query: { status: 'done', sortBy: 'targetDate', sortDir: 'desc' },
    }
    const res = mockRes()

    await milestoneController.listMilestones(req, res)

    expect(Milestone.find).toHaveBeenCalledWith({
      eventId: 'e1',
      isDeleted: false,
      status: 'done',
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })

})
