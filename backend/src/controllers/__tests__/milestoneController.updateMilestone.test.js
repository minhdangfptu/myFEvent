

import { vi, beforeEach, describe, test, expect } from 'vitest'

vi.mock('../../models/eventMember.js', () => ({
    default: { findOne: vi.fn() },
}))
vi.mock('../../models/milestone.js', () => ({
    default: { findOneAndUpdate: vi.fn() },
}))

import * as milestoneController from '../milestoneController.js'
import EventMember from '../../models/eventMember.js'
import Milestone from '../../models/milestone.js'

function mockRes() {
    const res = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    return res
}

beforeEach(() => vi.clearAllMocks())

describe('milestoneController - updateMilestone', () => {
    test('[Abnormal] TC01 - User not HoOC -> 403', async () => {
        EventMember.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ role: 'member' })
        })
        const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' }, body: { name: 'New' } }
        const res = mockRes()

        await milestoneController.updateMilestone(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith({ message: 'Only HoOC can update milestone' })
    })

    test('[Abnormal] TC02 - No membership found -> 403', async () => {
        EventMember.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ role: null})
        })
        const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' }, body: {} }
        const res = mockRes()

        await milestoneController.updateMilestone(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res.json).toHaveBeenCalledWith({ message: 'Only HoOC can update milestone' })
    })

    test('[Abnormal] TC03 - Milestone not found -> 404', async () => {
        EventMember.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ role: 'HoOC' })
        })
        Milestone.findOneAndUpdate.mockResolvedValue(null)
        const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' }, body: { name: 'N' } }
        const res = mockRes()

        await milestoneController.updateMilestone(req, res)

        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ message: 'Milestone not found' })
    })

    test('[Normal] TC04 - Update success -> 200', async () => {
        EventMember.findOne.mockReturnValue({
            lean: vi.fn().mockResolvedValue({ role: 'HoOC' })
        })
        Milestone.findOneAndUpdate.mockResolvedValue({ _id: 'm1', name: 'Updated', status: 'done' })
        const req = { user: { id: 'u1' }, params: { eventId: 'e1', milestoneId: 'm1' }, body: { name: 'Updated' } }
        const res = mockRes()

        await milestoneController.updateMilestone(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Updated' }),
        }))
    })

})
