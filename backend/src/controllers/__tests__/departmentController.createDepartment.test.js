import { vi, describe, test, expect, beforeEach } from 'vitest'

// ==== MOCKS ====
vi.mock('../../models/Department.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}))
vi.mock('../../models/Event.js', () => ({
  default: { exists: vi.fn() },
}))
vi.mock('../../models/EventMember.js', () => ({
  default: { findOne: vi.fn() },
}))
vi.mock('../../utils/ensureEventRole.js', () => ({
  default: vi.fn(),
}))

import * as departmentController from '../departmentController.js'
import Department from '../../models/department.js'
import Event from '../../models/event.js'
import EventMember from '../../models/eventMember.js'

// ==== MOCK RES ====
function mockRes() {
  const res = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

// ==== SHARED INPUTS ====
const baseReq = {
  params: { eventId: 'evt001' },
  user: { id: 'u001' },
  body: {
    name: 'Ban Hậu Cần',
    description: 'Phụ trách chuẩn bị cơ sở vật chất',
    leaderId: 'leader001',
  },
}

const baseDepartment = {
  _id: 'dep001',
  name: 'Ban Hậu Cần',
  description: 'Phụ trách chuẩn bị cơ sở vật chất',
  leaderId: { fullName: 'Nguyễn Văn B', email: 'b@example.com' },
  createdAt: '2024-10-01',
  updatedAt: '2024-10-02',
}

// ==== BEFORE EACH ====
beforeEach(() => vi.clearAllMocks())

// ==== TESTS ====
describe('departmentController - createDepartment', () => {
  test('[Abnormal] TC01 - Event not found -> 404', async () => {
    Event.exists.mockResolvedValue(false)
    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.createDepartment(req, res)

    expect(Event.exists).toHaveBeenCalledWith({ _id: 'evt001' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Event không tồn tại' })
  })

  test('[Abnormal] TC02 - User not HoOC -> 403', async () => {
    Event.exists.mockResolvedValue(true)
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'Member' }),
    })

    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.createDepartment(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ HooC mới được tạo Department' })
  })

  test('[Normal] TC03 - Success create -> 201', async () => {
    Event.exists.mockResolvedValue(true)
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'HoOC' }),
    })

    Department.create.mockResolvedValue({ _id: 'dep001' })
    Department.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(baseDepartment),
    })

    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.createDepartment(req, res)

    expect(Department.create).toHaveBeenCalledWith({
      eventId: 'evt001',
      name: 'Ban Hậu Cần',
      description: 'Phụ trách chuẩn bị cơ sở vật chất',
      leaderId: 'leader001',
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Ban Hậu Cần',
        leaderName: 'Nguyễn Văn B',
        memberCount: 0,
      }),
    })
  })

  test('[Abnormal] TC04 - Missing body fields -> vẫn tạo nhưng leader null', async () => {
    Event.exists.mockResolvedValue(true)
    EventMember.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ role: 'HoOC' }),
    })
    Department.create.mockResolvedValue({ _id: 'dep002' })
    Department.findById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        ...baseDepartment,
        leaderId: null,
        name: 'Không tên',
      }),
    })

    const req = {
      ...baseReq,
      body: { name: 'Không tên' }, // thiếu desc và leaderId
    }
    const res = mockRes()

    await departmentController.createDepartment(req, res)

    expect(Department.create).toHaveBeenCalledWith({
      eventId: 'evt001',
      name: 'Không tên',
      description: undefined,
      leaderId: undefined,
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Không tên',
        leaderName: 'Chưa có',
      }),
    })
  })

  test('[Abnormal] TC05 - Internal error -> 500', async () => {
    Event.exists.mockRejectedValue(new Error('DB failure'))
    const req = { ...baseReq }
    const res = mockRes()

    await departmentController.createDepartment(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tạo department thất bại',
    })
  })
})
