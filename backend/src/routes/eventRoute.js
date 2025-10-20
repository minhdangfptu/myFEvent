import express from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import Event from '../models/event.js'
import EventMember from '../models/eventMember.js'
import crypto from 'crypto'

const router = express.Router()

// Create event (HoOC only)
router.post('/', authenticateToken, requireRole('HoOC'), async (req, res) => {
  try {
    const { name, description, eventDate, location, type = 'private' } = req.body
    if (!name) return res.status(400).json({ message: 'Name is required' })
    const date = eventDate ? new Date(eventDate) : new Date()

    // Generate unique join code
    let joinCode
    for (let i = 0; i < 5; i++) {
      const candidate = crypto.randomBytes(3).toString('hex') // 6 hex chars
      const exists = await Event.findOne({ joinCode: candidate })
      if (!exists) { joinCode = candidate; break }
    }
    if (!joinCode) return res.status(500).json({ message: 'Failed to generate join code' })

    const event = await Event.create({
      name,
      description: description || '',
      eventDate: date,
      location: location || '',
      type,
      organizerName: req.user.id,
      joinCode,
    })

    // Creator becomes HoOC
    await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'HoOC' })

    return res.status(201).json({ message: 'Event created', data: { id: event._id, joinCode } })
  } catch (err) {
    console.error('Create event error:', err)
    return res.status(500).json({ message: 'Failed to create event' })
  }
})

// Join by code
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ message: 'Code is required' })

    const event = await Event.findOne({ joinCode: code })
    if (!event) return res.status(404).json({ message: 'Invalid code' })

    const exists = await EventMember.findOne({ eventId: event._id, userId: req.user.id })
    if (!exists) {
      await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'staff' })
    }

    return res.status(200).json({ message: 'Joined event', data: { eventId: event._id } })
  } catch (err) {
    console.error('Join event error:', err)
    return res.status(500).json({ message: 'Failed to join event' })
  }
})

// Get event info (summary)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean()
    if (!event) return res.status(404).json({ message: 'Event not found' })

    const members = await EventMember.find({ eventId: event._id }).populate('userId', 'fullName email').lean()
    return res.status(200).json({ data: { event, members } })
  } catch (err) {
    console.error('Get event error:', err)
    return res.status(500).json({ message: 'Failed to get event' })
  }
})

// Get events joined by current user
router.get('/me/list', authenticateToken, async (req, res) => {
  try {
    const memberships = await EventMember.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean()

    const eventIds = memberships.map(m => m.eventId)
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventDate joinCode')
      .lean()

    return res.status(200).json({ data: events })
  } catch (err) {
    console.error('List my events error:', err)
    return res.status(500).json({ message: 'Failed to list events' })
  }
})

export default router


