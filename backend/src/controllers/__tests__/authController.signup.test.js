/**
 * Unit tests cho controller: signup
 * Chỉ test logic nghiệp vụ, không test thư viện bên thứ ba.
 */

import { vi, beforeEach, describe, test, expect } from 'vitest'

// ==== Mock các module phụ thuộc ====
vi.mock('../../models/user.js', () => ({
	default: {
		findOne: vi.fn(),
	}
}))

vi.mock('bcrypt', () => ({
	default: {
		genSalt: vi.fn().mockResolvedValue('salt'),
		hash: vi.fn().mockResolvedValue('hashed'),
	}
}))

vi.mock('../../mailer.js', () => ({
	sendMail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../config/environment.js', () => ({
	config: {
		BCRYPT_SALT_ROUNDS: 10
	}
}))

// ==== Import sau khi mock ====
import * as authControllerModule from '../authController.js'
import User from '../../models/user.js'
import bcrypt from 'bcrypt'
import { sendMail } from '../../mailer.js'

// ==== Hàm mock response ====
function mockRes() {
	const res = {}
	res.status = vi.fn().mockReturnValue(res)
	res.json = vi.fn().mockReturnValue(res)
	return res
}

beforeEach(() => {
	vi.clearAllMocks()
})


describe('authController - signup', () => {

	test('TC01 - Email already exists -> 400', async () => {
		User.findOne.mockResolvedValueOnce({ _id: 'u1' })
		const req = { body: { email: 'a@x.com', password: 'p', fullName: 'A', phone: '0123' } }
		const res = mockRes()

		await authControllerModule.signup(req, res)

		expect(User.findOne).toHaveBeenCalledWith({ email: 'a@x.com' })
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Email already exists!'
		}))
	})

	// STC02 - Phone đã tồn tại
	test('TC02 - Phone number already exists -> 400', async () => {
		User.findOne
			.mockResolvedValueOnce(null) // email ok
			.mockResolvedValueOnce({ _id: 'u2' }) // phone trùng

		const req = { body: { email: 'b@x.com', password: 'p', fullName: 'A', phone: '01234' } }
		const res = mockRes()

		await authControllerModule.signup(req, res)

		expect(User.findOne).toHaveBeenNthCalledWith(2, { phone: '01234' })
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Phone number already exists!'
		}))
	})

	test('TC03 - Success -> 200', async () => {
		User.findOne.mockResolvedValue(null)
		const req = { body: { email: 'b@x.com', password: 'p', fullName: 'A', phone: '0123' }, get: () => 'ua', ip: '127.0.0.1' }
		const res = mockRes()

		await authControllerModule.signup(req, res)

		expect(User.findOne).toHaveBeenCalledWith({ email: 'b@x.com' })
		expect(bcrypt.genSalt).toHaveBeenCalled()
		expect(bcrypt.hash).toHaveBeenCalledWith('p', 'salt')
		expect(sendMail).toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			message: expect.stringMatching(/verify your email/i)
		}))
	})

	test('TC04 - Missing email || password || fullName || phone -> 400', async () => {
		const res = mockRes()

		const req1 = { body: { password: 'p', fullName: 'A', phone: '0123' } }
		await authControllerModule.signup(req1, res)
		expect(res.status).toHaveBeenCalledWith(400)

		vi.clearAllMocks()

		const req2 = { body: { email: 'b@p.com', fullName: 'A', phone: '0123' } }
		await authControllerModule.signup(req2, res)
		expect(res.status).toHaveBeenCalledWith(400)
		vi.clearAllMocks()
		const req3 = { body: { email: 'b@p.com', password: 'p', phone: '0123' } }
		await authControllerModule.signup(req3, res)
		expect(res.status).toHaveBeenCalledWith(400)
		vi.clearAllMocks()
		const req4 = { body: { email: 'b@p.com', password: 'p', fullName: 'A' } }
		await authControllerModule.signup(req4, res)
		expect(res.status).toHaveBeenCalledWith(400)
		const req5 = { body: { } }
		vi.clearAllMocks()
		await authControllerModule.signup(req5, res)
		expect(res.status).toHaveBeenCalledWith(400)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Missing required fields!'
		}))
	})


	test('TC05 - SMTP error -> 500', async () => {
		User.findOne.mockResolvedValue(null)
		sendMail.mockRejectedValueOnce(new Error('smtp error'))
		const req = { body: { email: 'b@x.com', password: 'p', fullName: 'A', phone: '0123' } }
		const res = mockRes()

		await authControllerModule.signup(req, res)

		expect(sendMail).toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(500)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Failed to signup!'
		}))
	})

})
