import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import app from '../app.js';
import { config } from '../config/environment.js';
import Event from '../models/event.js';
import User from '../models/user.js';
import Department from '../models/department.js';
import EventMember from '../models/eventMember.js';

// Helper to sign JWT like authenticateToken expects
const signToken = (userId) => jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '1h' });

describe('Department management APIs', () => {
	let mongo;
	let event;
	let hod;
	let hooc;
	let staff;
	let depA;

	beforeAll(async () => {
		mongo = await MongoMemoryServer.create();
		await mongoose.connect(mongo.getUri());

		// Seed users
		hooc = await User.create({
			email: 'hooc@example.com',
			passwordHash: 'x',
			fullName: 'Head of OC',
			phone: '0000000000',
			role: 'user'
		});
		hod = await User.create({
			email: 'hod@example.com',
			passwordHash: 'x',
			fullName: 'Head of Department',
			phone: '0000000001',
			role: 'user'
		});
		staff = await User.create({
			email: 'staff@example.com',
			passwordHash: 'x',
			fullName: 'Staff Member',
			phone: '0000000002',
			role: 'user'
		});

		// Event
		event = await Event.create({
			name: 'Test Event',
			type: 'public',
			description: 'E2E',
			eventDate: new Date(),
			location: 'HN',
			organizerName: hooc._id,
			status: 'scheduled'
		});

		// Memberships
		await EventMember.create({ eventId: event._id, userId: hooc._id, role: 'HooC' });

		// Department A
		depA = await Department.create({ eventId: event._id, name: 'Dept A', description: 'A' });
	});

	afterAll(async () => {
		await mongoose.disconnect();
		if (mongo) await mongo.stop();
	});

	it('HooC assigns HoD successfully', async () => {
		const token = signToken(hooc._id.toString());
		const res = await request(app)
			.patch(`/api/events/${event._id}/departments/${depA._id}/assign-hod`)
			.set('Authorization', `Bearer ${token}`)
			.send({ userId: hod._id.toString() })
			.expect(200);

		expect(res.body?.data?.leaderId?._id || res.body?.data?.leaderId).toBe(hod._id.toString());
		const membership = await EventMember.findOne({ eventId: event._id, userId: hod._id }).lean();
		expect(membership?.role).toBe('HoD');
		expect(membership?.departmentId?.toString()).toBe(depA._id.toString());
	});

	it('HoD of Dept A can add a staff to Dept A', async () => {
		const hodToken = signToken(hod._id.toString());
		const res = await request(app)
			.post(`/api/events/${event._id}/departments/${depA._id}/members`)
			.set('Authorization', `Bearer ${hodToken}`)
			.send({ userId: staff._id.toString() })
			.expect(200);

		expect(res.body?.data?.userId?._id || res.body?.data?.userId).toBe(staff._id.toString());
		expect(res.body?.data?.departmentId).toBe(depA._id.toString());
		expect(res.body?.data?.role).toBe('staff');
	});

	it('HoD cannot remove HoD without unassign', async () => {
		const hodToken = signToken(hod._id.toString());
		await request(app)
			.delete(`/api/events/${event._id}/departments/${depA._id}/members/${hod._id}`)
			.set('Authorization', `Bearer ${hodToken}`)
			.expect(409);
	});

	it('HoD removes staff from Dept A', async () => {
		const hodToken = signToken(hod._id.toString());
		await request(app)
			.delete(`/api/events/${event._id}/departments/${depA._id}/members/${staff._id}`)
			.set('Authorization', `Bearer ${hodToken}`)
			.expect(200);

		const membership = await EventMember.findOne({ eventId: event._id, userId: staff._id }).lean();
		expect(membership?.departmentId).toBeUndefined();
	});
});


