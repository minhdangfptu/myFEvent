import { vi, describe, test, expect, beforeEach } from 'vitest'

// ==== Mocks ====
vi.mock('../../models/Department.js', () => ({
  default: { find: vi.fn(), countDocuments: vi.fn() },
}))
vi.mock('../../models/EventMember.js', () => ({
  default: { countDocuments: vi.fn() },
}))

import * as departmentController from '../departmentController.js'
import Department from '../../models/department.js'
import EventMember from '../../models/eventMember.js'

// ==== Mock response helper ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => vi.clearAllMocks())

// ==== TESTS ====
describe('departmentController - listDepartmentsByEvent', () => {
  test('[Abnormal] TC01 - DB error -> 500', async () => {
    Department.find.mockImplementation(() => {
      throw new Error('DB crash')
    })

    const req = {
      params: { eventId: 'e1' },
      query: {},
    }
    const res = mockRes()

    await departmentController.listDepartmentsByEvent(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to load departments' })
  })

  test('[Normal] TC02 - Success with no search, empty list -> 200', async () => {
    const mockFind = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    Department.find.mockReturnValue(mockFind)
    Department.countDocuments.mockResolvedValue(0)

    const req = {
      params: { eventId: 'e2' },
      query: { page: '1', limit: '10' },
    }
    const res = mockRes()

    await departmentController.listDepartmentsByEvent(req, res)

    expect(Department.find).toHaveBeenCalledWith({ eventId: 'e2' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    })
  })

  test('[Normal] TC03 - Success with search keyword -> 200', async () => {
    const mockDepartments = [
      {
        _id: 'd1',
        name: 'Tech',
        description: 'IT team',
        leaderId: { fullName: 'John Doe', email: 'john@example.com' },
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
    ]
    const mockFind = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockDepartments),
    }

    Department.find.mockReturnValue(mockFind)
    Department.countDocuments.mockResolvedValue(1)
    EventMember.countDocuments.mockResolvedValue(5)

    const req = {
      params: { eventId: 'e3' },
      query: { page: '1', limit: '5', search: 'Tech' },
    }
    const res = mockRes()

    await departmentController.listDepartmentsByEvent(req, res)

    expect(Department.find).toHaveBeenCalledWith({
      eventId: 'e3',
      $or: [
        { name: { $regex: 'Tech', $options: 'i' } },
        { description: { $regex: 'Tech', $options: 'i' } },
      ],
    })
    expect(EventMember.countDocuments).toHaveBeenCalledWith({
      departmentId: 'd1',
      role: { $ne: 'HoOC' },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: 'Tech',
          leaderName: 'John Doe',
          memberCount: 5,
        }),
      ],
      pagination: expect.objectContaining({ total: 1 }),
    })
  })

  test('[Abnormal] TC04 - Invalid query params -> still success (default pagination)', async () => {
    const mockFind = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    Department.find.mockReturnValue(mockFind)
    Department.countDocuments.mockResolvedValue(0)

    const req = {
      params: { eventId: 'e4' },
      query: { page: '-5', limit: '9999' },
    }
    const res = mockRes()

    await departmentController.listDepartmentsByEvent(req, res)

    expect(Department.find).toHaveBeenCalledWith({ eventId: 'e4' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      data: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    })
  })
})
