import { vi, describe, test, expect, beforeEach } from 'vitest'

// ==== Mock models ====
vi.mock('../../models/Department.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../models/EventMember.js', () => ({
  default: { countDocuments: vi.fn() },
}))

import * as departmentController from '../departmentController.js'
import Department from '../../models/department.js'
import EventMember from '../../models/eventMember.js'

// ==== Mock res ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// ==== Shared input (giống “user đúng, pass sai”) ====
const baseReq = {
  params: { departmentId: 'dep123' },
  user: { id: 'u123' },
}

const baseDepartment = {
  _id: 'dep123',
  name: 'Truyền thông',
  description: 'Phụ trách truyền thông sự kiện',
  leaderId: { fullName: 'Nguyễn Văn A', email: 'a@example.com' },
  createdAt: '2024-10-01T00:00:00Z',
  updatedAt: '2024-10-10T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

// ==== TEST CASES ====
describe('departmentController - getDepartmentDetail', () => {
  test('[Abnormal] TC01 - Department not found -> 404', async () => {
    Department.findOne.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    })

    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.getDepartmentDetail(req, res)

    expect(Department.findOne).toHaveBeenCalledWith({ _id: 'dep123' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Department not found' })
  })

  test('[Normal] TC02 - Success -> 200', async () => {
    Department.findOne.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(baseDepartment),
    })
    EventMember.countDocuments.mockResolvedValue(5)

    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.getDepartmentDetail(req, res)

    expect(EventMember.countDocuments).toHaveBeenCalledWith({
      departmentId: 'dep123',
      role: { $ne: 'HoOC' },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Truyền thông',
        leaderName: 'Nguyễn Văn A',
        memberCount: 5,
      }),
    })
  })

  test('[Abnormal] TC03 - Internal error -> 500', async () => {
    Department.findOne.mockImplementation(() => {
      throw new Error('DB exploded')
    })

    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.getDepartmentDetail(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to get department detail',
    })
  })
})
