/**
 * Unit tests cho các controller: signup, login, loginWithGoogle, logout, logoutAll
 */

import { vi, beforeEach, describe, test, expect } from 'vitest'

// Mock modules
vi.mock('../../models/user.js', () => ({
	default: {
		findOne: vi.fn(),
		findById: vi.fn(),
		findByIdAndUpdate: vi.fn(),
		create: vi.fn()
	}
}))

vi.mock('../../models/authToken.js', () => {
	const mockAuthToken = vi.fn(function AuthToken(doc) { 
		return { ...doc, save: vi.fn().mockResolvedValue(undefined) } 
	})
	mockAuthToken.findOne = vi.fn()
	mockAuthToken.updateMany = vi.fn()
	return {
		default: mockAuthToken
	}
})

vi.mock('bcrypt', () => ({
	default: {
		genSalt: vi.fn().mockResolvedValue('salt'),
		hash: vi.fn().mockResolvedValue('hashed'),
		compare: vi.fn()
	}
}))

vi.mock('jsonwebtoken', () => ({
	default: {
		sign: vi.fn(),
		decode: vi.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 3600 }))
	}
}))

vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn().mockImplementation(() => ({
		verifyIdToken: vi.fn()
	}))
}))

vi.mock('../../mailer.js', () => ({
	sendMail: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../../config/environment.js', () => ({
	config: {
		JWT_SECRET: 'secret',
		JWT_EXPIRE: '1h',
		JWT_REFRESH_SECRET: 'refreshSecret',
		JWT_REFRESH_EXPIRE: '7d',
		GOOGLE_CLIENT_ID: 'gid',
		GOOGLE_CLIENT_SECRET: 'gsecret',
		GOOGLE_REDIRECT_URI: 'http://localhost',
		BCRYPT_SALT_ROUNDS: 10
	}
}))

// Import after mocking
import * as authControllerModule from '../authController.js'
import User from '../../models/user.js'
import AuthToken from '../../models/authToken.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { sendMail } from '../../mailer.js'

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
	test('email đã tồn tại -> 400', async () => {
		User.findOne.mockResolvedValueOnce({ _id: 'u1' })
		const req = { body: { email: 'a@x.com', password: 'p', fullName: 'A' } }
		const res = mockRes()
		await authControllerModule.signup(req, res)
		expect(User.findOne).toHaveBeenCalledWith({ email: 'a@x.com' })
		expect(res.status).toHaveBeenCalledWith(400)
	})

	test('phone đã tồn tại -> 400', async () => {
		User.findOne
			.mockResolvedValueOnce(null) // email ok
			.mockResolvedValueOnce({ _id: 'u2' }) // phone trùng
		const req = { body: { email: 'b@x.com', password: 'p', fullName: 'B', phone: '0123' } }
		const res = mockRes()
		await authControllerModule.signup(req, res)
		expect(User.findOne).toHaveBeenNthCalledWith(2, { phone: '0123' })
		expect(res.status).toHaveBeenCalledWith(400)
	})

	test('thành công -> 200, gửi email xác minh', async () => {
		User.findOne.mockResolvedValue(null)
		const req = { body: { email: 'c@x.com', password: 'p', fullName: 'C' }, get: () => 'ua', ip: '127.0.0.1' }
		const res = mockRes()
		await authControllerModule.signup(req, res)
		expect(bcrypt.genSalt).toHaveBeenCalled()
		expect(bcrypt.hash).toHaveBeenCalled()
		expect(sendMail).toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
	})
})

describe('authController - login', () => {
	test('không tìm thấy user -> 404', async () => {
		User.findOne.mockResolvedValue(null)
		const req = { body: { email: 'x@x.com', password: 'p' } }
		const res = mockRes()
		await authControllerModule.login(req, res)
		expect(res.status).toHaveBeenCalledWith(404)
	})

	test('mật khẩu sai -> 400', async () => {
		User.findOne.mockResolvedValue({ passwordHash: 'h', verified: true, status: 'active' })
		bcrypt.compare.mockResolvedValue(false)
		const req = { body: { email: 'x@x.com', password: 'bad' } }
		const res = mockRes()
		await authControllerModule.login(req, res)
		expect(res.status).toHaveBeenCalledWith(400)
	})

	test('chưa xác minh -> 403', async () => {
		User.findOne.mockResolvedValue({ passwordHash: 'h', verified: false, status: 'pending' })
		bcrypt.compare.mockResolvedValue(true)
		const req = { body: { email: 'x@x.com', password: 'p' } }
		const res = mockRes()
		await authControllerModule.login(req, res)
		expect(res.status).toHaveBeenCalledWith(403)
	})

	test('thành công -> trả tokens, lưu refresh token', async () => {
		User.findOne.mockResolvedValue({ _id: 'u1', email: 'x@x.com', passwordHash: 'h', verified: true, status: 'active', role: 'user' })
		bcrypt.compare.mockResolvedValue(true)
		jwt.sign
			.mockImplementationOnce(() => 'accessToken')
			.mockImplementationOnce(() => 'refreshToken')
		const req = { body: { email: 'x@x.com', password: 'p' }, get: () => 'ua', ip: '127.0.0.1', connection: {} }
		const res = mockRes()
		await authControllerModule.login(req, res)
		expect(jwt.sign).toHaveBeenCalled()
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tokens: { accessToken: 'accessToken', refreshToken: 'refreshToken' } }))
	})
})

describe('authController - loginWithGoogle', () => {
	test('thiếu credential -> 400', async () => {
		const req = { body: {}, cookies: {} }
		const res = mockRes()
		await authControllerModule.loginWithGoogle(req, res)
		expect(res.status).toHaveBeenCalledWith(400)
	})

	test('token hợp lệ, tạo user mới -> 200', async () => {
		const verifyIdToken = vi.fn().mockResolvedValue({ getPayload: () => ({ sub: 'gid', email: 'g@x.com', email_verified: true, name: 'G', picture: 'p', iss: 'accounts.google.com' }) })
		OAuth2Client.mockImplementation(() => ({ verifyIdToken }))
		User.findOne.mockResolvedValue(null)
		User.create.mockResolvedValue({ _id: 'u2', email: 'g@x.com', fullName: 'G', role: 'user' })
		jwt.sign
			.mockImplementationOnce(() => 'at')
			.mockImplementationOnce(() => 'rt')
		const req = { body: { credential: 'idtoken', g_csrf_token: 'c' }, cookies: { g_csrf_token: 'c' }, get: () => 'ua', headers: {}, ip: '127.0.0.1' }
		const res = mockRes()
		await authControllerModule.loginWithGoogle(req, res)
		expect(User.create).toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'at', refreshToken: 'rt' }))
	})
})

describe('authController - logout', () => {
	test('thiếu refreshToken -> 400', async () => {
		const req = { body: {} }
		const res = mockRes()
		await authControllerModule.logout(req, res)
		expect(res.status).toHaveBeenCalledWith(400)
	})

	test('đánh dấu revoke token -> 200', async () => {
		const save = vi.fn().mockResolvedValue(undefined)
		AuthToken.findOne.mockResolvedValue({ revoked: false, save })
		const req = { body: { refreshToken: 'rt' } }
		const res = mockRes()
		await authControllerModule.logout(req, res)
		expect(AuthToken.findOne).toHaveBeenCalledWith({ token: 'rt' })
		expect(save).toHaveBeenCalled()
		expect(res.status).toHaveBeenCalledWith(200)
	})
})

describe('authController - logoutAll', () => {
	test('revoked tất cả token của user -> 200', async () => {
		AuthToken.updateMany.mockResolvedValue({ acknowledged: true })
		const req = { user: { id: 'u1' } }
		const res = mockRes()
		await authControllerModule.logoutAll(req, res)
		expect(AuthToken.updateMany).toHaveBeenCalledWith({ userId: 'u1', revoked: false }, { revoked: true })
		expect(res.status).toHaveBeenCalledWith(200)
	})
})