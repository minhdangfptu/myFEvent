/**
 * Unit tests for controller: createMilestone
 * Focus: business logic only, mock all DB and helper dependencies.
 */

import { vi, beforeEach, describe, test, expect } from 'vitest'

// ==== Mock dependencies ====
vi.mock('../../models/milestone.js', () => ({
  default: { create: vi.fn() }
}))

vi.mock('../../models/event.js', () => ({
  default: { exists: vi.fn() }
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

describe('milestoneController - createMilestone', () => {
  // TC01 - Event not found
  test('TC01 - Event does not exist -> 404', async () => {
    Event.exists.mockResolvedValue(false)
    const req = {
      params: { eventId: 'e1' },
      body: { name: 'Test', description: 'Desc', targetDate: '2025-10-01', status: 'upcoming' }
    }
    const res = mockRes()

    await milestoneController.createMilestone(req, res)

    expect(Event.exists).toHaveBeenCalledWith({ _id: 'e1' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' })
  })

  // TC02 - Successfully created
  test('TC02 - Success -> 201', async () => {
    Event.exists.mockResolvedValue(true)
    Milestone.create.mockResolvedValue({
      _id: 'm1',
      eventId: 'e1',
      name: 'Test',
      description: 'Desc',
      targetDate: '2025-10-01',
      status: 'upcoming'
    })

    const req = {
      params: { eventId: 'e1' },
      body: { name: 'Test', description: 'Desc', targetDate: '2025-10-01', status: 'upcoming' }
    }
    const res = mockRes()

    await milestoneController.createMilestone(req, res)

    expect(Event.exists).toHaveBeenCalledWith({ _id: 'e1' })
    expect(Milestone.create).toHaveBeenCalledWith({
      eventId: 'e1',
      name: 'Test',
      description: 'Desc',
      targetDate: '2025-10-01',
      status: 'upcoming'
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ _id: 'm1', name: 'Test' })
    }))
  })

  // TC03 - Missing name or invalid input
  test('TC03 - Missing name field -> 500', async () => {
    Event.exists.mockResolvedValue(true)
    Milestone.create.mockRejectedValue(new Error('ValidationError: name required'))

    const req = {
      params: { eventId: 'e1' },
      body: { description: 'No name', targetDate: '2025-10-01', status: 'pending' }
    }
    const res = mockRes()

    await milestoneController.createMilestone(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to create milestone' })
  })
  
})
