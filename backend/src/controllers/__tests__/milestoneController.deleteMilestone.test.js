import { vi, describe, test, expect, beforeEach } from 'vitest'

// ==== Mock dependencies ====
vi.mock('../../models/EventMember.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../models/Milestone.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../models/Task.js', () => ({
  default: { find: vi.fn() },
}))

import * as milestoneController from '../milestoneController.js'
import EventMember from '../../models/eventMember.js'
import Milestone from '../../models/milestone.js'
import Task from '../../models/task.js'

// ==== Helper for mock response ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ==== TEST CASES ====
describe('milestoneController - deleteMilestone', () => {

  test('[Abnormal] TC01 - User not HoOC -> 403', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'member' })
    })
    const req = { params: { eventId: 'e1', milestoneId: 'm1' }, user: { id: 'u1' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Only HoOC can delete milestone' })
  })

  test('[Abnormal] TC02 - No membership found -> 403', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    })
    const req = { params: { eventId: 'e2', milestoneId: 'm2' }, user: { id: 'u2' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Only HoOC can delete milestone' })
  })

  test('[Abnormal] TC03 - Milestone not found -> 404', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'HoOC' })
    })
    Milestone.findOne.mockResolvedValue(null)
    const req = { params: { eventId: 'e3', milestoneId: 'm3' }, user: { id: 'u3' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(Milestone.findOne).toHaveBeenCalledWith({ _id: 'm3', eventId: 'e3' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone not found' })
  })

  test('[Abnormal] TC04 - Milestone has tasks -> 400', async () => {
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'HoOC' })
    })
    Milestone.findOne.mockResolvedValue({ _id: 'm4', eventId: 'e4', save: vi.fn() })
    Task.find.mockResolvedValue([{ _id: 't1' }])

    const req = { params: { eventId: 'e4', milestoneId: 'm4' }, user: { id: 'u4' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(Task.find).toHaveBeenCalledWith({ milestoneId: 'm4' })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone has tasks' })
  })

  test('[Normal] TC05 - Delete success -> 200', async () => {
    const mockMilestone = { isDeleted: false, save: vi.fn().mockResolvedValue() }
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'HoOC' })
    })
    Milestone.findOne.mockResolvedValue(mockMilestone)
    Task.find.mockResolvedValue([])

    const req = { params: { eventId: 'e5', milestoneId: 'm5' }, user: { id: 'u5' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(mockMilestone.isDeleted).toBe(true)
    expect(mockMilestone.save).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ message: 'Milestone deleted' })
  })

  test('[Abnormal] TC06 - Internal error -> 500', async () => {
    EventMember.findOne.mockImplementation(() => { throw new Error('DB crash') })
    const req = { params: { eventId: 'e6', milestoneId: 'm6' }, user: { id: 'u6' } }
    const res = mockRes()

    await milestoneController.deleteMilestone(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete milestone' })
  })
})
